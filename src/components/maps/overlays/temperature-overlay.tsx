"use client";

import { GfsGridOverlay } from "./gfs-grid-overlay";
import { TEMPERATURE_COLORS, type GfsGridData } from "@/lib/overlays/gfs-utils";

export type TemperatureOverlayProps = {
  data: GfsGridData;
  opacity?: number;
};

/**
 * Temperature overlay - renders GFS 2m temperature as a color gradient.
 * Blue (cold) → White (mild) → Red (hot)
 */
export function TemperatureOverlay({ data, opacity = 0.6 }: TemperatureOverlayProps) {
  return (
    <GfsGridOverlay
      data={data}
      colorScale={TEMPERATURE_COLORS}
      opacity={opacity}
    />
  );
}
