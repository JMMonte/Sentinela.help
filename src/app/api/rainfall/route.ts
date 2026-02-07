import { NextResponse } from "next/server";
import { cacheAside } from "@/lib/redis-cache";

/**
 * GET /api/rainfall
 *
 * Reads IPMA rainfall data from Redis (or fetches and caches on-demand).
 * Portugal-specific weather station observations.
 */

const STATIONS_TTL_SECONDS = 86400; // 24 hours
const OBSERVATIONS_TTL_SECONDS = 300; // 5 minutes

const STATIONS_URL = "https://api.ipma.pt/open-data/observation/meteorology/stations/stations.json";
const OBSERVATIONS_URL = "https://api.ipma.pt/open-data/observation/meteorology/stations/observations.json";

type StationsData = unknown;
type ObservationsData = unknown;

export async function GET() {
  try {
    const [stationsResult, observationsResult] = await Promise.all([
      cacheAside<StationsData>(
        "kaos:rainfall:stations",
        async () => {
          const res = await fetch(STATIONS_URL, { cache: "no-store" });
          if (!res.ok) throw new Error(`IPMA stations error: ${res.status}`);
          return res.json();
        },
        STATIONS_TTL_SECONDS
      ),
      cacheAside<ObservationsData>(
        "kaos:rainfall:observations",
        async () => {
          const res = await fetch(OBSERVATIONS_URL, { cache: "no-store" });
          if (!res.ok) throw new Error(`IPMA observations error: ${res.status}`);
          return res.json();
        },
        OBSERVATIONS_TTL_SECONDS
      ),
    ]);

    return NextResponse.json(
      { stations: stationsResult.data, observations: observationsResult.data },
      {
        headers: {
          "Cache-Control": "public, max-age=300, stale-while-revalidate=120",
          "X-Data-Source": observationsResult.source,
        },
      }
    );
  } catch (error) {
    console.error("[rainfall] proxy error:", error);
    return NextResponse.json({ error: "Failed to fetch rainfall data" }, { status: 502 });
  }
}
