/**
 * GFS Cloud Cover data API client.
 */

import type { GfsGridData } from "./gfs-utils";

export async function fetchCloudCoverData(): Promise<GfsGridData> {
  const res = await fetch("/api/gfs/cloud-cover");
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Failed to fetch cloud cover: ${res.status}`);
  }
  return res.json() as Promise<GfsGridData>;
}
