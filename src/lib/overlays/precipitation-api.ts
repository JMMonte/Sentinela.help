/**
 * GFS Precipitation data API client.
 */

import type { GfsGridData } from "./gfs-utils";

export async function fetchPrecipitationData(): Promise<GfsGridData> {
  const res = await fetch("/api/gfs/precipitation");
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Failed to fetch precipitation: ${res.status}`);
  }
  return res.json() as Promise<GfsGridData>;
}
