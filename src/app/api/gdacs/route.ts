import { NextResponse } from "next/server";
import { getFromRedis } from "@/lib/redis-cache";
import type { GdacsEvent, GdacsResponse } from "@/lib/overlays/gdacs-api";

/**
 * GDACS Global Disasters API route.
 *
 * Reads GDACS data from Redis (populated by background worker).
 */

export async function GET() {
  try {
    const data = await getFromRedis<GdacsResponse>("kaos:gdacs:events");

    if (!data) {
      return NextResponse.json(
        { error: "GDACS data unavailable - worker may not be running" },
        { status: 503 }
      );
    }

    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-cache" },
    });
  } catch (error) {
    console.error("[gdacs] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch GDACS data" },
      { status: 500 }
    );
  }
}
