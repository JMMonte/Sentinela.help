"use client";

import type { GfsGridData } from "@/lib/overlays/gfs-utils";

/**
 * Fetches interpolated air quality grid from WAQI station data.
 * Uses IDW interpolation for smooth visualization.
 */
export async function fetchAirQualityGrid(): Promise<GfsGridData> {
  const res = await fetch("/api/air-quality-grid");
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Failed to fetch air quality grid: ${res.status}`);
  }
  return res.json() as Promise<GfsGridData>;
}

/**
 * AQI color scale (US EPA standard):
 * 0-50: Good (Green)
 * 51-100: Moderate (Yellow)
 * 101-150: Unhealthy for Sensitive Groups (Orange)
 * 151-200: Unhealthy (Red)
 * 201-300: Very Unhealthy (Purple)
 * 301+: Hazardous (Maroon)
 */
export function getAqiColor(aqi: number): string {
  if (aqi <= 50) return "rgba(0, 228, 0, 0.7)"; // Good - Green
  if (aqi <= 100) return "rgba(255, 255, 0, 0.7)"; // Moderate - Yellow
  if (aqi <= 150) return "rgba(255, 126, 0, 0.7)"; // USG - Orange
  if (aqi <= 200) return "rgba(255, 0, 0, 0.7)"; // Unhealthy - Red
  if (aqi <= 300) return "rgba(143, 63, 151, 0.7)"; // Very Unhealthy - Purple
  return "rgba(126, 0, 35, 0.7)"; // Hazardous - Maroon
}

/**
 * AQI color scale for canvas rendering (RGB values)
 */
export const AQI_COLOR_SCALE: Array<{ value: number; color: [number, number, number] }> = [
  { value: 0, color: [0, 228, 0] },      // Good - Green
  { value: 50, color: [0, 228, 0] },
  { value: 51, color: [255, 255, 0] },   // Moderate - Yellow
  { value: 100, color: [255, 255, 0] },
  { value: 101, color: [255, 126, 0] },  // USG - Orange
  { value: 150, color: [255, 126, 0] },
  { value: 151, color: [255, 0, 0] },    // Unhealthy - Red
  { value: 200, color: [255, 0, 0] },
  { value: 201, color: [143, 63, 151] }, // Very Unhealthy - Purple
  { value: 300, color: [143, 63, 151] },
  { value: 301, color: [126, 0, 35] },   // Hazardous - Maroon
  { value: 500, color: [126, 0, 35] },
];
