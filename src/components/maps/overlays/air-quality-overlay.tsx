"use client";

import type { GfsGridData } from "@/lib/overlays/gfs-utils";
import { GfsGridOverlay } from "./gfs-grid-overlay";
import type { ColorStop } from "@/lib/overlays/gfs-utils";

export type AirQualityOverlayProps = {
  data: GfsGridData;
};

/**
 * AQI color scale (US EPA standard):
 * 0-50: Good (Green)
 * 51-100: Moderate (Yellow)
 * 101-150: Unhealthy for Sensitive Groups (Orange)
 * 151-200: Unhealthy (Red)
 * 201-300: Very Unhealthy (Purple)
 * 301+: Hazardous (Maroon)
 */
const AQI_COLOR_SCALE: ColorStop[] = [
  { value: 0, color: "rgba(0, 228, 0, 0.8)" },      // Good - Green
  { value: 50, color: "rgba(0, 228, 0, 0.8)" },
  { value: 51, color: "rgba(255, 255, 0, 0.8)" },   // Moderate - Yellow
  { value: 100, color: "rgba(255, 255, 0, 0.8)" },
  { value: 101, color: "rgba(255, 126, 0, 0.8)" },  // USG - Orange
  { value: 150, color: "rgba(255, 126, 0, 0.8)" },
  { value: 151, color: "rgba(255, 0, 0, 0.8)" },    // Unhealthy - Red
  { value: 200, color: "rgba(255, 0, 0, 0.8)" },
  { value: 201, color: "rgba(143, 63, 151, 0.8)" }, // Very Unhealthy - Purple
  { value: 300, color: "rgba(143, 63, 151, 0.8)" },
  { value: 301, color: "rgba(126, 0, 35, 0.8)" },   // Hazardous - Maroon
  { value: 500, color: "rgba(126, 0, 35, 0.8)" },
];

/**
 * Renders interpolated air quality data as a heatmap overlay.
 * Uses IDW interpolation from WAQI monitoring stations.
 */
export function AirQualityOverlay({ data }: AirQualityOverlayProps) {
  return <GfsGridOverlay data={data} colorScale={AQI_COLOR_SCALE} opacity={0.65} />;
}
