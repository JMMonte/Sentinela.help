import { NextResponse } from "next/server";
import { cachedFetch } from "@/lib/server-cache";
import { parseGribData, extractGfsField, buildGridData } from "@/lib/overlays/gfs-parse";
import { buildGfsUrl, type GfsGridData } from "@/lib/overlays/gfs-utils";

/**
 * GFS Precipitation API route.
 *
 * Fetches precipitation rate from NOAA GFS at 0.25° resolution.
 * Uses PRATE (Precipitation Rate) which is available in analysis files.
 * Units are kg/m²/s, converted to mm/h for display.
 */

const CACHE_TTL = 60 * 60 * 1000; // 1 hour

// GFS Precipitation Rate: Category 1 (Moisture), Parameter 7 (PRATE)
const CATEGORY = 1;
const PARAMETER = 7;

export async function GET() {
  try {
    const gridData = await cachedFetch<GfsGridData>(
      "gfs:precipitation:v2",
      CACHE_TTL,
      async () => {
        const url = buildGfsUrl([
          { param: "PRATE", level: "surface" },
        ]);
        console.log("[gfs/precipitation] Fetching from:", url);

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
          throw new Error("Precipitation rate field not found in GRIB data");
        }

        // Convert kg/m²/s to mm/h: multiply by 3600
        const gridData = buildGridData(field, "Precipitation Rate", "mm/h");
        gridData.data = gridData.data.map((v) => v * 3600);
        return gridData;
      },
    );

    return NextResponse.json(gridData, {
      headers: {
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=1800",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[gfs/precipitation] Error:", message);
    return NextResponse.json(
      { error: `Failed to fetch precipitation data: ${message}` },
      { status: 500 },
    );
  }
}
