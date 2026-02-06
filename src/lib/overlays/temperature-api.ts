/**
 * GFS Temperature data API client.
 */

import type { GfsGridData } from "./gfs-utils";

export type { GfsGridData as TemperatureGridData };

export async function fetchTemperatureData(): Promise<GfsGridData> {
  const res = await fetch("/api/gfs/temperature");
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Failed to fetch temperature: ${res.status}`);
  }
  return res.json() as Promise<GfsGridData>;
}
