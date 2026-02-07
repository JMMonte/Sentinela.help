import { NextResponse } from "next/server";
import { getFromRedis } from "@/lib/redis-cache";
import type { GfsGridData } from "@/lib/overlays/gfs-utils";

/**
 * GFS Cloud Cover API route.
 *
 * Reads cloud cover data from Redis (populated by background worker).
 */

export async function GET() {
  try {
    const data = await getFromRedis<GfsGridData>("kaos:gfs:cloud-cover");

    if (!data) {
      return NextResponse.json(
        { error: "Cloud cover data unavailable - worker may not be running" },
        { status: 503 }
      );
    }

    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-cache" },
    });
  } catch (error) {
    console.error("[gfs/cloud-cover] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch cloud cover data" },
      { status: 500 }
    );
  }
}
