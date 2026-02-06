"use client";

import { GfsGridOverlay } from "./gfs-grid-overlay";
import { CAPE_COLORS, type GfsGridData } from "@/lib/overlays/gfs-utils";

export type CapeOverlayProps = {
  data: GfsGridData;
  opacity?: number;
};

/**
 * CAPE overlay - renders convective available potential energy.
 * Indicates thunderstorm potential.
 * Green (stable) → Yellow → Red (severe storm potential)
 */
export function CapeOverlay({ data, opacity = 0.6 }: CapeOverlayProps) {
  return (
    <GfsGridOverlay
      data={data}
      colorScale={CAPE_COLORS}
      opacity={opacity}
    />
  );
}
