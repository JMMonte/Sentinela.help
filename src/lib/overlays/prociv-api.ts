/**
 * ProCiv / Fogos.pt API integration.
 *
 * Fetches active civil protection occurrences from the Fogos.pt API,
 * which aggregates data from Portugal's ANEPC/SADO system.
 */

export type ProCivIncident = {
  id: string;
  lat: number;
  lng: number;
  natureza: string; // e.g. "Mato", "Povoamento Florestal", "Urbano"
  naturezaCode: string;
  status: string; // e.g. "Em Curso", "Em Resolução"
  statusCode: number;
  statusColor: string; // hex without #
  location: string;
  district: string;
  concelho: string;
  freguesia: string;
  man: number; // firefighters deployed
  terrain: number; // ground vehicles
  aerial: number; // aerial means
  meios_aquaticos: number; // water vehicles
  dateTime: { sec: number };
  date: string;
  hour: string;
  active: boolean;
  important: boolean;
};

type FogosResponse = {
  success: boolean;
  data: ProCivIncident[];
};

/**
 * Fetch incidents within the given time window (in hours).
 * Uses server proxy that caches Fogos.pt responses.
 */
export async function fetchIncidents(hours: number = 8): Promise<ProCivIncident[]> {
  const response = await fetch(`/api/prociv?hours=${hours}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch ProCiv data: ${response.status}`);
  }

  const data = (await response.json()) as FogosResponse;
  return data.success ? data.data : [];
}

/**
 * Map nature codes to broad categories for coloring.
 *  31xx = Incêndios Rurais (wildfires)
 *  21xx = Incêndios Urbanos (urban fires)
 *  24xx = Inundações (floods)
 *  23xx = Acidentes (accidents)
 *  92xx = Meteorologia (weather)
 */
export function getIncidentColor(naturezaCode: string): string {
  const prefix = naturezaCode.substring(0, 2);
  switch (prefix) {
    case "31": // Rural/forest fires
    case "32":
      return "#ef4444"; // red
    case "21": // Urban fires
    case "22":
      return "#f97316"; // orange
    case "24": // Floods / water
      return "#3b82f6"; // blue
    case "23": // Accidents
      return "#eab308"; // yellow
    case "92": // Weather
    case "93":
      return "#8b5cf6"; // purple
    default:
      return "#71717a"; // zinc/gray
  }
}

export function getIncidentRadius(man: number, important: boolean): number {
  if (important) return 12;
  if (man >= 100) return 10;
  if (man >= 30) return 8;
  if (man >= 10) return 6;
  return 5;
}
