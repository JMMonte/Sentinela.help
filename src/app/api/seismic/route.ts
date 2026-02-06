import { NextResponse, type NextRequest } from "next/server";
import { cachedFetch } from "@/lib/server-cache";
import {
  fetchWithTimeout,
  validateInt,
  validateFloat,
  getErrorMessage,
  getErrorStatus,
} from "@/lib/api-utils";

/**
 * GET /api/seismic?hours=24&minMag=2.5
 *
 * Proxies USGS earthquake feeds with server-side caching.
 * Cache TTL: 2 min (USGS updates every ~5 min).
 */

const CACHE_TTL = 2 * 60 * 1000;
const FETCH_TIMEOUT = 15000; // 15 seconds

const USGS_FEEDS: Record<string, string> = {
  day: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson",
  week: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.geojson",
  month: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_month.geojson",
};

export async function GET(request: NextRequest) {
  // Validate input parameters
  const hoursResult = validateInt(
    request.nextUrl.searchParams.get("hours"),
    24,
    1,
    744
  );
  if (!hoursResult.success) {
    return NextResponse.json({ error: hoursResult.error }, { status: 400 });
  }
  const hours = hoursResult.value;

  const minMagResult = validateFloat(
    request.nextUrl.searchParams.get("minMag"),
    2.5,
    0,
    10
  );
  if (!minMagResult.success) {
    return NextResponse.json({ error: minMagResult.error }, { status: 400 });
  }
  const minMag = minMagResult.value;

  const feedKey = hours <= 24 ? "day" : hours <= 168 ? "week" : "month";

  try {
    const raw = await cachedFetch(
      `seismic:${feedKey}`,
      CACHE_TTL,
      async () => {
        const res = await fetchWithTimeout(
          USGS_FEEDS[feedKey],
          { cache: "no-store" },
          FETCH_TIMEOUT
        );
        if (!res.ok) throw new Error(`USGS error: ${res.status}`);
        return res.json();
      },
    );

    // Filter by magnitude and time on every request (user-specific params)
    const cutoff = Date.now() - hours * 60 * 60 * 1000;
    const features = (raw as { features: { properties: { mag: number; time: number } }[] })
      .features.filter(
        (f) => f.properties.mag >= minMag && f.properties.time >= cutoff,
      );

    return NextResponse.json(
      { ...raw, features },
      { headers: { "Cache-Control": "public, max-age=120, stale-while-revalidate=60" } },
    );
  } catch (error) {
    const message = getErrorMessage(error);
    const status = getErrorStatus(error);
    console.error("[seismic] proxy error:", message);
    return NextResponse.json({ error: "Failed to fetch earthquake data" }, { status });
  }
}
