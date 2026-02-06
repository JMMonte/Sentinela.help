/**
 * Shared GFS (Global Forecast System) utilities.
 *
 * Common helpers for visualizing GFS grids.
 * NOTE: GRIB parsing functions are in gfs-parse.ts (server-only)
 */

// ============================================================================
// Types
// ============================================================================

export type GfsGridHeader = {
  nx: number; // Grid points (longitude)
  ny: number; // Grid points (latitude)
  lo1: number; // Starting longitude (degrees)
  la1: number; // Starting latitude (degrees)
  dx: number; // Longitude spacing (degrees)
  dy: number; // Latitude spacing (degrees)
};

export type GfsGridData = {
  header: GfsGridHeader;
  data: number[];
  unit: string;
  name: string;
};

export type ColorStop = {
  value: number;
  color: string;
};

// ============================================================================
// Unit Conversions
// ============================================================================

/** Convert Kelvin to Celsius */
export function kelvinToCelsius(k: number): number {
  return k - 273.15;
}

/** Convert m/s to km/h */
export function msToKmh(ms: number): number {
  return ms * 3.6;
}

// ============================================================================
// Color Scales
// ============================================================================

/**
 * Temperature color scale: Blue (cold) → White (mild) → Red (hot)
 * Range: -20°C to 45°C
 */
export const TEMPERATURE_COLORS: ColorStop[] = [
  { value: -20, color: "#313695" }, // Dark blue
  { value: -10, color: "#4575b4" }, // Blue
  { value: 0, color: "#74add1" }, // Light blue
  { value: 10, color: "#abd9e9" }, // Pale blue
  { value: 15, color: "#e0f3f8" }, // Very pale blue
  { value: 20, color: "#ffffbf" }, // Pale yellow
  { value: 25, color: "#fee090" }, // Yellow
  { value: 30, color: "#fdae61" }, // Orange
  { value: 35, color: "#f46d43" }, // Red-orange
  { value: 40, color: "#d73027" }, // Red
  { value: 45, color: "#a50026" }, // Dark red
];

/**
 * Humidity color scale: Brown (dry) → Green (humid)
 * Range: 0% to 100%
 */
export const HUMIDITY_COLORS: ColorStop[] = [
  { value: 0, color: "#8c510a" }, // Brown (very dry)
  { value: 20, color: "#bf812d" }, // Tan
  { value: 40, color: "#dfc27d" }, // Pale brown
  { value: 50, color: "#f6e8c3" }, // Cream
  { value: 60, color: "#c7eae5" }, // Pale green
  { value: 70, color: "#80cdc1" }, // Light green
  { value: 80, color: "#35978f" }, // Teal
  { value: 90, color: "#01665e" }, // Dark teal
  { value: 100, color: "#003c30" }, // Dark green
];

/**
 * Precipitation color scale: White → Blue → Purple
 * Range: 0mm to 50mm+
 */
export const PRECIPITATION_COLORS: ColorStop[] = [
  { value: 0, color: "rgba(255,255,255,0)" }, // Transparent (no rain)
  { value: 0.1, color: "#c6dbef" }, // Very light blue
  { value: 1, color: "#9ecae1" }, // Light blue
  { value: 2.5, color: "#6baed6" }, // Blue
  { value: 5, color: "#4292c6" }, // Medium blue
  { value: 10, color: "#2171b5" }, // Dark blue
  { value: 20, color: "#084594" }, // Very dark blue
  { value: 35, color: "#6a51a3" }, // Purple
  { value: 50, color: "#54278f" }, // Dark purple
];

/**
 * Cloud cover color scale: Transparent → White
 * Range: 0% to 100%
 */
export const CLOUD_COVER_COLORS: ColorStop[] = [
  { value: 0, color: "rgba(255,255,255,0)" },
  { value: 25, color: "rgba(255,255,255,0.2)" },
  { value: 50, color: "rgba(255,255,255,0.4)" },
  { value: 75, color: "rgba(255,255,255,0.6)" },
  { value: 100, color: "rgba(255,255,255,0.8)" },
];

/**
 * CAPE color scale: Green (stable) → Yellow → Red (unstable)
 * Range: 0 to 4000+ J/kg
 */
