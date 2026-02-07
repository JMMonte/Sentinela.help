import { NextResponse } from "next/server";
import { cacheAside } from "@/lib/redis-cache";
import { env } from "@/lib/env";
import type { GfsGridData, GfsGridHeader } from "@/lib/overlays/gfs-utils";

/**
 * Air Quality Grid API route.
 *
 * Reads AQI grid from Redis (or generates and caches on-demand).
 * Uses WAQI station data with IDW interpolation.
 */

const CACHE_TTL_SECONDS = 900; // 15 minutes
const FETCH_TIMEOUT = 30000;

// Grid configuration - uses 0-359 longitude for proper tiling (like GFS)
// 360 points from 0 to 359 (360° = 0° so no duplicate at date line)
const GRID_CONFIG = {
  latMin: -60,
  latMax: 90,
  lonMin: 0,
  lonMax: 359,
  step: 1.0, // 1° resolution (360x151 = 54360 points)
};

type WaqiStation = {
  lat: number;
  lon: number;
  uid: number;
  aqi: string;
  station: { name: string; time: string };
};

type WaqiBoundsResponse = {
  status: string;
  data: WaqiStation[];
};

/**
 * Convert longitude from -180..180 to 0..360
 */
function lon180to360(lon: number): number {
  return lon < 0 ? lon + 360 : lon;
}

/**
 * Calculate longitude distance accounting for wrap-around
 */
function lonDistance(lon1: number, lon2: number): number {
  let diff = Math.abs(lon1 - lon2);
  if (diff > 180) diff = 360 - diff;
  return diff;
}

/**
 * Inverse Distance Weighting interpolation.
 * Estimates value at a point based on nearby known values.
 * Handles 0-360 longitude format with wrap-around at date line.
 */
function idwInterpolate(
  lat: number,
  lon: number, // 0-360 format
  stations: Array<{ lat: number; lon: number; aqi: number }>, // stations in 0-360 format
  power: number = 2,
  maxDistance: number = 5, // degrees (~500km)
  minStations: number = 3
): number | null {
  // Find nearby stations within maxDistance
  const nearby: Array<{ aqi: number; dist: number }> = [];

  for (const s of stations) {
    const dLat = lat - s.lat;
    const dLon = lonDistance(lon, s.lon);
    const dist = Math.sqrt(dLat * dLat + dLon * dLon);

    if (dist <= maxDistance) {
      nearby.push({ aqi: s.aqi, dist: Math.max(dist, 0.01) }); // Avoid division by zero
    }
  }

  if (nearby.length < minStations) {
    return null; // Not enough data for reliable interpolation
  }

  // IDW formula: sum(value_i / dist_i^p) / sum(1 / dist_i^p)
  let weightedSum = 0;
  let weightSum = 0;

  for (const { aqi, dist } of nearby) {
    const weight = 1 / Math.pow(dist, power);
    weightedSum += aqi * weight;
    weightSum += weight;
  }

  return weightedSum / weightSum;
}

async function generateAqiGrid(apiKey: string): Promise<GfsGridData> {
  // Fetch global station data
  const url = `https://api.waqi.info/v2/map/bounds?latlng=-60,-180,70,180&networks=all&token=${apiKey}`;
  console.log("[air-quality-grid] Generating AQI grid from WAQI");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  const response = await fetch(url, {
    signal: controller.signal,
    cache: "no-store",
  });
  clearTimeout(timeout);

  if (!response.ok) {
    throw new Error(`WAQI API error: ${response.status}`);
  }

  const result: WaqiBoundsResponse = await response.json();
  if (result.status !== "ok") {
    throw new Error("WAQI API returned error status");
  }

  // Parse stations with valid AQI, convert to 0-360 longitude
  const stations = result.data
    .filter((s) => s.aqi !== "-" && !isNaN(parseInt(s.aqi)))
    .map((s) => ({
      lat: s.lat,
      lon: lon180to360(s.lon),
      aqi: parseInt(s.aqi),
    }));

  console.log(`[air-quality-grid] Got ${stations.length} stations`);

  // Build interpolated grid
  const ny = Math.floor((GRID_CONFIG.latMax - GRID_CONFIG.latMin) / GRID_CONFIG.step) + 1;
  const nx = Math.floor((GRID_CONFIG.lonMax - GRID_CONFIG.lonMin) / GRID_CONFIG.step) + 1;
  const data = new Array<number>(ny * nx).fill(NaN);

  for (let yi = 0; yi < ny; yi++) {
    const lat = GRID_CONFIG.latMax - yi * GRID_CONFIG.step;
    for (let xi = 0; xi < nx; xi++) {
      const lon = GRID_CONFIG.lonMin + xi * GRID_CONFIG.step;
      const idx = yi * nx + xi;

      const value = idwInterpolate(lat, lon, stations);
      if (value !== null) {
        data[idx] = value;
      }
    }
  }

  const validCount = data.filter((v) => !isNaN(v)).length;
  console.log(`[air-quality-grid] Interpolated ${validCount}/${data.length} grid points`);

  const header: GfsGridHeader = {
    nx,
    ny,
    lo1: GRID_CONFIG.lonMin,
    la1: GRID_CONFIG.latMax,
    dx: GRID_CONFIG.step,
    dy: GRID_CONFIG.step,
  };

  return {
    header,
    data,
    unit: "AQI",
    name: "Air Quality Index",
  };
}

export async function GET() {
  const apiKey = env.WAQI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "WAQI API key not configured" },
      { status: 503 }
    );
  }

  try {
    const result = await cacheAside<GfsGridData>(
      "kaos:air-quality:global",
      () => generateAqiGrid(apiKey),
      CACHE_TTL_SECONDS
    );

    return NextResponse.json(result.data, {
      headers: {
        "Cache-Control": "no-cache",
        "X-Data-Source": result.source,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[air-quality-grid] Error:", message);
    return NextResponse.json(
      { error: `Failed to generate air quality grid: ${message}` },
      { status: 500 }
    );
  }
}
