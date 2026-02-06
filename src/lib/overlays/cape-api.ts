/**
 * GFS CAPE (Convective Available Potential Energy) data API client.
 */

import type { GfsGridData } from "./gfs-utils";

export async function fetchCapeData(): Promise<GfsGridData> {
  const res = await fetch("/api/gfs/cape");
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Failed to fetch CAPE: ${res.status}`);
  }
  return res.json() as Promise<GfsGridData>;
}
