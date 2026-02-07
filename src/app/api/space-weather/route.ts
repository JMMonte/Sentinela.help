import { NextResponse } from "next/server";
import { getFromRedis } from "@/lib/redis-cache";

/**
 * NOAA Space Weather Prediction Center (SWPC) API route.
 *
 * Returns space weather data from Redis cache (populated by worker).
 */

export type SpaceWeatherData = {
  kpIndex: number;
  kpDescription: string;
  solarFlux: number | null;
  xrayFlux: string | null;
  timestamp: string;
};

export async function GET() {
  try {
    const data = await getFromRedis<SpaceWeatherData>("kaos:space-weather:current");

    if (!data) {
      return NextResponse.json(
        { error: "Space weather data unavailable - worker may not be running" },
        { status: 503 }
      );
    }

    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-cache" },
    });
  } catch (error) {
    console.error("[space-weather] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch space weather data" },
      { status: 500 }
    );
  }
}
