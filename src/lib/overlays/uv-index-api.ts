/**
 * UV Index data API client.
 *
 * Fetches UV index grid data calculated from NOAA GFS ozone data
 * using the Madronich formula.
 * Returns GfsGridData format for rendering with GfsGridOverlay.
 */

import type { GfsGridData } from "./gfs-utils";

/**
 * Fetch UV index grid data from GFS ozone-based calculation
 */
export async function fetchUvIndexData(): Promise<GfsGridData> {
  const res = await fetch("/api/gfs/uv-index");
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Failed to fetch UV index: ${res.status}`);
  }
  return res.json() as Promise<GfsGridData>;
}
