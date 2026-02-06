/**
 * GFS Fire Weather Index data API client.
 */

import type { GfsGridData } from "./gfs-utils";

export async function fetchFireWeatherData(): Promise<GfsGridData> {
  const res = await fetch("/api/gfs/fire-weather");
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Failed to fetch fire weather: ${res.status}`);
  }
  return res.json() as Promise<GfsGridData>;
}

/**
 * Get fire weather risk level from FWI value.
 */
export function getFireWeatherLevel(fwi: number): {
  level: "low" | "moderate" | "high" | "very-high" | "extreme";
  label: string;
} {
  if (fwi < 15) return { level: "low", label: "Low" };
  if (fwi < 30) return { level: "moderate", label: "Moderate" };
  if (fwi < 50) return { level: "high", label: "High" };
  if (fwi < 75) return { level: "very-high", label: "Very High" };
  return { level: "extreme", label: "Extreme" };
}
