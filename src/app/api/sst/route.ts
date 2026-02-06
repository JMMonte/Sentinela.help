import { NextResponse } from "next/server";
import { cachedFetch } from "@/lib/server-cache";
import type { GfsGridData, GfsGridHeader } from "@/lib/overlays/gfs-utils";

/**
 * Sea Surface Temperature API route.
 *
 * Fetches SST data from NOAA OISST (Optimum Interpolation SST) via Coastwatch ERDDAP.
 * 0.25° global resolution, updated daily. Data is in Celsius.
 */

const CACHE_TTL = 60 * 60 * 1000; // 1 hour
const FETCH_TIMEOUT = 60000; // 60 seconds

// NOAA OISST v2.1 - 0.25° resolution, global, daily updates
// Dimensions: time, zlev (depth), latitude, longitude
// Longitude range: 0-360 (not -180 to 180)
const ERDDAP_BASE = "https://coastwatch.pfeg.noaa.gov/erddap/griddap/ncdcOisst21Agg.json";

// Type for ERDDAP JSON response
type ErddapResponse = {
  table: {
    columnNames: string[];
    columnTypes: string[];
    columnUnits: string[];
    rows: (number | string | null)[][];
  };
};

export async function GET() {
  try {
    const gridData = await cachedFetch<GfsGridData>(
      "sst:oisst:v4:global",
      CACHE_TTL,
      async () => {
        // Fetch SST for the most recent time, surface level (zlev=0)
        // OISST is already at 0.25° resolution - no stride needed
        // Full global coverage (OISST range: -89.875 to 89.875 lat, 0.125 to 359.875 lon)
        const url = `${ERDDAP_BASE}?sst[(last)][(0)][(-89.875):(89.875)][(0.125):(359.875)]`;
        console.log("[sst] Fetching from Coastwatch ERDDAP...");

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

        try {
          const response = await fetch(url, {
            signal: controller.signal,
            cache: "no-store",
            headers: { Accept: "application/json" },
          });

          clearTimeout(timeout);

          if (!response.ok) {
            const text = await response.text();
            console.error("[sst] ERDDAP error:", text.substring(0, 500));
            throw new Error(`ERDDAP fetch failed: ${response.status}`);
          }

          const json = (await response.json()) as ErddapResponse;

          // Parse ERDDAP response into grid format
          const { columnNames, rows } = json.table;

          const latIdx = columnNames.indexOf("latitude");
          const lonIdx = columnNames.indexOf("longitude");
          const sstIdx = columnNames.indexOf("sst");

          if (latIdx === -1 || lonIdx === -1 || sstIdx === -1) {
            throw new Error("Missing expected columns in ERDDAP response");
          }

          // Collect unique lats and lons to determine grid dimensions
          const lats = new Set<number>();
          const lons = new Set<number>();

          for (const row of rows) {
            const lat = row[latIdx] as number;
            const lon = row[lonIdx] as number;
            if (lat != null && lon != null) {
              lats.add(lat);
              lons.add(lon);
            }
          }

          const sortedLats = Array.from(lats).sort((a, b) => b - a); // Descending (north to south)
          const sortedLons = Array.from(lons).sort((a, b) => a - b); // Ascending (west to east)

          const ny = sortedLats.length;
          const nx = sortedLons.length;

          if (ny === 0 || nx === 0) {
            throw new Error("No valid data points in ERDDAP response");
          }

          // Calculate grid spacing
          const dy = ny > 1 ? Math.abs(sortedLats[0] - sortedLats[1]) : 0.3;
          const dx = nx > 1 ? Math.abs(sortedLons[1] - sortedLons[0]) : 0.3;

          // Create lookup maps for indices
          const latToIdx = new Map<number, number>();
          const lonToIdx = new Map<number, number>();

          sortedLats.forEach((lat, idx) => latToIdx.set(lat, idx));
          sortedLons.forEach((lon, idx) => lonToIdx.set(lon, idx));

          // Initialize data array with NaN (for missing data / land / clouds)
          const data = new Array<number>(ny * nx).fill(NaN);

          // Fill in SST values
          for (const row of rows) {
            const lat = row[latIdx] as number;
            const lon = row[lonIdx] as number;
            const sst = row[sstIdx] as number | null;

            const y = latToIdx.get(lat);
            const x = lonToIdx.get(lon);

            if (y !== undefined && x !== undefined && sst !== null) {
              data[y * nx + x] = sst;
            }
          }

          const header: GfsGridHeader = {
            nx,
            ny,
            lo1: sortedLons[0],
            la1: sortedLats[0],
            dx,
            dy,
          };

          console.log(`[sst] Parsed grid: ${nx}x${ny}, ${rows.length} data points`);

          return {
            header,
            data,
            unit: "°C",
            name: "Sea Surface Temperature",
          };
        } finally {
          clearTimeout(timeout);
        }
      }
    );

    return NextResponse.json(gridData, {
      headers: {
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=1800",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[sst] Error:", message);
    return NextResponse.json(
      { error: `Failed to fetch SST data: ${message}` },
      { status: 500 }
    );
  }
}
