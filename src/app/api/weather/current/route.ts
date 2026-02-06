import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { cachedFetch } from "@/lib/server-cache";

// Cache current weather for 5 minutes
const CACHE_TTL = 5 * 60 * 1000;

// Rate limiting: max 60 requests per minute (OWM free tier)
// Using server-side cache reduces actual API calls significantly

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
    const cacheKey = `weather:current:${roundedLat}:${roundedLon}`;

    const data = await cachedFetch(cacheKey, CACHE_TTL, async () => {
      const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(url, {
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`OWM API error: ${response.status}`);
      }

      return response.json();
    });

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, max-age=300, stale-while-revalidate=120",
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
