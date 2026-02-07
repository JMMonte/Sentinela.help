import { NextResponse } from "next/server";
import { getFromRedis } from "@/lib/redis-cache";

/**
 * KiwiSDR WebSDR Station Network API route.
 *
 * Reads KiwiSDR data from Redis (populated by background worker).
 * Expands compact format from worker to full format for frontend.
 */

// Compact format from worker
type KiwiStationCompact = {
  n: string;
  u: string;
  la: number;
  lo: number;
  us: number;
  mx: number;
  an?: string;
  lc?: string;
  sn?: number;
  of: boolean;
};

// Full format for frontend
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

function expandStation(compact: KiwiStationCompact): KiwiStation {
  return {
    name: compact.n,
    url: compact.u,
    latitude: compact.la,
    longitude: compact.lo,
    users: compact.us,
    usersMax: compact.mx,
    antenna: compact.an ?? null,
    location: compact.lc ?? null,
    snr: compact.sn ?? null,
    offline: compact.of,
  };
}

export async function GET() {
  try {
    const data = await getFromRedis<KiwiStationCompact[]>("kaos:kiwisdr:stations");

    if (!data) {
      return NextResponse.json(
        { error: "KiwiSDR data unavailable - worker may not be running" },
        { status: 503 }
      );
    }

    // Expand compact format to full format
    const stations = data.map(expandStation);

    return NextResponse.json(stations, {
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
