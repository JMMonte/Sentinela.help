"use client";

import { GfsGridOverlay } from "./gfs-grid-overlay";
import { PRECIPITATION_COLORS, type GfsGridData } from "@/lib/overlays/gfs-utils";

export type PrecipitationGfsOverlayProps = {
  data: GfsGridData;
  opacity?: number;
};

/**
 * Precipitation forecast overlay - renders GFS accumulated precipitation.
 * White (none) → Blue → Purple (heavy)
 */
export function PrecipitationGfsOverlay({ data, opacity = 0.7 }: PrecipitationGfsOverlayProps) {
  return (
    <GfsGridOverlay
      data={data}
      colorScale={PRECIPITATION_COLORS}
      opacity={opacity}
    />
  );
}
