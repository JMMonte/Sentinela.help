import type { GfsGridData, GfsGridHeader, ColorStop } from "./gfs-utils";

/**
 * Aurora Borealis/Australis overlay API client.
 *
 * Data source: NOAA SWPC OVATION model
 * https://services.swpc.noaa.gov/json/ovation_aurora_latest.json
 *
 * The OVATION model provides aurora probability forecasts on a 360x181 grid.
 * Coordinates in the API response are triplets: [longitude, latitude, probability]
 */

// ============================================================================
// Types
// ============================================================================

export type AuroraRawData = {
  "Observation Time": string;
  "Forecast Time": string;
  coordinates: [number, number, number][]; // [lon, lat, probability]
};

export type AuroraData = {
  observationTime: string;
  forecastTime: string;
  grid: GfsGridData;
};

// ============================================================================
// Color Scale
// ============================================================================

/**
 * Aurora probability color scale.
 * Uses dark/translucent colors to represent the night sky effect.
 * Range: 0% to 100%
 */
export const AURORA_COLORS: ColorStop[] = [
  { value: 0, color: "rgba(0, 0, 0, 0)" }, // Transparent (no aurora)
  { value: 5, color: "rgba(0, 0, 0, 0)" }, // Still transparent
  { value: 6, color: "rgba(0, 80, 40, 0.3)" }, // Dim green start
  { value: 20, color: "rgba(0, 180, 80, 0.5)" }, // Dim green
  { value: 40, color: "rgba(50, 255, 100, 0.6)" }, // Bright green
  { value: 60, color: "rgba(150, 255, 80, 0.7)" }, // Yellow-green
  { value: 80, color: "rgba(255, 255, 100, 0.8)" }, // Yellow
  { value: 100, color: "rgba(255, 255, 255, 0.9)" }, // White/bright
];

// ============================================================================
// API Functions
// ============================================================================

/**
 * Fetch aurora forecast data from the server proxy.
 * Returns a grid-formatted data structure compatible with GfsGridOverlay.
 */
export async function fetchAuroraData(): Promise<AuroraData> {
  const response = await fetch("/api/aurora");

  if (!response.ok) {
    throw new Error(`Failed to fetch aurora data: ${response.status}`);
  }

  const raw: AuroraRawData = await response.json();

  // Convert raw triplet format to grid format
  // The OVATION data has 181 latitudes (-90 to 90) and 360 longitudes (0 to 359)
  // Coordinates come as [lon, lat, probability] triplets in Fortran order
  const grid = convertToGrid(raw.coordinates);

  return {
    observationTime: raw["Observation Time"],
    forecastTime: raw["Forecast Time"],
    grid,
  };
}

/**
 * Convert OVATION triplet coordinates to a 2D grid format.
 *
 * The data comes as an array of [lon, lat, probability] triplets.
 * We need to reshape this into a regular grid format.
 *
 * Grid layout:
 * - 181 latitudes from -90 to 90 (south to north, dy = 1)
 * - 360 longitudes from 0 to 359 (west to east, dx = 1)
 */
function convertToGrid(coordinates: [number, number, number][]): GfsGridData {
  const nx = 360; // Longitudes
  const ny = 181; // Latitudes

  // Initialize grid with zeros
  const data = new Array<number>(nx * ny).fill(0);

  // Fill grid from triplets
  // The OVATION data uses longitude 0-359 and latitude -90 to 90
  for (const [lon, lat, probability] of coordinates) {
    // Longitude index: 0-359 maps directly
    const xi = Math.round(lon) % 360;

    // Latitude index: -90 to 90 maps to 0 to 180
    // For our grid format, we want north (90) at index 0
    const yi = Math.round(90 - lat);

    if (xi >= 0 && xi < nx && yi >= 0 && yi < ny) {
      data[yi * nx + xi] = probability;
    }
  }

  const header: GfsGridHeader = {
    nx,
    ny,
    lo1: 0, // Starting longitude (0 degrees)
    la1: 90, // Starting latitude (90 degrees = north pole)
    dx: 1, // 1 degree longitude spacing
    dy: 1, // 1 degree latitude spacing
  };

  return {
    header,
    data,
    unit: "%",
    name: "Aurora Probability",
  };
}

/**
 * Get aurora intensity label based on probability percentage.
 */
export function getAuroraIntensityLabel(probability: number): string {
  if (probability < 5) return "None";
  if (probability < 20) return "Dim";
  if (probability < 40) return "Moderate";
  if (probability < 60) return "Bright";
  if (probability < 80) return "Very Bright";
  return "Intense";
}

/**
 * Check if a latitude is in a polar region (high aurora likelihood zone).
 * Aurora is typically visible above/below 60-65 degrees latitude.
 */
export function isInAuroraZone(lat: number): boolean {
  const absLat = Math.abs(lat);
  return absLat >= 55;
}

/**
 * Get the aurora type name based on latitude.
 */
export function getAuroraTypeName(lat: number): string {
  if (lat >= 0) {
    return "Aurora Borealis (Northern Lights)";
  }
  return "Aurora Australis (Southern Lights)";
}
