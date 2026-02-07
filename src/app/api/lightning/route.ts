import { NextResponse } from "next/server";
import { getFromRedis } from "@/lib/redis-cache";

/**
 * Blitzortung Lightning Detection Network API route.
 *
 * Returns lightning strike data from Redis cache (populated by worker).
 * The worker maintains a WebSocket connection for real-time data.
 *
 * Note: Blitzortung data is for non-commercial use only.
 */

export type LightningStrike = {
  latitude: number;
  longitude: number;
  time: number; // milliseconds since epoch
};

export async function GET() {
  try {
    const data = await getFromRedis<LightningStrike[]>("kaos:lightning:global");

    if (!data) {
      return NextResponse.json(
        { error: "Lightning data unavailable - worker may not be running" },
        { status: 503 }
      );
    }

    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-cache" },
    });
  } catch (error) {
    console.error("[lightning] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch lightning data" },
      { status: 500 }
    );
  }
}
