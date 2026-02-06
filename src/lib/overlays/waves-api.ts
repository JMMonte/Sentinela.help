/**
 * Ocean Waves API client.
 *
 * Fetches wave data from PacIOOS WAVEWATCH III via our server proxy.
 */

export type WaveGridHeader = {
  nx: number; // Grid points (longitude)
  ny: number; // Grid points (latitude)
  lo1: number; // Starting longitude (degrees)
  la1: number; // Starting latitude (degrees)
  dx: number; // Longitude spacing (degrees)
  dy: number; // Latitude spacing (degrees)
};

export type WaveGridData = {
  header: WaveGridHeader;
  heightData: number[]; // Significant wave height in meters
  periodData: number[]; // Peak period in seconds
  directionData: number[]; // Wave direction in degrees
  time: string;
  unit: string;
  name: string;
};

/**
 * Fetch ocean wave data from the server proxy.
 */
export async function fetchWaveData(): Promise<WaveGridData> {
  const res = await fetch("/api/waves");
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Failed to fetch wave data: ${res.status}`);
  }
  return res.json() as Promise<WaveGridData>;
}

/**
 * Get wave height color for visualization.
 * Color scale based on significant wave height in meters:
 * - Transparent/light: 0-0.5m (calm)
 * - Green: 0.5-1m
 * - Yellow: 1-2m
 * - Orange: 2-4m
 * - Red: 4-6m
 * - Purple: 6m+ (dangerous)
 */
export function getWaveHeightColor(heightMeters: number): string {
  if (heightMeters < 0.5) return "rgba(173, 216, 230, 0.3)"; // Light blue, mostly transparent
  if (heightMeters < 1) return "rgba(34, 197, 94, 0.7)"; // Green
  if (heightMeters < 2) return "rgba(234, 179, 8, 0.7)"; // Yellow
  if (heightMeters < 4) return "rgba(249, 115, 22, 0.7)"; // Orange
  if (heightMeters < 6) return "rgba(239, 68, 68, 0.7)"; // Red
  return "rgba(147, 51, 234, 0.8)"; // Purple
}

/**
 * Get wave severity label.
 */
export function getWaveSeverityLabel(heightMeters: number): string {
  if (heightMeters < 0.5) return "Calm";
  if (heightMeters < 1) return "Slight";
  if (heightMeters < 2) return "Moderate";
  if (heightMeters < 4) return "Rough";
  if (heightMeters < 6) return "Very Rough";
  return "Dangerous";
}

/**
 * Get value at a specific lat/lon from the wave grid.
 * Uses bilinear interpolation for smooth values.
 */
export function getWaveValueAt(
  grid: WaveGridData,
  lat: number,
  lon: number,
  dataField: "heightData" | "periodData" | "directionData" = "heightData",
): number | null {
  const { header } = grid;
  const data = grid[dataField];

  // Calculate grid indices
  const x = (lon - header.lo1) / header.dx;
  const y = (header.la1 - lat) / header.dy; // Grid starts from north

  // Check bounds
  if (x < 0 || x >= header.nx - 1 || y < 0 || y >= header.ny - 1) {
    return null;
  }

  // Bilinear interpolation
  const x0 = Math.floor(x);
  const x1 = x0 + 1;
  const y0 = Math.floor(y);
  const y1 = y0 + 1;

  const fx = x - x0;
  const fy = y - y0;

  const idx00 = y0 * header.nx + x0;
  const idx10 = y0 * header.nx + x1;
  const idx01 = y1 * header.nx + x0;
  const idx11 = y1 * header.nx + x1;

  const v00 = data[idx00];
  const v10 = data[idx10];
  const v01 = data[idx01];
  const v11 = data[idx11];

  // Skip if any value is NaN
  if (isNaN(v00) || isNaN(v10) || isNaN(v01) || isNaN(v11)) {
    return null;
  }

  // Interpolate
  const v0 = v00 * (1 - fx) + v10 * fx;
  const v1 = v01 * (1 - fx) + v11 * fx;

  return v0 * (1 - fy) + v1 * fy;
}
