"use client";

import { useEffect, useRef, useMemo } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import type { WaveGridData } from "@/lib/overlays/waves-api";
import { type ColorStop, getColorForValue } from "@/lib/overlays/gfs-utils";

export type WavesOverlayProps = {
  data: WaveGridData;
  opacity?: number;
};

/**
 * Wave height color scale.
 * - Transparent/light blue: 0-0.5m (calm)
 * - Green: 0.5-1m (slight)
 * - Yellow: 1-2m (moderate)
 * - Orange: 2-4m (rough)
 * - Red: 4-6m (very rough)
 * - Purple: 6m+ (dangerous)
 */
export const WAVE_HEIGHT_COLORS: ColorStop[] = [
  { value: 0, color: "rgba(173,216,230,0)" }, // Transparent (very calm)
  { value: 0.25, color: "rgba(173,216,230,0.3)" }, // Light blue
  { value: 0.5, color: "rgba(34,197,94,0.7)" }, // Green (slight)
  { value: 1, color: "rgba(132,204,22,0.7)" }, // Lime
  { value: 1.5, color: "rgba(234,179,8,0.7)" }, // Yellow
  { value: 2, color: "rgba(251,146,60,0.7)" }, // Light orange
  { value: 3, color: "rgba(249,115,22,0.7)" }, // Orange
  { value: 4, color: "rgba(239,68,68,0.7)" }, // Red
  { value: 5, color: "rgba(220,38,38,0.8)" }, // Dark red
  { value: 6, color: "rgba(147,51,234,0.8)" }, // Purple (dangerous)
  { value: 10, color: "rgba(126,34,206,0.9)" }, // Dark purple
];

// Web Mercator constants and helpers
const MAX_LAT = 85.051129;
const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

function latToMercY(lat: number): number {
  const latRad = Math.max(-MAX_LAT, Math.min(MAX_LAT, lat)) * DEG2RAD;
  return Math.log(Math.tan(Math.PI / 4 + latRad / 2));
}

function mercYToLat(y: number): number {
  return (2 * Math.atan(Math.exp(y)) - Math.PI / 2) * RAD2DEG;
}

/**
 * Renders ocean wave height as a colored grid overlay on the Leaflet map.
 * Reprojects from equirectangular to Web Mercator.
 */
export function WavesOverlay({ data, opacity = 0.7 }: WavesOverlayProps) {
  const map = useMap();
  const layerRef = useRef<L.ImageOverlay | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const gridKey = useMemo(() => {
    const h = data.header;
    return `${h.lo1},${h.la1},${h.dx},${h.dy},${h.nx},${h.ny}`;
  }, [data.header]);

  useEffect(() => {
    if (!map) return;

    if (layerRef.current) {
      try {
        layerRef.current.remove();
      } catch {
        // ignore
      }
      layerRef.current = null;
    }

    const { header, heightData } = data;

    // Grid bounds
    const gridNorth = header.la1;
    const gridSouth = header.la1 - (header.ny - 1) * header.dy;
    const gridWest = header.lo1;
    const gridEast = header.lo1 + (header.nx - 1) * header.dx;

    // Determine if this is a global grid (0-360 longitude)
    const isGlobalGrid = gridWest >= 0 && gridEast >= 359;

    // Output bounds
    const outWest = -180;
    const outEast = 180;
    const outNorth = Math.min(gridNorth, MAX_LAT);
    const outSouth = Math.max(gridSouth, -MAX_LAT);

    // Mercator Y values
    const mercNorth = latToMercY(outNorth);
    const mercSouth = latToMercY(outSouth);

    // Canvas dimensions
    const canvasWidth = header.nx * 2;
    const mercatorAspect = (mercNorth - mercSouth) / ((outEast - outWest) * DEG2RAD);
    const canvasHeight = Math.round(canvasWidth * mercatorAspect);

    const canvas = document.createElement("canvas");
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    canvasRef.current = canvas;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const imageData = ctx.createImageData(canvas.width, canvas.height);
    const pixels = imageData.data;

    // Render with Mercator reprojection
    for (let py = 0; py < canvas.height; py++) {
      const yFrac = py / (canvas.height - 1);
      const mercY = mercNorth - yFrac * (mercNorth - mercSouth);
      const lat = mercYToLat(mercY);

      // Convert latitude to grid Y index
      const gridY = (gridNorth - lat) / header.dy;

      for (let px = 0; px < canvas.width; px++) {
        const xFrac = px / (canvas.width - 1);
        const lon = outWest + xFrac * (outEast - outWest);

        // Convert longitude to grid X index
        let gridLon = lon;
        if (isGlobalGrid && gridLon < 0) {
          gridLon += 360; // Convert -180..0 to 180..360
        }
        const gridX = (gridLon - gridWest) / header.dx;

        // Skip if outside grid bounds
        if (gridX < 0 || gridX >= header.nx || gridY < 0 || gridY >= header.ny) {
          continue;
        }

        const value = interpolateGridValue(heightData, header.nx, header.ny, gridX, gridY);

        // Skip NaN values (land/no data)
        if (isNaN(value) || value < 0) {
          continue;
        }

        const color = getColorForValue(value, WAVE_HEIGHT_COLORS);
        const rgba = parseRgba(color);

        const idx = (py * canvas.width + px) * 4;
        pixels[idx] = rgba.r;
        pixels[idx + 1] = rgba.g;
        pixels[idx + 2] = rgba.b;
        pixels[idx + 3] = Math.round(rgba.a * 255 * opacity);
      }
    }

    ctx.putImageData(imageData, 0, 0);

    const bounds: L.LatLngBoundsExpression = [
      [outSouth, outWest],
      [outNorth, outEast],
    ];

    const imageUrl = canvas.toDataURL("image/png");
    const overlay = L.imageOverlay(imageUrl, bounds, {
      opacity: 1,
      interactive: false,
    });

    overlay.addTo(map);
    layerRef.current = overlay;

    return () => {
      if (layerRef.current) {
        try {
          layerRef.current.remove();
        } catch {
          // ignore
        }
        layerRef.current = null;
      }
    };
  }, [map, data, opacity, gridKey]);

  return null;
}

/**
 * Bilinear interpolation of grid value at fractional coordinates.
 */
function interpolateGridValue(
  data: number[],
  nx: number,
  ny: number,
  x: number,
  y: number,
): number {
  const x0 = Math.floor(x);
  const x1 = Math.min(x0 + 1, nx - 1);
  const y0 = Math.floor(y);
  const y1 = Math.min(y0 + 1, ny - 1);

  const fx = x - x0;
  const fy = y - y0;

  const v00 = data[y0 * nx + x0] ?? NaN;
  const v10 = data[y0 * nx + x1] ?? NaN;
  const v01 = data[y1 * nx + x0] ?? NaN;
  const v11 = data[y1 * nx + x1] ?? NaN;

  // If any value is NaN, return NaN
  if (isNaN(v00) || isNaN(v10) || isNaN(v01) || isNaN(v11)) {
    return NaN;
  }

  const v0 = v00 * (1 - fx) + v10 * fx;
  const v1 = v01 * (1 - fx) + v11 * fx;

  return v0 * (1 - fy) + v1 * fy;
}

/**
 * Parse color string to RGBA values.
 */
function parseRgba(color: string): { r: number; g: number; b: number; a: number } {
  // Handle rgba format
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

  // Handle rgb format
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

  // Handle hex format
  const hex = color.replace("#", "");
  return {
    r: parseInt(hex.substring(0, 2), 16),
    g: parseInt(hex.substring(2, 4), 16),
    b: parseInt(hex.substring(4, 6), 16),
    a: 1,
  };
}
