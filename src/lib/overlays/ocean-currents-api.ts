/**
 * Ocean currents velocity data API client.
 *
 * Fetches pre-processed ocean current U/V component data from our API route,
 * which sources data from NOAA CoastWatch ERDDAP (free, global, no API key required).
 */

export type OceanCurrentsGridHeader = {
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

export type OceanCurrentsGridComponent = {
  header: OceanCurrentsGridHeader;
  data: number[];
};

/** leaflet-velocity expects an array of two grid components: [U, V] */
export type OceanCurrentsVelocityData = [
  OceanCurrentsGridComponent,
  OceanCurrentsGridComponent,
];

export async function fetchOceanCurrentsData(): Promise<OceanCurrentsVelocityData> {
  const res = await fetch("/api/ocean-currents");
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      body.error || `Failed to fetch ocean currents data: ${res.status}`,
    );
  }
  return (await res.json()) as OceanCurrentsVelocityData;
}
