import { NextResponse } from "next/server";
import { getFromRedis } from "@/lib/redis-cache";
import type { GfsGridData } from "@/lib/overlays/gfs-utils";

/**
 * GFS Relative Humidity API route.
 *
 * Reads humidity data from Redis (populated by background worker).
 */

export async function GET() {
  try {
    const data = await getFromRedis<GfsGridData>("kaos:gfs:humidity");

    if (!data) {
      return NextResponse.json(
        { error: "Humidity data unavailable - worker may not be running" },
        { status: 503 }
      );
    }

    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-cache" },
    });
  } catch (error) {
    console.error("[gfs/humidity] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch humidity data" },
      { status: 500 }
    );
  }
}
