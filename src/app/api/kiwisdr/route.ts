import { NextResponse } from "next/server";
import { getFromRedis } from "@/lib/redis-cache";

/**
 * KiwiSDR WebSDR Station Network API route.
 *
 * Reads KiwiSDR data from Redis (populated by background worker).
 */

export type KiwiStation = {
  name: string;
  url: string;
  latitude: number;
  longitude: number;
  users: number;
  usersMax: number;
  antenna: string | null;
  location: string | null;
  snr: number | null;
  offline: boolean;
};

export async function GET() {
  try {
    const data = await getFromRedis<KiwiStation[]>("kaos:kiwisdr:stations");

    if (!data) {
      return NextResponse.json(
        { error: "KiwiSDR data unavailable - worker may not be running" },
        { status: 503 }
      );
    }

    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-cache" },
    });
  } catch (error) {
    console.error("[kiwisdr] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch KiwiSDR stations" },
      { status: 500 }
    );
  }
}
