"use client";

import { GfsGridOverlay } from "./gfs-grid-overlay";
import { SST_COLORS, type GfsGridData } from "@/lib/overlays/gfs-utils";

export type SstOverlayProps = {
  data: GfsGridData;
  opacity?: number;
};

/**
 * Sea Surface Temperature overlay - renders NOAA OISST data as a color gradient.
 * Dark blue (cold/ice) -> Light blue -> Green -> Orange -> Red (tropical warm)
 */
export function SstOverlay({ data, opacity = 0.6 }: SstOverlayProps) {
  return (
    <GfsGridOverlay
      data={data}
      colorScale={SST_COLORS}
      opacity={opacity}
    />
  );
}
