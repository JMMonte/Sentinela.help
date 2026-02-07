import { NextResponse } from "next/server";
import { getFromRedis } from "@/lib/redis-cache";

/**
 * NOAA Total Electron Content (TEC) API route.
 *
 * Reads TEC data from Redis (populated by background worker).
 */

export type TecData = {
  grid: number[][];
  latMin: number;
  latMax: number;
  lonMin: number;
  lonMax: number;
  latStep: number;
  lonStep: number;
  timestamp: string;
  unit: string;
};

export async function GET() {
  try {
    const data = await getFromRedis<TecData>("kaos:tec:global");

    if (!data) {
      return NextResponse.json(
        { error: "TEC data unavailable - worker may not be running" },
        { status: 503 }
      );
    }

    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-cache" },
    });
  } catch (error) {
    console.error("[tec] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch TEC data" },
      { status: 500 }
    );
  }
}
