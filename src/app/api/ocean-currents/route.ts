import { NextResponse } from "next/server";
import { getFromRedis } from "@/lib/redis-cache";

/**
 * Ocean Currents velocity grid API route.
 *
 * Reads ocean current data from Redis (populated by background worker).
 */

type VelocityData = unknown[];

export async function GET() {
  try {
    const data = await getFromRedis<VelocityData>("kaos:ocean-currents:global");

    if (!data) {
      return NextResponse.json(
        { error: "Ocean currents data unavailable - worker may not be running" },
        { status: 503 }
      );
    }

    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-cache" },
    });
  } catch (error) {
    console.error("[ocean-currents] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch ocean currents data" },
      { status: 500 }
    );
  }
}
