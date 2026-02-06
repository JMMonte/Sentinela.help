"use client";

import { useEffect, useRef, useMemo, useCallback } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import { type GfsGridData, type ColorStop } from "@/lib/overlays/gfs-utils";

export type GfsGridOverlayProps = {
  data: GfsGridData;
  colorScale: ColorStop[];
  opacity?: number;
};

// Web Mercator constants
const MAX_LAT = 85.051129;
const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

// Performance: cap canvas size to prevent freezing
const MAX_CANVAS_WIDTH = 1440;
const MAX_CANVAS_HEIGHT = 720;

// Pre-compute color lookup table size
const LUT_SIZE = 256;

type RgbaColor = { r: number; g: number; b: number; a: number };

function parseColorOnce(color: string): RgbaColor {
  if (color.startsWith("rgba")) {
    const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+),?\s*([\d.]+)?\)/);
    if (match) {
      return {
        r: parseInt(match[1]),
        g: parseInt(match[2]),
        b: parseInt(match[3]),
        a: match[4] ? parseFloat(match[4]) : 1,
      };
    }
  }
  if (color.startsWith("rgb")) {
    const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (match) {
      return {
        r: parseInt(match[1]),
        g: parseInt(match[2]),
        b: parseInt(match[3]),
        a: 1,
      };
    }
  }
  const hex = color.replace("#", "");
  return {
    r: parseInt(hex.substring(0, 2), 16),
    g: parseInt(hex.substring(2, 4), 16),
    b: parseInt(hex.substring(4, 6), 16),
    a: 1,
  };
}

function buildColorLut(colorScale: ColorStop[]): Uint8ClampedArray {
  const lut = new Uint8ClampedArray(LUT_SIZE * 4);
  const minVal = colorScale[0].value;
  const maxVal = colorScale[colorScale.length - 1].value;
  const range = maxVal - minVal;

  const parsedColors = colorScale.map((stop) => ({
    value: stop.value,
    color: parseColorOnce(stop.color),
  }));

  for (let i = 0; i < LUT_SIZE; i++) {
    const value = minVal + (i / (LUT_SIZE - 1)) * range;

    let lower = parsedColors[0];
    let upper = parsedColors[parsedColors.length - 1];

    for (let j = 0; j < parsedColors.length - 1; j++) {
      if (value >= parsedColors[j].value && value <= parsedColors[j + 1].value) {
        lower = parsedColors[j];
        upper = parsedColors[j + 1];
        break;
      }
    }

    const t =
      upper.value === lower.value
        ? 0
        : (value - lower.value) / (upper.value - lower.value);

    const idx = i * 4;
    lut[idx] = Math.round(lower.color.r + t * (upper.color.r - lower.color.r));
    lut[idx + 1] = Math.round(lower.color.g + t * (upper.color.g - lower.color.g));
    lut[idx + 2] = Math.round(lower.color.b + t * (upper.color.b - lower.color.b));
    lut[idx + 3] = Math.round(
      (lower.color.a + t * (upper.color.a - lower.color.a)) * 255
    );
  }

  return lut;
}

function latToMercY(lat: number): number {
  const latRad = Math.max(-MAX_LAT, Math.min(MAX_LAT, lat)) * DEG2RAD;
  return Math.log(Math.tan(Math.PI / 4 + latRad / 2));
}

function mercYToLat(y: number): number {
  return (2 * Math.atan(Math.exp(y)) - Math.PI / 2) * RAD2DEG;
}

/**
 * Renders a GFS grid as a canvas overlay on the Leaflet map.
 * Optimized with pre-computed color LUT, capped canvas size, and dynamic tiling.
 */
