import { NextResponse } from "next/server";
import { getFromRedis } from "@/lib/redis-cache";

/**
 * GET /api/warnings
 *
 * Returns IPMA weather warnings from Redis cache (populated by worker).
 */

export async function GET() {
  try {
    const data = await getFromRedis<unknown>("kaos:warnings:ipma");

    if (!data) {
      return NextResponse.json(
        { error: "Warnings data unavailable - worker may not be running" },
        { status: 503 }
      );
    }

    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-cache" },
    });
  } catch (error) {
    console.error("[warnings] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch warnings" },
      { status: 500 }
    );
  }
}
