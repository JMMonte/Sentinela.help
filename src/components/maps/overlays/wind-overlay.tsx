"use client";

import { useEffect, useRef, useMemo } from "react";
import { useMap } from "react-leaflet";
import { useTheme } from "next-themes";
import L from "leaflet";
import "leaflet-velocity-ts";
import type { VelocityData } from "@/lib/overlays/wind-api";

// Single monochrome color per theme — visible over any overlay
const LIGHT_COLOR = ["#334155"]; // slate-700 (dark on light tiles)
const DARK_COLOR = ["#e2e8f0"]; // slate-200 (light on dark tiles)

/** Derive a stable key from the grid headers so the layer recreates when coverage changes. */
function gridKey(data: VelocityData): string {
  const h = data[0].header;
  return `${h.lo1},${h.la1},${h.dx},${h.dy},${h.nx},${h.ny}`;
}

export type WindOverlayProps = {
  data: VelocityData;
};

function VelocityLayer({ data }: { data: VelocityData }) {
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

      const layer = L.velocityLayer({
        displayValues: false,
        data,
        minVelocity: 0,
        maxVelocity: 25,
        velocityScale: 0.008,
        particleAge: 70,
        particleMultiplier: 0.003,
        particleLineWidth: 2,
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

export function WindOverlay({ data }: WindOverlayProps) {
  return <VelocityLayer data={data} />;
}
