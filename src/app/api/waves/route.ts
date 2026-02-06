import { NextResponse } from "next/server";
import { cachedFetch } from "@/lib/server-cache";
import { fetchWithTimeout, getErrorMessage, getErrorStatus } from "@/lib/api-utils";

/**
 * GET /api/waves
 *
 * Fetches ocean wave data from PacIOOS WAVEWATCH III ERDDAP.
 * Returns significant wave height (Thgt), peak period (Tper), and direction (Tdir).
 * Cache TTL: 1 hour (data updates hourly).
 */

const CACHE_TTL = 60 * 60 * 1000; // 1 hour
const FETCH_TIMEOUT = 60000; // 60 seconds (large dataset)

// PacIOOS WAVEWATCH III ERDDAP endpoint
// Global coverage at 0.5 degree resolution
const ERDDAP_BASE = "https://pae-paha.pacioos.hawaii.edu/erddap/griddap/ww3_global.json";

// Query for latest data: wave height only (period and direction add too much data)
// Dimensions: time, depth, latitude, longitude
// Latitude range: -77.5 to 77.5, Longitude: 0 to 359.5
// Data is already at 0.5° resolution - no stride needed
const ERDDAP_QUERY = "?Thgt[(last)][(0)][(-77.5):(77.5)][(0):(359.5)]";

export type WaveDataPoint = {
  lat: number;
  lon: number;
  height: number; // Significant wave height in meters
  period: number; // Peak period in seconds
  direction: number; // Wave direction in degrees
};

export type WaveGridData = {
  header: {
    nx: number;
    ny: number;
    lo1: number;
    la1: number;
    dx: number;
    dy: number;
  };
  heightData: number[];
  periodData: number[];
  directionData: number[];
  time: string;
  unit: string;
  name: string;
};

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
    const gridData = await cachedFetch<WaveGridData>(
      "waves:global",
      CACHE_TTL,
      async () => {
        const url = `${ERDDAP_BASE}${ERDDAP_QUERY}`;
        console.log("[waves] Fetching from PacIOOS ERDDAP...");

        const response = await fetchWithTimeout(
          url,
          {
            cache: "no-store",
            headers: { Accept: "application/json" },
          },
          FETCH_TIMEOUT,
        );

        if (!response.ok) {
          throw new Error(`ERDDAP fetch failed: ${response.status}`);
        }

        const data = (await response.json()) as ErddapResponse;

        // Parse ERDDAP JSON response
        // The response contains rows with [time, lat, lon, Thgt, Tper, Tdir]
        const { columnNames, rows } = data.table;

        // Find column indices
        const timeIdx = columnNames.indexOf("time");
        const latIdx = columnNames.indexOf("latitude");
        const lonIdx = columnNames.indexOf("longitude");
        const heightIdx = columnNames.indexOf("Thgt");

        if (
          timeIdx === -1 ||
          latIdx === -1 ||
          lonIdx === -1 ||
          heightIdx === -1
        ) {
          console.error("[waves] Column names:", columnNames);
          throw new Error("Invalid ERDDAP response format");
        }

        // Extract unique latitudes and longitudes to determine grid dimensions
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

        const sortedLats = Array.from(lats).sort((a, b) => b - a); // North to South
        const sortedLons = Array.from(lons).sort((a, b) => a - b); // West to East

        const ny = sortedLats.length;
        const nx = sortedLons.length;

        if (ny === 0 || nx === 0) {
          throw new Error("No valid data points in ERDDAP response");
        }

        // Grid spacing
        const dy = ny > 1 ? Math.abs(sortedLats[0] - sortedLats[1]) : 0.5;
        const dx = nx > 1 ? Math.abs(sortedLons[1] - sortedLons[0]) : 0.5;

        // Create index maps for fast lookup
        const latIndexMap = new Map<number, number>();
        const lonIndexMap = new Map<number, number>();
        sortedLats.forEach((lat, idx) => latIndexMap.set(lat, idx));
        sortedLons.forEach((lon, idx) => lonIndexMap.set(lon, idx));

        // Initialize data arrays
        const heightData = new Array<number>(ny * nx).fill(NaN);
        const periodData = new Array<number>(ny * nx).fill(NaN);
        const directionData = new Array<number>(ny * nx).fill(NaN);

        let timeStr = "";

        // Fill the grid
        for (const row of rows) {
          const lat = row[latIdx] as number;
          const lon = row[lonIdx] as number;
          const height = row[heightIdx] as number | null;

          if (lat == null || lon == null) continue;

          const yi = latIndexMap.get(lat);
          const xi = lonIndexMap.get(lon);

          if (yi === undefined || xi === undefined) continue;

          const idx = yi * nx + xi;

          if (height != null && !isNaN(height)) {
            heightData[idx] = height;
          }

          if (!timeStr && row[timeIdx]) {
            timeStr = String(row[timeIdx]);
          }
        }

        console.log(
          `[waves] Parsed grid: ${nx}x${ny}, ${rows.length} data points`,
        );

        return {
          header: {
            nx,
            ny,
            lo1: sortedLons[0],
            la1: sortedLats[0],
            dx,
            dy,
          },
          heightData,
          periodData,
          directionData,
          time: timeStr,
          unit: "m",
          name: "Significant Wave Height",
        };
      },
    );

    return NextResponse.json(gridData, {
      headers: {
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=1800",
      },
    });
  } catch (error) {
    const message = getErrorMessage(error);
    const status = getErrorStatus(error);
    console.error("[waves] Error:", message);
    return NextResponse.json(
      { error: `Failed to fetch wave data: ${message}` },
      { status },
    );
  }
}