export const CAPE_COLORS: ColorStop[] = [
  { value: 0, color: "rgba(255,255,255,0)" }, // Transparent (stable)
  { value: 100, color: "#d9f0a3" }, // Pale green
  { value: 500, color: "#addd8e" }, // Light green
  { value: 1000, color: "#78c679" }, // Green
  { value: 1500, color: "#ffff00" }, // Yellow
  { value: 2000, color: "#feb24c" }, // Orange
  { value: 2500, color: "#fd8d3c" }, // Dark orange
  { value: 3000, color: "#f03b20" }, // Red
  { value: 4000, color: "#bd0026" }, // Dark red
];

/**
 * Fire Weather Index color scale: Green (low) → Red (extreme)
 * Range: 0 to 100+
 */
export const FIRE_WEATHER_COLORS: ColorStop[] = [
  { value: 0, color: "rgba(255,255,255,0)" }, // Transparent
  { value: 5, color: "#1a9850" }, // Green (low)
  { value: 15, color: "#91cf60" }, // Light green
  { value: 25, color: "#d9ef8b" }, // Yellow-green (moderate)
  { value: 35, color: "#fee08b" }, // Yellow
  { value: 50, color: "#fdae61" }, // Orange (high)
  { value: 65, color: "#f46d43" }, // Red-orange
  { value: 80, color: "#d73027" }, // Red (very high)
  { value: 100, color: "#a50026" }, // Dark red (extreme)
];

/**
 * Sea Surface Temperature (SST) color scale: Blue (cold) → Red (warm)
 * Range: -2°C (ice) to 35°C (tropical)
 */
export const SST_COLORS: ColorStop[] = [
  { value: -2, color: "#08306b" }, // Dark blue (ice/near-freezing)
  { value: 2, color: "#2171b5" }, // Blue (cold)
  { value: 6, color: "#4292c6" }, // Medium blue
  { value: 10, color: "#6baed6" }, // Light blue
  { value: 14, color: "#9ecae1" }, // Pale blue
  { value: 18, color: "#c7e9c0" }, // Pale green
  { value: 22, color: "#a1d99b" }, // Light green
  { value: 25, color: "#fdae61" }, // Orange
  { value: 28, color: "#f46d43" }, // Red-orange
  { value: 30, color: "#d73027" }, // Red
  { value: 35, color: "#a50026" }, // Dark red (tropical)
];

/**
 * PM2.5 Air Quality color scale: Green (good) → Red (hazardous)
 * Based on WHO guidelines (ug/m³)
 * All values visible - low PM2.5 is green (good air quality)
 */
export const PM25_COLORS: ColorStop[] = [
  { value: 0, color: "#22c55e" }, // Green (good)
  { value: 5, color: "#22c55e" }, // Green (good)
  { value: 10, color: "#84cc16" }, // Lime (moderate start)
  { value: 15, color: "#eab308" }, // Yellow
  { value: 25, color: "#f97316" }, // Orange (unhealthy for sensitive)
  { value: 50, color: "#ef4444" }, // Red (unhealthy)
  { value: 75, color: "#dc2626" }, // Dark red (very unhealthy)
  { value: 100, color: "#a855f7" }, // Purple
  { value: 150, color: "#7f1d1d" }, // Maroon (hazardous)
];

/**
 * UV Index color scale: WHO standard colors
 * Range: 0 (low) to 11+ (extreme)
 * All values visible - low UV is green (safe)
 */
export const UV_INDEX_COLORS: ColorStop[] = [
  { value: 0, color: "#4ade80" }, // Green (low)
  { value: 1, color: "#4ade80" }, // Green (low)
  { value: 2, color: "#22c55e" }, // Darker green
  { value: 3, color: "#facc15" }, // Yellow (moderate)
  { value: 5, color: "#eab308" }, // Darker yellow
  { value: 6, color: "#fb923c" }, // Orange (high)
  { value: 7, color: "#f97316" }, // Darker orange
  { value: 8, color: "#ef4444" }, // Red (very high)
  { value: 10, color: "#dc2626" }, // Darker red
  { value: 11, color: "#a855f7" }, // Purple (extreme)
  { value: 15, color: "#7c3aed" }, // Darker purple
];

/**
 * Interpolate a color from a color scale based on value.
 */
