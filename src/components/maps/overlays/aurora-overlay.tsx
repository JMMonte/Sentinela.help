"use client";

import { GfsGridOverlay } from "./gfs-grid-overlay";
import { AURORA_COLORS, type AuroraData } from "@/lib/overlays/aurora-api";

export type AuroraOverlayProps = {
  data: AuroraData;
  opacity?: number;
};

/**
 * Aurora Borealis/Australis overlay.
 *
 * Renders NOAA SWPC OVATION aurora probability forecast as a colored overlay.
 * Uses dark/translucent colors to represent the night sky effect:
 * - Transparent: 0-5% (no aurora)
 * - Dim green: 5-20%
 * - Bright green: 20-40%
 * - Yellow-green: 40-60%
 * - Yellow: 60-80%
 * - White/bright: 80-100%
 *
 * Aurora is most visible in polar regions (above/below 55-60 degrees latitude).
 */
export function AuroraOverlay({ data, opacity = 0.7 }: AuroraOverlayProps) {
  return (
    <GfsGridOverlay
      data={data.grid}
      colorScale={AURORA_COLORS}
      opacity={opacity}
    />
  );
}
