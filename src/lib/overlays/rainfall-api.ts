/**
 * IPMA rainfall / meteorological observations API.
 *
 * Fetches via server proxy (/api/rainfall) that caches IPMA responses,
 * then aggregates per-station on the client side based on user's time filter.
 */

export type IpmaStation = {
  id: string;
  name: string;
  lat: number;
  lng: number;
};

export type StationObservation = {
  stationId: string;
  name: string;
  lat: number;
  lng: number;
  /** Hourly accumulated precipitation in mm (latest reading). */
  precHourly: number;
  /** Sum of precAcumulada across available hours (up to 24h). */
  precTotal: number;
  /** Number of hours with data. */
  hoursWithData: number;
  /** Latest temperature reading in °C. */
  temperature: number | null;
  /** Latest humidity reading in %. */
  humidity: number | null;
};

type RawStation = {
  geometry: { type: "Point"; coordinates: [number, number] };
  type: "Feature";
  properties: { idEstacao: number; localEstacao: string };
};

type RawObservation = {
  intensidadeVentoKM: number | null;
  temperatura: number | null;
  radiacao: number | null;
  idDireccVento: number | null;
  precAcumulada: number | null;
  intensidadeVento: number | null;
  humidade: number | null;
  pressao: number | null;
} | null;

type RawObservations = Record<string, Record<string, RawObservation>>;

export async function fetchRainfallObservations(hours: number = 24): Promise<StationObservation[]> {
  // Fetch via server proxy (caches IPMA responses)
  const res = await fetch("/api/rainfall");
  if (!res.ok) throw new Error(`Failed to fetch rainfall data: ${res.status}`);

  const { stations: rawStations, observations } = (await res.json()) as {
    stations: RawStation[];
    observations: RawObservations;
  };

  const stations: IpmaStation[] = rawStations.map((s) => ({
    id: String(s.properties.idEstacao),
    name: s.properties.localEstacao,
    lat: s.geometry.coordinates[1],
    lng: s.geometry.coordinates[0],
  }));

  // Build station lookup
  const stationMap = new Map(stations.map((s) => [s.id, s]));

  // Aggregate per station: sum precAcumulada across hours, keep latest reading
  const aggMap = new Map<
    string,
    { precTotal: number; hoursWithData: number; latestPrec: number; latestTemp: number | null; latestHumidity: number | null }
  >();

  // Sort timestamps chronologically so the last processed is the latest
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
  const timestamps = Object.keys(observations)
    .filter((ts) => new Date(ts) >= cutoff)
    .sort();

  for (const ts of timestamps) {
    const stationData = observations[ts];
    for (const [stationId, obs] of Object.entries(stationData)) {
      if (!obs || !stationMap.has(stationId)) continue;

      const existing = aggMap.get(stationId) ?? {
        precTotal: 0,
        hoursWithData: 0,
        latestPrec: 0,
        latestTemp: null,
        latestHumidity: null,
      };

      if (obs.precAcumulada != null && obs.precAcumulada >= 0) {
        existing.precTotal += obs.precAcumulada;
        existing.hoursWithData++;
        existing.latestPrec = obs.precAcumulada;
      }
      if (obs.temperatura != null) existing.latestTemp = obs.temperatura;
      if (obs.humidade != null) existing.latestHumidity = obs.humidade;

      aggMap.set(stationId, existing);
    }
  }

  // Build result, only include stations that have some precipitation data
  const result: StationObservation[] = [];
  for (const [stationId, agg] of aggMap) {
    const station = stationMap.get(stationId);
    if (!station) continue;

    result.push({
      stationId,
      name: station.name,
      lat: station.lat,
      lng: station.lng,
      precHourly: agg.latestPrec,
      precTotal: Math.round(agg.precTotal * 10) / 10,
      hoursWithData: agg.hoursWithData,
      temperature: agg.latestTemp,
      humidity: agg.latestHumidity,
    });
  }

  return result;
}

/** Color based on 24h accumulated precipitation. */
export function getRainfallColor(precTotal: number): string {
  if (precTotal >= 50) return "#7c3aed"; // purple — very heavy
  if (precTotal >= 20) return "#dc2626"; // red — heavy
  if (precTotal >= 10) return "#f97316"; // orange — moderate
  if (precTotal >= 5) return "#eab308";  // yellow — light-moderate
  if (precTotal > 0) return "#3b82f6";   // blue — light
  return "#94a3b8";                       // slate — no rain
}

/** Radius based on precipitation amount. */
export function getRainfallRadius(precTotal: number): number {
  if (precTotal >= 50) return 12;
  if (precTotal >= 20) return 10;
  if (precTotal >= 10) return 8;
  if (precTotal >= 5) return 6;
  if (precTotal > 0) return 5;
  return 4;
}
