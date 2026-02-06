import { NextResponse } from "next/server";
import { cachedFetch } from "@/lib/server-cache";

/**
 * GET /api/rainfall
 *
 * Proxies IPMA stations + observations with server-side caching.
 * Cache TTL: 5 min for observations, 24h for stations (static data).
 */

const STATIONS_TTL = 24 * 60 * 60 * 1000;
const OBSERVATIONS_TTL = 5 * 60 * 1000;

const STATIONS_URL = "https://api.ipma.pt/open-data/observation/meteorology/stations/stations.json";
const OBSERVATIONS_URL = "https://api.ipma.pt/open-data/observation/meteorology/stations/observations.json";

export async function GET() {
  try {
    const [stations, observations] = await Promise.all([
      cachedFetch(
        "rainfall:stations",
        STATIONS_TTL,
        async () => {
          const res = await fetch(STATIONS_URL, { cache: "no-store" });
          if (!res.ok) throw new Error(`IPMA stations error: ${res.status}`);
          return res.json();
        },
      ),
      cachedFetch(
        "rainfall:observations",
        OBSERVATIONS_TTL,
        async () => {
          const res = await fetch(OBSERVATIONS_URL, { cache: "no-store" });
          if (!res.ok) throw new Error(`IPMA observations error: ${res.status}`);
          return res.json();
        },
      ),
    ]);

    return NextResponse.json(
      { stations, observations },
      { headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=120" } },
    );
  } catch (error) {
    console.error("[rainfall] proxy error:", error);
    return NextResponse.json({ error: "Failed to fetch rainfall data" }, { status: 502 });
  }
}
