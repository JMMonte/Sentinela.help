import { NextResponse } from "next/server";
import { getFromRedis } from "@/lib/redis-cache";
import type { GfsGridData } from "@/lib/overlays/gfs-utils";

/**
 * GFS UV Index API route.
 *
 * Reads UV Index data from Redis (populated by background worker).
 */

export async function GET() {
  try {
    const data = await getFromRedis<GfsGridData>("kaos:gfs:uv-index");

    if (!data) {
      return NextResponse.json(
        { error: "UV Index data unavailable - worker may not be running" },
        { status: 503 }
      );
    }

    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-cache" },
    });
  } catch (error) {
    console.error("[gfs/uv-index] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch UV index data" },
      { status: 500 }
    );
  }
}
