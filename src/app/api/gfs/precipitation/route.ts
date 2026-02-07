import { NextResponse } from "next/server";
import { getFromRedis } from "@/lib/redis-cache";
import type { GfsGridData } from "@/lib/overlays/gfs-utils";

/**
 * GFS Precipitation API route.
 *
 * Reads precipitation data from Redis (populated by background worker).
 */

export async function GET() {
  try {
    const data = await getFromRedis<GfsGridData>("kaos:gfs:precipitation");

    if (!data) {
      return NextResponse.json(
        { error: "Precipitation data unavailable - worker may not be running" },
        { status: 503 }
      );
    }

    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-cache" },
    });
  } catch (error) {
    console.error("[gfs/precipitation] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch precipitation data" },
      { status: 500 }
    );
  }
}
