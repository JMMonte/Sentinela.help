"use client";

import { GfsGridOverlay } from "./gfs-grid-overlay";
import { HUMIDITY_COLORS, type GfsGridData } from "@/lib/overlays/gfs-utils";

export type HumidityOverlayProps = {
  data: GfsGridData;
  opacity?: number;
};

/**
 * Humidity overlay - renders GFS 2m relative humidity as a color gradient.
 * Brown (dry) → Green (humid)
 */
export function HumidityOverlay({ data, opacity = 0.6 }: HumidityOverlayProps) {
  return (
    <GfsGridOverlay
      data={data}
      colorScale={HUMIDITY_COLORS}
      opacity={opacity}
    />
  );
}
