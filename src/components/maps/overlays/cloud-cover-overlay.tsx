"use client";

import { GfsGridOverlay } from "./gfs-grid-overlay";
import { CLOUD_COVER_COLORS, type GfsGridData } from "@/lib/overlays/gfs-utils";

export type CloudCoverOverlayProps = {
  data: GfsGridData;
  opacity?: number;
};

/**
 * Cloud cover overlay - renders GFS total cloud cover.
 * Transparent (clear) → White (overcast)
 */
export function CloudCoverOverlay({ data, opacity = 0.5 }: CloudCoverOverlayProps) {
  return (
    <GfsGridOverlay
      data={data}
      colorScale={CLOUD_COVER_COLORS}
      opacity={opacity}
    />
  );
}