export function getColorForValue(
  value: number,
  colorScale: ColorStop[],
): string {
  // Handle out of range
  if (value <= colorScale[0].value) return colorScale[0].color;
  if (value >= colorScale[colorScale.length - 1].value) {
    return colorScale[colorScale.length - 1].color;
  }

  // Find surrounding stops
  let lower = colorScale[0];
  let upper = colorScale[colorScale.length - 1];

  for (let i = 0; i < colorScale.length - 1; i++) {
    if (value >= colorScale[i].value && value <= colorScale[i + 1].value) {
      lower = colorScale[i];
      upper = colorScale[i + 1];
      break;
    }
  }

  // Interpolate
  const t = (value - lower.value) / (upper.value - lower.value);
  return interpolateColor(lower.color, upper.color, t);
}

/**
 * Linear interpolation between two colors.
 * Supports both hex (#rrggbb) and rgba() formats.
 */
function interpolateColor(color1: string, color2: string, t: number): string {
  const c1 = parseColor(color1);
  const c2 = parseColor(color2);

  const r = Math.round(c1.r + (c2.r - c1.r) * t);
  const g = Math.round(c1.g + (c2.g - c1.g) * t);
  const b = Math.round(c1.b + (c2.b - c1.b) * t);
  const a = c1.a + (c2.a - c1.a) * t;

  if (a < 1) {
    return `rgba(${r},${g},${b},${a.toFixed(2)})`;
  }
  return `rgb(${r},${g},${b})`;
}

/**
 * Parse a color string into RGBA components.
 */
function parseColor(color: string): { r: number; g: number; b: number; a: number } {
  // Handle rgba format
  if (color.startsWith("rgba")) {
    const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+),?\s*([\d.]+)?\)/);
    if (match) {
      return {
        r: parseInt(match[1]),
        g: parseInt(match[2]),
        b: parseInt(match[3]),
        a: match[4] ? parseFloat(match[4]) : 1,
      };
    }
  }

  // Handle rgb format
  if (color.startsWith("rgb")) {
    const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (match) {
      return {
        r: parseInt(match[1]),
        g: parseInt(match[2]),
        b: parseInt(match[3]),
        a: 1,
      };
    }
  }

  // Handle hex format
  const hex = color.replace("#", "");
  return {
    r: parseInt(hex.substring(0, 2), 16),
    g: parseInt(hex.substring(2, 4), 16),
    b: parseInt(hex.substring(4, 6), 16),
    a: 1,
  };
}

// ============================================================================
// NOMADS URL Builder
// ============================================================================

/**
 * Build a NOMADS GFS filter URL for specific variables.
 *
 * @param variables - Array of variable configs (param name + level)
 * @returns Full URL to NOMADS filter service
 */
export function buildGfsUrl(
  variables: Array<{ param: string; level: string }>,
): string {
  const now = new Date();
  const utcHour = now.getUTCHours();
  const runHour = Math.floor((utcHour - 5) / 6) * 6; // 5h delay for availability
  const runHourStr = String(Math.max(0, runHour)).padStart(2, "0");

  const dateStr =
    now.getUTCFullYear().toString() +
    String(now.getUTCMonth() + 1).padStart(2, "0") +
    String(now.getUTCDate()).padStart(2, "0");

  // Build variable and level params
  const varParams = variables.map((v) => `var_${v.param}=on`).join("&");
  const levelParams = [...new Set(variables.map((v) => `lev_${v.level}=on`))].join(
    "&",
  );

  return `https://nomads.ncep.noaa.gov/cgi-bin/filter_gfs_0p25.pl?dir=%2Fgfs.${dateStr}%2F${runHourStr}%2Fatmos&file=gfs.t${runHourStr}z.pgrb2.0p25.f000&${levelParams}&${varParams}`;
}

// ============================================================================
// Grid Helpers
// ============================================================================

/**
 * Get value at a specific lat/lon from a GFS grid.
 * Uses bilinear interpolation for smooth values.
 */
export function getGridValueAt(
  grid: GfsGridData,
  lat: number,
  lon: number,
): number | null {
  const { header, data } = grid;

  // Normalize longitude to 0-360 range (GFS uses 0-360)
  let normalizedLon = lon;
  if (normalizedLon < 0) normalizedLon += 360;

  // Calculate grid indices
  const x = (normalizedLon - header.lo1) / header.dx;
  const y = (header.la1 - lat) / header.dy; // GFS starts from north

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

  // Interpolate
  const v0 = v00 * (1 - fx) + v10 * fx;
  const v1 = v01 * (1 - fx) + v11 * fx;

  return v0 * (1 - fy) + v1 * fy;
}
