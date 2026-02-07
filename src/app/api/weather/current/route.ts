import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { cacheAside } from "@/lib/redis-cache";

/**
 * GET /api/weather/current
 *
 * Fetches current weather from OpenWeatherMap with Redis caching.
 * Uses cache-aside pattern: checks Redis first, falls back to OWM API.
 * Coordinates are rounded to ~11km precision to improve cache hit rate.
 *
 * Cache TTL: 5 minutes in Redis
 */

const CACHE_TTL_SECONDS = 300; // 5 minutes

export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const latParam = searchParams.get("lat");
  const lonParam = searchParams.get("lon");

  // Validate coordinates
  if (!latParam || !lonParam) {
    return NextResponse.json(
      { error: "Missing lat/lon parameters" },
      { status: 400 }
    );
  }

  const lat = parseFloat(latParam);
  const lon = parseFloat(lonParam);

  if (isNaN(lat) || isNaN(lon)) {
    return NextResponse.json(
      { error: "Invalid lat/lon values" },
      { status: 400 }
    );
  }

  // Validate coordinate ranges
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return NextResponse.json(
      { error: "Coordinates out of range" },
      { status: 400 }
    );
  }

  // Check API key is configured
  const apiKey = env.OPENWEATHERMAP_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Weather service not configured" },
      { status: 503 }
    );
  }

  try {
    // Round coordinates to reduce cache key variations (1 decimal = ~11km precision)
    const roundedLat = Math.round(lat * 10) / 10;
    const roundedLon = Math.round(lon * 10) / 10;
    const cacheKey = `kaos:weather:current:${roundedLat}:${roundedLon}`;

    const result = await cacheAside(
      cacheKey,
      async () => {
        const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        try {
          const response = await fetch(url, {
            signal: controller.signal,
          });

          clearTimeout(timeout);

          if (!response.ok) {
            throw new Error(`OWM API error: ${response.status}`);
          }

          return response.json();
        } finally {
          clearTimeout(timeout);
        }
      },
      CACHE_TTL_SECONDS
    );

    return NextResponse.json(result.data, {
      headers: {
        "Cache-Control": "public, max-age=300, stale-while-revalidate=120",
        "X-Data-Source": result.source,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (message.includes("aborted")) {
      console.error("[weather/current] Request timeout");
      return NextResponse.json(
        { error: "Request timeout" },
        { status: 504 }
      );
    }

    console.error("[weather/current] Error:", message);
    return NextResponse.json(
      { error: "Failed to fetch weather data" },
      { status: 502 }
    );
  }
}
