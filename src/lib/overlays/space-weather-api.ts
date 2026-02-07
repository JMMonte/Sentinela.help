/**
 * NOAA Space Weather Prediction Center (SWPC) API client.
 * Provides D-Region Absorption Predictions (D-RAP) and HF propagation data.
 */

export type SpaceWeatherData = {
  kpIndex: number; // 0-9 scale
  kpDescription: string;
  solarFlux: number | null; // Solar radio flux at 10.7cm (SFU)
  xrayFlux: string | null; // X-ray flux level (e.g., "B5.2", "C1.0", "M2.5")
  drapAbsorption: DrapGrid | null;
  timestamp: string;
};

export type DrapGrid = {
  data: number[][]; // Absorption values in dB at 10 MHz
  latMin: number;
  latMax: number;
  lonMin: number;
  lonMax: number;
  latStep: number;
  lonStep: number;
};

export async function fetchSpaceWeather(): Promise<SpaceWeatherData> {
  const res = await fetch("/api/space-weather");
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Failed to fetch space weather: ${res.status}`);
  }
  return res.json() as Promise<SpaceWeatherData>;
}

/**
 * Get Kp index description.
 */
export function getKpDescription(kp: number): string {
  if (kp < 4) return "Quiet";
  if (kp === 4) return "Unsettled";
  if (kp === 5) return "Minor Storm (G1)";
  if (kp === 6) return "Moderate Storm (G2)";
  if (kp === 7) return "Strong Storm (G3)";
  if (kp === 8) return "Severe Storm (G4)";
  return "Extreme Storm (G5)";
}

/**
 * Get color for Kp index.
 */
export function getKpColor(kp: number): string {
  if (kp < 4) return "#22c55e"; // Green - quiet
  if (kp === 4) return "#84cc16"; // Lime - unsettled
  if (kp === 5) return "#eab308"; // Yellow - G1
  if (kp === 6) return "#f97316"; // Orange - G2
  if (kp === 7) return "#ef4444"; // Red - G3
  if (kp === 8) return "#dc2626"; // Dark red - G4
  return "#7c2d12"; // Very dark red - G5
}

/**
 * Get color for D-RAP absorption level.
 * Higher absorption = worse HF propagation.
 */
export function getDrapColor(absorption: number): string {
  if (absorption < 0.5) return "rgba(34, 197, 94, 0.4)"; // Green - minimal
  if (absorption < 1) return "rgba(234, 179, 8, 0.5)"; // Yellow - minor
  if (absorption < 3) return "rgba(249, 115, 22, 0.6)"; // Orange - moderate
  if (absorption < 10) return "rgba(239, 68, 68, 0.7)"; // Red - strong
  return "rgba(127, 29, 29, 0.8)"; // Dark red - blackout
}

/**
 * Get HF propagation impact description.
 */
export function getDrapDescription(absorption: number): string {
  if (absorption < 0.5) return "Excellent HF propagation";
  if (absorption < 1) return "Good HF propagation";
  if (absorption < 3) return "Fair HF propagation, some absorption";
  if (absorption < 10) return "Poor HF propagation, significant absorption";
  return "HF Blackout conditions";
}

/**
 * Get affected frequencies from absorption level.
 * Higher absorption affects higher frequencies.
 */
export function getAffectedFrequencies(absorption: number): string {
  if (absorption < 0.5) return "None";
  if (absorption < 1) return "< 5 MHz";
  if (absorption < 3) return "< 10 MHz";
  if (absorption < 10) return "< 20 MHz";
  return "All HF (< 30 MHz)";
}

/**
 * Interpolate D-RAP grid value at a specific lat/lon.
 */
export function getDrapValueAt(
  grid: DrapGrid,
  lat: number,
  lon: number
): number | null {
  // Normalize longitude to -180 to 180
  while (lon > 180) lon -= 360;
  while (lon < -180) lon += 360;

  // Check bounds
  if (lat < grid.latMin || lat > grid.latMax) return null;
  if (lon < grid.lonMin || lon > grid.lonMax) return null;

  // Calculate grid indices
  const latIdx = Math.floor((lat - grid.latMin) / grid.latStep);
  const lonIdx = Math.floor((lon - grid.lonMin) / grid.lonStep);

  // Bounds check
  if (latIdx < 0 || latIdx >= grid.data.length) return null;
  if (lonIdx < 0 || lonIdx >= grid.data[latIdx].length) return null;

  return grid.data[latIdx][lonIdx];
}
