/**
 * NASA FIRMS Fire Detection API client.
 */

export type FireHotspot = {
  latitude: number;
  longitude: number;
  brightness: number;
  confidence: string | number;
  frp: number;
  satellite: string;
  instrument: string;
  acq_date: string;
  acq_time: string;
  daynight: string;
};

export async function fetchFireHotspots(
  days: number = 1,
  source: string = "VIIRS_SNPP_NRT",
): Promise<FireHotspot[]> {
  const res = await fetch(`/api/fires?days=${days}&source=${source}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Failed to fetch fires: ${res.status}`);
  }
  return res.json() as Promise<FireHotspot[]>;
}

/**
 * Get color for fire hotspot based on Fire Radiative Power.
 * Higher FRP = more intense fire.
 */
export function getFireColor(frp: number): string {
  if (frp < 10) return "#ffd700"; // Gold - low intensity
  if (frp < 50) return "#ff8c00"; // Dark orange - moderate
  if (frp < 100) return "#ff4500"; // Orange red - high
  if (frp < 500) return "#ff0000"; // Red - very high
  return "#8b0000"; // Dark red - extreme
}

/**
 * Get radius for fire hotspot based on FRP.
 * Smaller sizes to avoid clutter with 28k+ global fires.
 */
export function getFireRadius(frp: number): number {
  if (frp < 10) return 2;
  if (frp < 50) return 3;
  if (frp < 100) return 4;
  if (frp < 500) return 5;
  return 6;
}

/**
 * Get confidence level description.
 */
export function getConfidenceLabel(confidence: string | number): string {
  if (typeof confidence === "number") {
    if (confidence >= 80) return "High";
    if (confidence >= 50) return "Nominal";
    return "Low";
  }
  // String confidence (VIIRS)
  const c = confidence.toLowerCase();
  if (c === "high" || c === "h") return "High";
  if (c === "nominal" || c === "n") return "Nominal";
  return "Low";
}

/**
 * Format acquisition datetime.
 */
export function formatFireTime(date: string, time: string): string {
  if (!date) return "Unknown";
  // time is HHMM format
  const hour = time.substring(0, 2);
  const min = time.substring(2, 4);
  return `${date} ${hour}:${min} UTC`;
}
