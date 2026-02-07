/**
 * NOAA Total Electron Content (TEC) API client.
 * TEC affects GPS accuracy and radio signal propagation.
 */

export type TecData = {
  grid: number[][]; // TEC values in TECU (1 TECU = 10^16 electrons/m²)
  latMin: number;
  latMax: number;
  lonMin: number;
  lonMax: number;
  latStep: number;
  lonStep: number;
  timestamp: string;
  unit: string; // "TECU"
};

export async function fetchTec(): Promise<TecData> {
  const res = await fetch("/api/tec");
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Failed to fetch TEC data: ${res.status}`);
  }
  return res.json() as Promise<TecData>;
}

/**
 * Get color for TEC value.
 * Higher TEC can affect GPS and radio.
 */
export function getTecColor(tec: number): string {
  if (tec < 10) return "rgba(59, 130, 246, 0.4)"; // Blue - low
  if (tec < 25) return "rgba(34, 197, 94, 0.5)"; // Green - normal
  if (tec < 50) return "rgba(234, 179, 8, 0.6)"; // Yellow - elevated
  if (tec < 75) return "rgba(249, 115, 22, 0.7)"; // Orange - high
  return "rgba(239, 68, 68, 0.8)"; // Red - very high
}

/**
 * Get TEC level description.
 */
export function getTecDescription(tec: number): string {
  if (tec < 10) return "Low TEC - excellent GPS accuracy";
  if (tec < 25) return "Normal TEC - good conditions";
  if (tec < 50) return "Elevated TEC - minor GPS errors possible";
  if (tec < 75) return "High TEC - GPS errors likely";
  return "Very High TEC - significant ionospheric disturbance";
}

/**
 * Get GPS accuracy impact estimate.
 * TEC causes range errors of approximately 0.16m per TECU at L1 frequency.
 */
export function getGpsImpact(tec: number): string {
  const errorMeters = tec * 0.16;
  if (errorMeters < 1) return "< 1m error";
  if (errorMeters < 5) return `~${errorMeters.toFixed(1)}m error`;
  if (errorMeters < 10) return `~${Math.round(errorMeters)}m error`;
  return `>${Math.round(errorMeters)}m error possible`;
}

/**
 * Interpolate TEC grid value at a specific lat/lon.
 */
export function getTecValueAt(
  data: TecData,
  lat: number,
  lon: number
): number | null {
  // Normalize longitude to -180 to 180
  while (lon > 180) lon -= 360;
  while (lon < -180) lon += 360;

  // Check bounds
  if (lat < data.latMin || lat > data.latMax) return null;
  if (lon < data.lonMin || lon > data.lonMax) return null;

  // Calculate grid indices
  const latIdx = Math.floor((lat - data.latMin) / data.latStep);
  const lonIdx = Math.floor((lon - data.lonMin) / data.lonStep);

  // Bounds check
  if (latIdx < 0 || latIdx >= data.grid.length) return null;
  if (lonIdx < 0 || lonIdx >= data.grid[latIdx].length) return null;

  return data.grid[latIdx][lonIdx];
}

/**
 * Format TEC value for display.
 */
export function formatTec(tec: number): string {
  return `${tec.toFixed(1)} TECU`;
}
