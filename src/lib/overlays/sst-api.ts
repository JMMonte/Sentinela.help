/**
 * NOAA OISST v2.1 Sea Surface Temperature data API client.
 */

import type { GfsGridData } from "./gfs-utils";

export type { GfsGridData as SstGridData };

export async function fetchSstData(): Promise<GfsGridData> {
  const res = await fetch("/api/sst");
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Failed to fetch SST data: ${res.status}`);
  }
  return res.json() as Promise<GfsGridData>;
}
