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

const FOGOS_ACTIVE_URL = "https://api.fogos.pt/v2/incidents/active";
const FOGOS_SEARCH_URL = "https://api.fogos.pt/v2/incidents/search";

/**
 * Fetch incidents within the given time window (in hours).
 * Merges currently active incidents with recent ones from the
 * search endpoint so the overlay respects the app's time filter.
 */
export async function fetchIncidents(hours: number = 8): Promise<ProCivIncident[]> {
  const cutoff = Date.now() - hours * 60 * 60 * 1000;

  // Always include currently active incidents
  const activeRes = await fetch(FOGOS_ACTIVE_URL);
  let active: ProCivIncident[] = [];
  if (activeRes.ok) {
    const activeData = (await activeRes.json()) as FogosResponse;
    if (activeData.success) {
      active = activeData.data;
    }
  }

  // Also fetch recent incidents from the search endpoint
  const since = new Date(cutoff);
  const after = `${since.getFullYear()}-${String(since.getMonth() + 1).padStart(2, "0")}-${String(since.getDate()).padStart(2, "0")}`;
  const searchRes = await fetch(`${FOGOS_SEARCH_URL}?after=${after}&limit=100`);

  let recent: ProCivIncident[] = [];
  if (searchRes.ok) {
    const searchData = (await searchRes.json()) as FogosResponse;
    if (searchData.success) {
      recent = searchData.data.filter(
        (i) => i.dateTime.sec * 1000 >= cutoff
      );
    }
  }

  // Merge, deduplicating by id (active takes priority)
  const byId = new Map<string, ProCivIncident>();
  for (const i of recent) byId.set(i.id, i);
  for (const i of active) byId.set(i.id, i); // overwrites with active version
  return Array.from(byId.values());
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