export function GfsGridOverlay({
  data,
  colorScale,
  opacity = 0.7,
}: GfsGridOverlayProps) {
  const map = useMap();
  const layersRef = useRef<Map<number, L.ImageOverlay>>(new Map());
  const imageUrlRef = useRef<string | null>(null);
  const boundsRef = useRef<{
    outWest: number;
    outEast: number;
    outNorth: number;
    outSouth: number;
    isGlobal: boolean;
  } | null>(null);

  // Pre-compute color lookup table
  const colorLut = useMemo(() => buildColorLut(colorScale), [colorScale]);

  const gridKey = useMemo(() => {
    const h = data.header;
    return `${h.lo1},${h.la1},${h.dx},${h.dy},${h.nx},${h.ny}`;
  }, [data.header]);

  const [minVal, maxVal] = useMemo(() => {
    return [colorScale[0].value, colorScale[colorScale.length - 1].value];
  }, [colorScale]);

  // Update visible world copies based on current map view
  const updateVisibleTiles = useCallback(() => {
    if (!map || !imageUrlRef.current || !boundsRef.current) return;

    const { outWest, outEast, outNorth, outSouth, isGlobal } = boundsRef.current;

    if (!isGlobal) {
      // Non-global grid: just one overlay at offset 0
      if (!layersRef.current.has(0)) {
        const bounds: L.LatLngBoundsExpression = [
          [outSouth, outWest],
          [outNorth, outEast],
        ];
        const overlay = L.imageOverlay(imageUrlRef.current, bounds, {
          opacity: 1,
          interactive: false,
        });
        overlay.addTo(map);
        layersRef.current.set(0, overlay);
      }
      return;
    }

    // For global grids: determine which world copies are visible
    const mapBounds = map.getBounds();
    const west = mapBounds.getWest();
    const east = mapBounds.getEast();

    // Calculate which world copies (offsets) are needed
    const startOffset = Math.floor((west + 180) / 360) - 1;
    const endOffset = Math.ceil((east + 180) / 360) + 1;

    const neededOffsets = new Set<number>();
    for (let i = startOffset; i <= endOffset; i++) {
      neededOffsets.add(i * 360);
    }

    // Remove overlays no longer needed
    for (const [offset, overlay] of layersRef.current) {
      if (!neededOffsets.has(offset)) {
        try {
          overlay.remove();
        } catch {
          // ignore
        }
        layersRef.current.delete(offset);
      }
    }

    // Add new overlays
    for (const offset of neededOffsets) {
      if (!layersRef.current.has(offset)) {
        const bounds: L.LatLngBoundsExpression = [
          [outSouth, outWest + offset],
          [outNorth, outEast + offset],
        ];
        const overlay = L.imageOverlay(imageUrlRef.current!, bounds, {
          opacity: 1,
          interactive: false,
        });
        overlay.addTo(map);
        layersRef.current.set(offset, overlay);
      }
    }
  }, [map]);

  // Render the canvas image
  useEffect(() => {
    if (!map) return;

    // Clear existing layers
    for (const overlay of layersRef.current.values()) {
      try {
        overlay.remove();
      } catch {
        // ignore
      }
    }
    layersRef.current.clear();
    imageUrlRef.current = null;
    boundsRef.current = null;

    // Defer heavy work to avoid blocking
    const raf = requestAnimationFrame(() => {
      const { header } = data;

      const gfsNorth = header.la1;
      const gfsSouth = header.la1 - (header.ny - 1) * header.dy;
      const gfsWest = header.lo1;
      const gfsEast = header.lo1 + (header.nx - 1) * header.dx;
      const isGlobalGrid = gfsWest >= 0 && gfsWest < 1 && gfsEast >= 359;

      const outWest = isGlobalGrid ? -180 : gfsWest;
      const outEast = isGlobalGrid ? 180 : gfsEast;
      const outNorth = Math.min(gfsNorth, MAX_LAT);
      const outSouth = Math.max(gfsSouth, -MAX_LAT);

      boundsRef.current = {
        outWest,
        outEast,
        outNorth,
        outSouth,
        isGlobal: isGlobalGrid,
      };

      const mercNorth = latToMercY(outNorth);
      const mercSouth = latToMercY(outSouth);

      const mercatorAspect =
        (mercNorth - mercSouth) / ((outEast - outWest) * DEG2RAD);
      const canvasWidth = Math.min(header.nx, MAX_CANVAS_WIDTH);
      const canvasHeight = Math.min(
        Math.round(canvasWidth * mercatorAspect),
        MAX_CANVAS_HEIGHT
      );

      const canvas = document.createElement("canvas");
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const imageData = ctx.createImageData(canvasWidth, canvasHeight);
      const pixels = imageData.data;
      const gridData = data.data;
      const nx = header.nx;
      const ny = header.ny;
      const dy = header.dy;
      const dx = header.dx;
      const range = maxVal - minVal;

      for (let py = 0; py < canvasHeight; py++) {
        const yFrac = py / (canvasHeight - 1);
        const mercY = mercNorth - yFrac * (mercNorth - mercSouth);
        const lat = mercYToLat(mercY);
        const gfsY = (gfsNorth - lat) / dy;

        if (gfsY < 0 || gfsY >= ny) continue;

        const y0 = Math.floor(gfsY);
        const y1 = Math.min(y0 + 1, ny - 1);
        const fy = gfsY - y0;
        const rowOffset = py * canvasWidth * 4;

        for (let px = 0; px < canvasWidth; px++) {
          const xFrac = px / (canvasWidth - 1);
          let lon = outWest + xFrac * (outEast - outWest);

          if (isGlobalGrid && lon < 0) {
            lon += 360;
          }
          const gfsX = (lon - gfsWest) / dx;

          if (gfsX < 0 || gfsX >= nx) continue;

          const x0 = Math.floor(gfsX);
          const x1 = Math.min(x0 + 1, nx - 1);

          const v00 = gridData[y0 * nx + x0];
          const v10 = gridData[y0 * nx + x1];
          const v01 = gridData[y1 * nx + x0];
          const v11 = gridData[y1 * nx + x1];

          // Check which values are valid
          const valid00 = v00 != null && !isNaN(v00);
          const valid10 = v10 != null && !isNaN(v10);
          const valid01 = v01 != null && !isNaN(v01);
          const valid11 = v11 != null && !isNaN(v11);

          let value: number;

          if (valid00 && valid10 && valid01 && valid11) {
            // Bilinear interpolation when all 4 corners are valid
            const fx = gfsX - x0;
            const v0 = v00 + fx * (v10 - v00);
            const v1 = v01 + fx * (v11 - v01);
            value = v0 + fy * (v1 - v0);
          } else {
            // Fallback to nearest valid neighbor
            const candidates = [
              { v: v00, valid: valid00, dist: (gfsX - x0) ** 2 + (gfsY - y0) ** 2 },
              { v: v10, valid: valid10, dist: (gfsX - x1) ** 2 + (gfsY - y0) ** 2 },
              { v: v01, valid: valid01, dist: (gfsX - x0) ** 2 + (gfsY - y1) ** 2 },
              { v: v11, valid: valid11, dist: (gfsX - x1) ** 2 + (gfsY - y1) ** 2 },
            ].filter((c) => c.valid);

            if (candidates.length === 0) {
              continue; // No valid data nearby
            }

            // Pick the closest valid value
            candidates.sort((a, b) => a.dist - b.dist);
            value = candidates[0].v;
          }

          const lutIdx =
            Math.round(((value - minVal) / range) * (LUT_SIZE - 1)) * 4;
          const clampedIdx = Math.max(0, Math.min(lutIdx, (LUT_SIZE - 1) * 4));

          const idx = rowOffset + px * 4;
          pixels[idx] = colorLut[clampedIdx];
          pixels[idx + 1] = colorLut[clampedIdx + 1];
          pixels[idx + 2] = colorLut[clampedIdx + 2];
          pixels[idx + 3] = Math.round(colorLut[clampedIdx + 3] * opacity);
        }
      }

      ctx.putImageData(imageData, 0, 0);
      imageUrlRef.current = canvas.toDataURL("image/png");

      // Initial tile creation
      updateVisibleTiles();
    });

    return () => {
      cancelAnimationFrame(raf);
      for (const overlay of layersRef.current.values()) {
        try {
          overlay.remove();
        } catch {
          // ignore
        }
      }
      layersRef.current.clear();
    };
  }, [map, data, colorLut, opacity, gridKey, minVal, maxVal, updateVisibleTiles]);

  // Listen for map movements to update tiling
  useEffect(() => {
    if (!map) return;

    map.on("moveend", updateVisibleTiles);
    map.on("zoomend", updateVisibleTiles);

    return () => {
      map.off("moveend", updateVisibleTiles);
      map.off("zoomend", updateVisibleTiles);
    };
  }, [map, updateVisibleTiles]);

  return null;
}
