import { NextResponse } from "next/server";
import { getFromRedis } from "@/lib/redis-cache";

/**
 * GET /api/waves
 *
 * Reads wave data from Redis (populated by background worker).
 */

export type WaveGridData = {
  header: {
    nx: number;
    ny: number;
    lo1: number;
    la1: number;
    dx: number;
    dy: number;
  };
  heightData: number[];
  periodData: number[];
  directionData: number[];
  time: string;
  unit: string;
  name: string;
};

export async function GET() {
  try {
    const data = await getFromRedis<WaveGridData>("kaos:waves:global");

    if (!data) {
      return NextResponse.json(
        { error: "Wave data unavailable - worker may not be running" },
        { status: 503 }
      );
    }

    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-cache" },
    });
  } catch (error) {
    console.error("[waves] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch wave data" },
      { status: 500 }
    );
  }
}
