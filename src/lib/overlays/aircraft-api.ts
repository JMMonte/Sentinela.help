/**
 * OpenSky Network ADS-B Aircraft Tracking API client.
 */

export type Aircraft = {
  icao24: string;
  callsign: string | null;
  latitude: number;
  longitude: number;
  altitude: number | null; // meters
  velocity: number | null; // m/s
  heading: number | null; // degrees from north
  verticalRate: number | null; // m/s
  onGround: boolean;
  lastContact: number; // unix timestamp
  originCountry: string;
};

export async function fetchAircraft(bounds?: {
  lamin: number;
  lomin: number;
  lamax: number;
  lomax: number;
}): Promise<Aircraft[]> {
  const params = new URLSearchParams();
  if (bounds) {
    params.set("lamin", bounds.lamin.toString());
    params.set("lomin", bounds.lomin.toString());
    params.set("lamax", bounds.lamax.toString());
    params.set("lomax", bounds.lomax.toString());
  }

  const url = `/api/aircraft${params.toString() ? `?${params}` : ""}`;
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Failed to fetch aircraft: ${res.status}`);
  }
  return res.json() as Promise<Aircraft[]>;
}

/**
 * Get color for aircraft based on altitude.
 * Low altitude = green, high altitude = purple
 */
export function getAircraftColor(altitude: number | null): string {
  if (altitude === null) return "#888888"; // Unknown
  const altFeet = altitude * 3.28084; // Convert to feet
  if (altFeet < 1000) return "#22c55e"; // Green - very low
  if (altFeet < 5000) return "#84cc16"; // Lime - low
  if (altFeet < 15000) return "#eab308"; // Yellow - medium
  if (altFeet < 30000) return "#f97316"; // Orange - high
  if (altFeet < 40000) return "#ef4444"; // Red - very high
  return "#a855f7"; // Purple - cruise altitude
}

/**
 * Format altitude for display.
 */
export function formatAltitude(altitude: number | null): string {
  if (altitude === null) return "Unknown";
  const altFeet = Math.round(altitude * 3.28084);
  return `${altFeet.toLocaleString()} ft`;
}

/**
 * Format velocity for display.
 */
export function formatVelocity(velocity: number | null): string {
  if (velocity === null) return "Unknown";
  const knots = Math.round(velocity * 1.94384);
  return `${knots} kts`;
}
