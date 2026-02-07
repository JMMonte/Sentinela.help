import { NextResponse } from "next/server";
import { getFromRedis } from "@/lib/redis-cache";
import { validateFloat } from "@/lib/api-utils";

/**
 * APRS-IS Amateur Radio APRS API route.
 *
 * Returns real-time amateur radio station positions from Redis cache.
 * The worker maintains a TCP connection to APRS-IS servers for real-time data.
 */

export type AprsStation = {
  callsign: string;
  latitude: number;
  longitude: number;
  symbol: string;
  symbolTable: string;
  comment: string | null;
  lastHeard: number;
  speed: number | null;
  course: number | null;
  altitude: number | null;
  path: string | null;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  // Optional bounding box parameters for filtering
  const laminResult = validateFloat(searchParams.get("lamin"), -90, -90, 90);
  const lomaxResult = validateFloat(searchParams.get("lomax"), 180, -180, 180);
  const lamaxResult = validateFloat(searchParams.get("lamax"), 90, -90, 90);
  const lominResult = validateFloat(searchParams.get("lomin"), -180, -180, 180);

  // Only require bounds if any are provided
  const hasBounds =
    searchParams.has("lamin") ||
    searchParams.has("lomax") ||
    searchParams.has("lamax") ||
    searchParams.has("lomin");

  // Validated bounds (only used if hasBounds is true)
  let lamin = 0, lomax = 0, lamax = 0, lomin = 0;
  if (hasBounds) {
    if (!laminResult.success) return NextResponse.json({ error: laminResult.error }, { status: 400 });
    if (!lomaxResult.success) return NextResponse.json({ error: lomaxResult.error }, { status: 400 });
    if (!lamaxResult.success) return NextResponse.json({ error: lamaxResult.error }, { status: 400 });
    if (!lominResult.success) return NextResponse.json({ error: lominResult.error }, { status: 400 });
    lamin = laminResult.value;
    lomax = lomaxResult.value;
    lamax = lamaxResult.value;
    lomin = lominResult.value;
  }

  try {
    const data = await getFromRedis<AprsStation[]>("kaos:aprs:global");

    if (!data) {
      return NextResponse.json(
        { error: "APRS data unavailable - worker may not be running" },
        { status: 503 }
      );
    }

    let stations = data;

    // Filter by bounding box if provided
    if (hasBounds) {
      stations = stations.filter(
        (s) =>
          s.latitude >= lamin &&
          s.latitude <= lamax &&
          s.longitude >= lomin &&
          s.longitude <= lomax
      );
    }

    return NextResponse.json(stations, {
      headers: { "Cache-Control": "no-cache" },
    });
  } catch (error) {
    console.error("[aprs] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch APRS data" },
      { status: 500 }
    );
  }
}
