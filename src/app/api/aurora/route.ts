import { NextResponse } from "next/server";
import { cachedFetch } from "@/lib/server-cache";
import {
  fetchWithTimeout,
  getErrorMessage,
  getErrorStatus,
} from "@/lib/api-utils";

/**
 * GET /api/aurora
 *
 * Proxies NOAA SWPC OVATION aurora forecast data with server-side caching.
 * Cache TTL: 5 min (NOAA updates every ~5 min).
 *
 * Data format: 360x181 grid of aurora probability values.
 * Coordinates array contains triplets: [longitude, latitude, probability]
 */

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const FETCH_TIMEOUT = 20000; // 20 seconds

const AURORA_URL = "https://services.swpc.noaa.gov/json/ovation_aurora_latest.json";

export type AuroraRawData = {
  "Observation Time": string;
  "Forecast Time": string;
  coordinates: [number, number, number][]; // [lon, lat, probability]
};

export async function GET() {
  try {
    const raw = await cachedFetch<AuroraRawData>(
      "aurora:latest",
      CACHE_TTL,
      async () => {
        const res = await fetchWithTimeout(
          AURORA_URL,
          { cache: "no-store" },
          FETCH_TIMEOUT
        );
        if (!res.ok) throw new Error(`NOAA SWPC error: ${res.status}`);
        return res.json() as Promise<AuroraRawData>;
      },
    );

    return NextResponse.json(raw, {
      headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=60" },
    });
  } catch (error) {
    const message = getErrorMessage(error);
    const status = getErrorStatus(error);
    console.error("[aurora] proxy error:", message);
    return NextResponse.json({ error: "Failed to fetch aurora data" }, { status });
  }
}
