import { NextResponse } from "next/server";
import { cachedFetch } from "@/lib/server-cache";
import { parseGribData, extractGfsField, buildGridData } from "@/lib/overlays/gfs-parse";
import {
  buildGfsUrl,
  kelvinToCelsius,
  type GfsGridData,
} from "@/lib/overlays/gfs-utils";

/**
 * GFS Temperature API route.
 *
 * Fetches 2m temperature from NOAA GFS at 1° resolution.
 * Data is converted from Kelvin to Celsius.
 */

const CACHE_TTL = 60 * 60 * 1000; // 1 hour

// GFS Temperature: Category 0 (Temperature), Parameter 0 (Temperature)
const CATEGORY = 0;
const PARAMETER = 0;

export async function GET() {
  try {
    const gridData = await cachedFetch<GfsGridData>(
      "gfs:temperature",
      CACHE_TTL,
      async () => {
        const url = buildGfsUrl([
          { param: "TMP", level: "2_m_above_ground" },
        ]);
        console.log("[gfs/temperature] Fetching from:", url);

        const response = await fetch(url, {
          cache: "no-store",
          headers: { "Accept-Encoding": "gzip" },
        });

        if (!response.ok) {
          throw new Error(`GFS fetch failed: ${response.status}`);
        }

        const buffer = await response.arrayBuffer();
        const messages = await parseGribData(Buffer.from(buffer));

        const field = extractGfsField(messages, CATEGORY, PARAMETER);
        if (!field) {
          throw new Error("Temperature field not found in GRIB data");
        }

        // Convert Kelvin to Celsius
        return buildGridData(field, "Temperature", "°C", kelvinToCelsius);
      },
    );

    return NextResponse.json(gridData, {
      headers: {
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=1800",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[gfs/temperature] Error:", message);
    return NextResponse.json(
      { error: `Failed to fetch temperature data: ${message}` },
      { status: 500 },
    );
  }
}
