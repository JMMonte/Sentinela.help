import { NextResponse } from "next/server";
import { cachedFetch } from "@/lib/server-cache";
import { parseGribData, extractGfsField, buildGridData } from "@/lib/overlays/gfs-parse";
import { buildGfsUrl, type GfsGridData } from "@/lib/overlays/gfs-utils";

/**
 * GFS CAPE (Convective Available Potential Energy) API route.
 *
 * Fetches CAPE from NOAA GFS at 1° resolution.
 * High CAPE values indicate potential for severe thunderstorms.
 */

const CACHE_TTL = 60 * 60 * 1000; // 1 hour

// GFS CAPE: Category 7 (Thermodynamic Stability), Parameter 6 (CAPE)
const CATEGORY = 7;
const PARAMETER = 6;

export async function GET() {
  try {
    const gridData = await cachedFetch<GfsGridData>(
      "gfs:cape",
      CACHE_TTL,
      async () => {
        const url = buildGfsUrl([
          { param: "CAPE", level: "surface" },
        ]);
        console.log("[gfs/cape] Fetching from:", url);

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
          throw new Error("CAPE field not found in GRIB data");
        }

        return buildGridData(field, "CAPE", "J/kg");
      },
    );

    return NextResponse.json(gridData, {
      headers: {
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=1800",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[gfs/cape] Error:", message);
    return NextResponse.json(
      { error: `Failed to fetch CAPE data: ${message}` },
      { status: 500 },
    );
  }
}
