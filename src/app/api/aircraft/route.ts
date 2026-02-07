import { NextResponse } from "next/server";
import { getFromRedis } from "@/lib/redis-cache";

/**
 * GET /api/aircraft
 *
 * Returns global aircraft positions from Redis cache (populated by worker).
 * Data is collected from OpenSky Network ADS-B receivers worldwide.
 */

export type Aircraft = {
  icao24: string;
  callsign: string | null;
  latitude: number;
  longitude: number;
  altitude: number | null;
  velocity: number | null;
  heading: number | null;
  verticalRate: number | null;
  onGround: boolean;
  lastContact: number;
  originCountry: string;
};

export async function GET() {
  try {
    const data = await getFromRedis<Aircraft[]>("kaos:aircraft:global");

    if (!data) {
      return NextResponse.json(
        { error: "Aircraft data unavailable - worker may not be running" },
        { status: 503 }
      );
    }

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("[aircraft] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch aircraft data" },
      { status: 500 }
    );
  }
}
