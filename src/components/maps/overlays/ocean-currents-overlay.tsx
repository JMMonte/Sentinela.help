"use client";

import { useEffect, useRef, useMemo } from "react";
import { useMap } from "react-leaflet";
import { useTheme } from "next-themes";
import L from "leaflet";
import "leaflet-velocity-ts";
import type { OceanCurrentsVelocityData } from "@/lib/overlays/ocean-currents-api";

// Single monochrome color per theme — same style as wind for consistency
const LIGHT_COLOR = ["#334155"]; // slate-700 (dark on light tiles)
const DARK_COLOR = ["#e2e8f0"]; // slate-200 (light on dark tiles)

/** Derive a stable key from the grid headers so the layer recreates when coverage changes. */
function gridKey(data: OceanCurrentsVelocityData): string {
  const h = data[0].header;
  return `${h.lo1},${h.la1},${h.dx},${h.dy},${h.nx},${h.ny}`;
}

export type OceanCurrentsOverlayProps = {
  data: OceanCurrentsVelocityData;
};

function VelocityLayer({ data }: { data: OceanCurrentsVelocityData }) {
  const map = useMap();
  const { resolvedTheme } = useTheme();
  const layerRef = useRef<L.VelocityLayer | null>(null);
  const mountedRef = useRef(false);

  // Stable key that only changes when the grid extent/resolution changes
  const dataGridKey = useMemo(() => gridKey(data), [data]);

  // Recreate layer when map, theme, or grid extent changes
  useEffect(() => {
    mountedRef.current = true;

    const raf = requestAnimationFrame(() => {
      if (!mountedRef.current || !map) return;
      if (!map.getContainer()?.parentNode) return;

      // Remove existing layer before creating a new one
      if (layerRef.current) {
        try {
          layerRef.current.remove();
        } catch {
          // ignore
        }
        layerRef.current = null;
      }

      const colorScale =
        resolvedTheme === "dark" ? DARK_COLOR : LIGHT_COLOR;

      // Ocean currents are much slower than wind (typically 0-2 m/s vs 0-25 m/s)
      // Use higher multipliers and thicker lines for strong visibility
      const layer = L.velocityLayer({
        displayValues: false,
        data,
        minVelocity: 0,
        maxVelocity: 2,
        velocityScale: 0.1, // High scale for visible movement
        particleAge: 200, // Very long particle trails
        particleMultiplier: 0.008, // Dense particle flow
        particleLineWidth: 3, // Thick lines
        frameRate: 20,
        opacity: 0.97,
        colorScale,
      }).addTo(map);

      layerRef.current = layer;
    });

    return () => {
      mountedRef.current = false;
      cancelAnimationFrame(raf);
      if (layerRef.current) {
        try {
          layerRef.current.remove();
        } catch {
          // Canvas layer may have pending animation frames after map detaches
        }
        layerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, resolvedTheme, dataGridKey]);

  return null;
}

export function OceanCurrentsOverlay({ data }: OceanCurrentsOverlayProps) {
  return <VelocityLayer data={data} />;
}
