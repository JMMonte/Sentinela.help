import { NextResponse } from "next/server";
import { getFromRedis } from "@/lib/redis-cache";

/**
 * GET /api/aircraft
 *
 * Returns aircraft positions from Redis cache, filtered by bounding box.
 * Expands compact format from worker to full format for frontend.
 * Query params: lamin, lamax, lomin, lomax (all optional)
 */

// Compact format from worker
type AircraftCompact = {
  i: string;
  c?: string;
  la: number;
  lo: number;
  al?: number;
  v?: number;
  h?: number;
  vr?: number;
  g: boolean;
  t: number;
  o: string;
};

// Full format for frontend
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

function expandAircraft(compact: AircraftCompact): Aircraft {
  return {
    icao24: compact.i,
    callsign: compact.c ?? null,
    latitude: compact.la,
    longitude: compact.lo,
    altitude: compact.al ?? null,
    velocity: compact.v ?? null,
    heading: compact.h ?? null,
    verticalRate: compact.vr ?? null,
    onGround: compact.g,
    lastContact: compact.t,
    originCountry: compact.o,
  };
}

export async function GET(request: Request) {
  try {
    const data = await getFromRedis<AircraftCompact[]>("kaos:aircraft:global");

    if (!data) {
      return NextResponse.json(
        { error: "Aircraft data unavailable - worker may not be running" },
        { status: 503 }
      );
    }

    // Parse bounding box from query params
    const url = new URL(request.url);
    const lamin = url.searchParams.get("lamin");
    const lamax = url.searchParams.get("lamax");
    const lomin = url.searchParams.get("lomin");
    const lomax = url.searchParams.get("lomax");

    // Filter by bounding box BEFORE expanding (use compact field names)
    let filtered = data;
    if (lamin && lamax && lomin && lomax) {
      const bounds = {
        lamin: parseFloat(lamin),
        lamax: parseFloat(lamax),
        lomin: parseFloat(lomin),
        lomax: parseFloat(lomax),
      };

      filtered = data.filter(
        (a) =>
          a.la >= bounds.lamin &&
          a.la <= bounds.lamax &&
          a.lo >= bounds.lomin &&
          a.lo <= bounds.lomax
      );
    }

    // Expand compact format to full format
    const aircraft = filtered.map(expandAircraft);

    return NextResponse.json(aircraft, {
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
