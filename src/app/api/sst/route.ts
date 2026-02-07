import { NextResponse } from "next/server";
import { getFromRedis } from "@/lib/redis-cache";
import type { GfsGridData } from "@/lib/overlays/gfs-utils";

/**
 * Sea Surface Temperature API route.
 *
 * Reads SST data from Redis (populated by background worker).
 */

export async function GET() {
  try {
    const data = await getFromRedis<GfsGridData>("kaos:sst:global");

    if (!data) {
      return NextResponse.json(
        { error: "SST data unavailable - worker may not be running" },
        { status: 503 }
      );
    }

    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-cache" },
    });
  } catch (error) {
    console.error("[sst] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch SST data" },
      { status: 500 }
    );
  }
}
