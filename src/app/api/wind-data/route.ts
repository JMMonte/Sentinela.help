import { NextResponse } from "next/server";
import { getFromRedis } from "@/lib/redis-cache";

/**
 * Wind velocity grid API route.
 *
 * Reads wind data from Redis (populated by background worker).
 */

type VelocityData = {
  header: {
    parameterCategory: number;
    parameterNumber: number;
    parameterNumberName: string;
    parameterUnit: string;
    nx: number;
    ny: number;
    lo1: number;
    la1: number;
    dx: number;
    dy: number;
  };
  data: number[];
}[];

export async function GET() {
  try {
    const data = await getFromRedis<VelocityData>("kaos:gfs:wind");

    if (!data) {
      return NextResponse.json(
        { error: "Wind data unavailable - worker may not be running" },
        { status: 503 }
      );
    }

    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-cache" },
    });
  } catch (error) {
    console.error("[wind-data] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch wind data" },
      { status: 500 }
    );
  }
}
