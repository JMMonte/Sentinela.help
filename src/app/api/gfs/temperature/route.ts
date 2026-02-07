import { NextResponse } from "next/server";
import { getFromRedis } from "@/lib/redis-cache";
import type { GfsGridData } from "@/lib/overlays/gfs-utils";

/**
 * GFS Temperature API route.
 *
 * Reads temperature data from Redis (populated by background worker).
 */

export async function GET() {
  try {
    const data = await getFromRedis<GfsGridData>("kaos:gfs:temperature");

    if (!data) {
      return NextResponse.json(
        { error: "Temperature data unavailable - worker may not be running" },
        { status: 503 }
      );
    }

    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-cache" },
    });
  } catch (error) {
    console.error("[gfs/temperature] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch temperature data" },
      { status: 500 }
    );
  }
}
