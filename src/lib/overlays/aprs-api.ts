/**
 * APRS.fi Amateur Radio APRS API client.
 */

export type AprsStation = {
  callsign: string;
  latitude: number;
  longitude: number;
  symbol: string;
  symbolTable: string;
  comment: string | null;
  lastHeard: number; // unix timestamp
  speed: number | null; // km/h
  course: number | null; // degrees
  altitude: number | null; // meters
  path: string | null;
  // Weather data (if weather station)
  weather?: {
    temp: number | null; // Celsius
    humidity: number | null; // %
    pressure: number | null; // hPa
    windSpeed: number | null; // km/h
    windDirection: number | null; // degrees
    rain1h: number | null; // mm
  };
};

export async function fetchAprsStations(bounds?: {
  lamin: number;
  lomin: number;
  lamax: number;
  lomax: number;
}): Promise<AprsStation[]> {
  const params = new URLSearchParams();
  if (bounds) {
    params.set("lamin", bounds.lamin.toString());
    params.set("lomin", bounds.lomin.toString());
    params.set("lamax", bounds.lamax.toString());
    params.set("lomax", bounds.lomax.toString());
  }

  const url = `/api/aprs${params.toString() ? `?${params}` : ""}`;
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Failed to fetch APRS stations: ${res.status}`);
  }
  return res.json() as Promise<AprsStation[]>;
}

/**
 * Determine station type from APRS symbol.
 */
export type AprsStationType = "fixed" | "mobile" | "weather" | "digipeater" | "igate" | "other";

export function getStationType(symbol: string, symbolTable: string): AprsStationType {
  // Common APRS symbols
  if (symbol === "_") return "weather";
  if (symbol === "#" || symbol === "&") return "digipeater";
  if (symbol === "I") return "igate";
  if (symbol === ">" || symbol === "k" || symbol === "u" || symbol === "v") return "mobile";
  if (symbol === "-" || symbol === "n" || symbol === "y") return "fixed";
  // Default based on symbol table
  return symbolTable === "/" ? "fixed" : "other";
}

/**
 * Get color for APRS station based on type.
 */
export function getAprsColor(type: AprsStationType): string {
  switch (type) {
    case "weather": return "#3b82f6"; // Blue
    case "digipeater": return "#8b5cf6"; // Purple
    case "igate": return "#6366f1"; // Indigo
    case "mobile": return "#22c55e"; // Green
    case "fixed": return "#f97316"; // Orange
    default: return "#6b7280"; // Gray
  }
}

/**
 * Get icon for APRS station type.
 */
export function getAprsIcon(type: AprsStationType): string {
  switch (type) {
    case "weather": return "🌡️";
    case "digipeater": return "📡";
    case "igate": return "🌐";
    case "mobile": return "🚗";
    case "fixed": return "🏠";
    default: return "📻";
  }
}

/**
 * Format last heard time.
 */
export function formatLastHeard(timestamp: number): string {
  const ageMs = Date.now() - timestamp * 1000;
  if (ageMs < 60000) return "Just now";
  if (ageMs < 3600000) {
    const mins = Math.floor(ageMs / 60000);
    return `${mins}m ago`;
  }
  if (ageMs < 86400000) {
    const hours = Math.floor(ageMs / 3600000);
    return `${hours}h ago`;
  }
  const days = Math.floor(ageMs / 86400000);
  return `${days}d ago`;
}
