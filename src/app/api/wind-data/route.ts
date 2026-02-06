import { NextResponse } from "next/server";
import { cachedFetch } from "@/lib/server-cache";
import { readData, type GribField, type GribMessage } from "grib-js";

/**
 * Wind velocity grid API route.
 *
 * Fetches global wind data from NOAA GFS (GRIB2 format) at 0.25° resolution (~28km).
 * Completely free with no rate limits. Cached for 1 hour.
 *
 * Data updates every 6 hours (00, 06, 12, 18 UTC).
 */

const CACHE_TTL = 60 * 60 * 1000; // 1 hour

/**
 * Find the latest available GFS run (usually ~4-5h behind real time).
 * Returns the NOMADS URL for 0.25° resolution U/V wind components.
 */
function getGfsUrl(): string {
  const now = new Date();
  // GFS runs at 00, 06, 12, 18 UTC; data is available ~4-5h after run time
  const utcHour = now.getUTCHours();
  const runHour = Math.floor((utcHour - 5) / 6) * 6; // 5h delay for availability
  const runHourStr = String(Math.max(0, runHour)).padStart(2, "0");

  const dateStr =
    now.getUTCFullYear().toString() +
    String(now.getUTCMonth() + 1).padStart(2, "0") +
    String(now.getUTCDate()).padStart(2, "0");

  // NOMADS filter service: extract only U/V at 10m above ground
  return `https://nomads.ncep.noaa.gov/cgi-bin/filter_gfs_0p25.pl?dir=%2Fgfs.${dateStr}%2F${runHourStr}%2Fatmos&file=gfs.t${runHourStr}z.pgrb2.0p25.f000&lev_10_m_above_ground=on&var_UGRD=on&var_VGRD=on`;
}

/**
 * Parse GRIB2 buffer using grib-js callback API
 */
function parseGribData(buffer: Buffer): Promise<GribMessage[]> {
  return new Promise((resolve, reject) => {
    readData(buffer, (err, messages) => {
      if (err) reject(err);
      else resolve(messages);
    });
  });
}

/**
 * Convert GRIB fields to leaflet-velocity format.
 * Grid properties are nested in grid.definition for grib-js.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildVelocityData(uField: any, vField: any): unknown[] {
  // grib-js nests grid properties under grid.definition
  const gridDef = uField.grid?.definition || uField.grid;
  const nx = gridDef.ni;
  const ny = gridDef.nj;
  const lo1 = gridDef.lo1;
  const la1 = gridDef.la1;
  const dx = gridDef.di;
  const dy = gridDef.dj;

  return [
    {
      header: {
        parameterCategory: 2,
        parameterNumber: 2,
        parameterNumberName: "U-component_of_wind",
        parameterUnit: "m.s-1",
        nx,
        ny,
        lo1,
        la1,
        dx,
        dy,
      },
      data: uField.data,
    },
    {
      header: {
        parameterCategory: 2,
        parameterNumber: 3,
        parameterNumberName: "V-component_of_wind",
        parameterUnit: "m.s-1",
        nx,
        ny,
        lo1,
        la1,
        dx,
        dy,
      },
      data: vField.data,
    },
  ];
}

export async function GET() {
  try {
    const velocityData = await cachedFetch("wind:gfs", CACHE_TTL, async () => {
      const url = getGfsUrl();
      console.log("[wind-data] Fetching GFS from:", url);

      const response = await fetch(url, {
        cache: "no-store",
        headers: { "Accept-Encoding": "gzip" },
      });

      if (!response.ok) {
        throw new Error(`GFS fetch failed: ${response.status}`);
      }

      const buffer = await response.arrayBuffer();
      const messages = await parseGribData(Buffer.from(buffer));

      // Each message contains fields array; flatten all fields
      const allFields = messages.flatMap((m) => m.fields);

      console.log("[wind-data] Parsed", allFields.length, "GRIB fields");

      // grib-js uses nested structure: product.details.category.value, product.details.parameter.value
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const getCategory = (f: any) => f?.product?.details?.category?.value;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const getParameter = (f: any) => f?.product?.details?.parameter?.value;

      // Find U and V wind component fields
      // U: category 2 (Momentum), parameter 2 (UGRD)
      // V: category 2 (Momentum), parameter 3 (VGRD)
      let uField = allFields.find(
        (f) => getCategory(f) === 2 && getParameter(f) === 2,
      );
      let vField = allFields.find(
        (f) => getCategory(f) === 2 && getParameter(f) === 3,
      );

      if (!uField || !vField) {
        console.error(
          "[wind-data] Available fields:",
          allFields.map((f) => ({
            cat: getCategory(f),
            param: getParameter(f),
          })),
        );
        throw new Error("Missing U or V wind component in GRIB data");
      }

      const gridDef = uField.grid?.definition || uField.grid;
      console.log("[wind-data] Grid:", gridDef.ni, "x", gridDef.nj);
      return buildVelocityData(uField, vField);
    });

    return NextResponse.json(velocityData, {
      headers: {
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=1800",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[wind-data] Error:", message, error);
    return NextResponse.json(
      { error: `Failed to fetch wind data: ${message}` },
      { status: 500 },
    );
  }
}
