import { NextResponse } from "next/server";
import { getFromRedis } from "@/lib/redis-cache";
import type { GfsGridData } from "@/lib/overlays/gfs-utils";

/**
 * GFS CAPE (Convective Available Potential Energy) API route.
 *
 * Reads CAPE data from Redis (populated by background worker).
 */

export async function GET() {
  try {
    const data = await getFromRedis<GfsGridData>("kaos:gfs:cape");

    if (!data) {
      return NextResponse.json(
        { error: "CAPE data unavailable - worker may not be running" },
        { status: 503 }
      );
    }

    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-cache" },
    });
  } catch (error) {
    console.error("[gfs/cape] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch CAPE data" },
      { status: 500 }
    );
  }
}
