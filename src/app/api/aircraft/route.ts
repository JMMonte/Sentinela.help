import { NextResponse } from "next/server";
import { getFromRedis } from "@/lib/redis-cache";

/**
 * GET /api/aircraft
 *
 * Returns aircraft positions from Redis cache, filtered by bounding box.
 * Query params: lamin, lamax, lomin, lomax (all optional)
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

export async function GET(request: Request) {
  try {
    const data = await getFromRedis<Aircraft[]>("kaos:aircraft:global");

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

    let filtered = data;

    // Filter by bounding box if provided
    if (lamin && lamax && lomin && lomax) {
      const bounds = {
        lamin: parseFloat(lamin),
        lamax: parseFloat(lamax),
        lomin: parseFloat(lomin),
        lomax: parseFloat(lomax),
      };

      filtered = data.filter(
        (a) =>
          a.latitude >= bounds.lamin &&
          a.latitude <= bounds.lamax &&
          a.longitude >= bounds.lomin &&
          a.longitude <= bounds.lomax
      );
    }

    return NextResponse.json(filtered, {
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
