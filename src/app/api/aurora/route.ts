import { NextResponse } from "next/server";
import { getFromRedis } from "@/lib/redis-cache";

/**
 * GET /api/aurora
 *
 * Returns aurora forecast data from Redis cache (populated by worker).
 */

export type AuroraRawData = {
  "Observation Time": string;
  "Forecast Time": string;
  coordinates: [number, number, number][]; // [lon, lat, probability]
};

export async function GET() {
  try {
    const data = await getFromRedis<AuroraRawData | AuroraRawData[]>("kaos:aurora:latest");

    if (!data) {
      return NextResponse.json(
        { error: "Aurora data unavailable - worker may not be running" },
        { status: 503 }
      );
    }

    // Generic collector wraps single objects in array - unwrap if needed
    const result = Array.isArray(data) ? data[0] : data;

    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-cache" },
    });
  } catch (error) {
    console.error("[aurora] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch aurora data" },
      { status: 500 }
    );
  }
}
