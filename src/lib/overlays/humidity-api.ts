/**
 * GFS Humidity data API client.
 */

import type { GfsGridData } from "./gfs-utils";

export async function fetchHumidityData(): Promise<GfsGridData> {
  const res = await fetch("/api/gfs/humidity");
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Failed to fetch humidity: ${res.status}`);
  }
  return res.json() as Promise<GfsGridData>;
}
