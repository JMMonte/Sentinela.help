"use client";

import { GfsGridOverlay } from "./gfs-grid-overlay";
import { FIRE_WEATHER_COLORS, type GfsGridData } from "@/lib/overlays/gfs-utils";

export type FireWeatherOverlayProps = {
  data: GfsGridData;
  opacity?: number;
};

/**
 * Fire Weather Index overlay - shows fire danger based on temp + humidity.
 * Green (low risk) → Yellow → Orange → Red (extreme risk)
 */
export function FireWeatherOverlay({ data, opacity = 0.6 }: FireWeatherOverlayProps) {
  return (
    <GfsGridOverlay
      data={data}
      colorScale={FIRE_WEATHER_COLORS}
      opacity={opacity}
    />
  );
}
