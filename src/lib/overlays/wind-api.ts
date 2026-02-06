/**
 * Wind velocity data API client.
 *
 * Fetches pre-processed wind U/V component data from our API route,
 * which sources data from NOAA GFS (free, global, no API key required).
 */

export type WindGridHeader = {
  parameterNumber: number;
  parameterNumberName: string;
  parameterUnit: string;
  nx: number;
  ny: number;
  lo1: number;
  la1: number;
  dx: number;
  dy: number;
};

export type WindGridComponent = {
  header: WindGridHeader;
  data: number[];
};

/** leaflet-velocity expects an array of two grid components: [U, V] */
export type VelocityData = [WindGridComponent, WindGridComponent];

export async function fetchWindData(): Promise<VelocityData> {
  const res = await fetch("/api/wind-data");
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Failed to fetch wind data: ${res.status}`);
  }
  return (await res.json()) as VelocityData;
}
