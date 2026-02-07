import { NextResponse, type NextRequest } from "next/server";
import { getFromRedis } from "@/lib/redis-cache";

/**
 * GET /api/prociv?hours=8
 *
 * Reads ProCiv data from Redis (populated by background worker).
 */

type FogosIncident = {
  id: string;
  dateTime: { sec: number };
  [key: string]: unknown;
};

type ProcivData = {
  success: boolean;
  data: FogosIncident[];
};

export async function GET(request: NextRequest) {
  const hours = Math.max(1, Math.min(Number(request.nextUrl.searchParams.get("hours") ?? "8"), 168));
  const cutoff = Date.now() - hours * 60 * 60 * 1000;

  try {
    const data = await getFromRedis<ProcivData>("kaos:prociv:ocorrencias");

    if (!data) {
      return NextResponse.json(
        { error: "ProCiv data unavailable - worker may not be running" },
        { status: 503 }
      );
    }

    // Filter by hours parameter
    const filteredData = data.data.filter(
      (i) => i.dateTime.sec * 1000 >= cutoff
    );

    return NextResponse.json(
      { success: true, data: filteredData },
      { headers: { "Cache-Control": "no-cache" } }
    );
  } catch (error) {
    console.error("[prociv] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch ProCiv data" },
      { status: 500 }
    );
  }
}
