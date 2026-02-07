import { NextResponse } from "next/server";
import { cacheAside } from "@/lib/redis-cache";
import { parseGribData, extractGfsField } from "@/lib/overlays/gfs-parse";
import {
  buildGfsUrl,
  kelvinToCelsius,
  type GfsGridData,
} from "@/lib/overlays/gfs-utils";

/**
 * Fire Weather Index API route.
 *
 * Combines temperature and humidity from GFS to calculate fire risk.
 * Uses cache-aside pattern for Redis caching.
 *
 * Simplified FWI calculation:
 * - Base: temperature contribution (higher = more risk)
 * - Modifier: humidity reduction (lower humidity = more risk)
 * - Scale: 0-100+ where higher = more dangerous
 */

const CACHE_TTL_SECONDS = 3600; // 1 hour

// GFS Parameters
const TEMP_CATEGORY = 0;
const TEMP_PARAMETER = 0;
const RH_CATEGORY = 1;
const RH_PARAMETER = 1;

/**
 * Calculate simplified Fire Weather Index from temperature and humidity.
 *
 * Formula: FWI = max(0, (T - 10) * (1 - RH/100) * 2.5)
 * - Temperatures below 10°C contribute nothing
 * - Low humidity amplifies the effect
 * - Scaled to roughly 0-100 range
 */
function calculateFWI(tempC: number, humidity: number): number {
  // No fire risk below 10°C
  if (tempC < 10) return 0;

  // Temperature contribution (0-35 range mapped to base risk)
  const tempFactor = Math.min((tempC - 10) / 35, 1);

  // Humidity modifier (0% humidity = 1.0, 100% = 0.0)
  const humidityFactor = 1 - Math.min(humidity, 100) / 100;

  // Combine factors and scale to 0-100
  const fwi = tempFactor * humidityFactor * 100;

  return Math.max(0, Math.min(fwi, 100));
}

async function fetchFireWeatherData(): Promise<GfsGridData> {
  // Fetch both temperature and humidity in one request
  const url = buildGfsUrl([
    { param: "TMP", level: "2_m_above_ground" },
    { param: "RH", level: "2_m_above_ground" },
  ]);
  console.log("[gfs/fire-weather] Fetching from GFS");

  const response = await fetch(url, {
    cache: "no-store",
    headers: { "Accept-Encoding": "gzip" },
  });

  if (!response.ok) {
    throw new Error(`GFS fetch failed: ${response.status}`);
  }

  const buffer = await response.arrayBuffer();
  const messages = await parseGribData(Buffer.from(buffer));

  const tempField = extractGfsField(messages, TEMP_CATEGORY, TEMP_PARAMETER);
  const rhField = extractGfsField(messages, RH_CATEGORY, RH_PARAMETER);

  if (!tempField || !rhField) {
    throw new Error("Temperature or humidity field not found");
  }

  // Get grid definition from temperature field
  const gridDef = tempField.grid?.definition || tempField.grid;

  // Calculate FWI for each grid point
  const fwiData: number[] = [];
  for (let i = 0; i < tempField.data.length; i++) {
    const tempK = tempField.data[i];
    const rh = rhField.data[i];
    const tempC = kelvinToCelsius(tempK);
    fwiData.push(calculateFWI(tempC, rh));
  }

  return {
    header: {
      nx: gridDef.ni,
      ny: gridDef.nj,
      lo1: gridDef.lo1,
      la1: gridDef.la1,
      dx: gridDef.di,
      dy: gridDef.dj,
    },
    data: fwiData,
    unit: "index",
    name: "Fire Weather Index",
  };
}

export async function GET() {
  try {
    const result = await cacheAside<GfsGridData>(
      "kaos:gfs:fire-weather",
      fetchFireWeatherData,
      CACHE_TTL_SECONDS
    );

    return NextResponse.json(result.data, {
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "X-Data-Source": result.source,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[gfs/fire-weather] Error:", message);
    return NextResponse.json(
      { error: `Failed to fetch fire weather data: ${message}` },
      { status: 500 },
    );
  }
}
