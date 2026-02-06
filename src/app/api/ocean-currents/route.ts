import { NextResponse } from "next/server";
import { cachedFetch } from "@/lib/server-cache";

/**
 * Ocean Currents velocity grid API route.
 *
 * Fetches global ocean current data from NOAA CoastWatch ERDDAP (JSON format).
 * Uses geostrophic velocities from satellite altimetry (nesdisSSH1day dataset).
 * Completely free with no rate limits. Cached for 1 hour.
 *
 * Data updates daily.
 */

const CACHE_TTL = 60 * 60 * 1000; // 1 hour

/**
 * Build the ERDDAP URL for ocean currents data.
 * Uses the most recent data via [(last)] selector.
 */
function getErddapUrl(): string {
  // ERDDAP griddap endpoint with latest data
  // ugos = eastward geostrophic velocity (m/s)
  // vgos = northward geostrophic velocity (m/s)
  return `https://upwell.pfeg.noaa.gov/erddap/griddap/nesdisSSH1day.json?ugos[(last)][(-90):(90)][(-180):(180)],vgos[(last)][(-90):(90)][(-180):(180)]`;
}

type ErddapResponse = {
  table: {
    columnNames: string[];
    columnTypes: string[];
    columnUnits: string[];
    rows: (string | number | null)[][];
  };
};

type GridInfo = {
  latMin: number;
  latMax: number;
  lonMin: number;
  lonMax: number;
  latStep: number;
  lonStep: number;
  nLat: number;
  nLon: number;
};

/**
 * Parse ERDDAP JSON response and convert to leaflet-velocity format.
 */
function parseErddapResponse(data: ErddapResponse) {
  const { columnNames, rows } = data.table;

  // Find column indices
  const latIdx = columnNames.indexOf("latitude");
  const lonIdx = columnNames.indexOf("longitude");
  const ugosIdx = columnNames.indexOf("ugos");
  const vgosIdx = columnNames.indexOf("vgos");

  if (latIdx === -1 || lonIdx === -1 || ugosIdx === -1 || vgosIdx === -1) {
    throw new Error("Missing expected columns in ERDDAP response");
  }

  // Extract unique lat/lon values to determine grid structure
  const lats = new Set<number>();
  const lons = new Set<number>();

  for (const row of rows) {
    lats.add(row[latIdx] as number);
    lons.add(row[lonIdx] as number);
  }

  const latArray = Array.from(lats).sort((a, b) => b - a); // North to South
  const lonArray = Array.from(lons).sort((a, b) => a - b); // West to East

  const nLat = latArray.length;
  const nLon = lonArray.length;

  if (nLat < 2 || nLon < 2) {
    throw new Error("Insufficient grid points in ERDDAP data");
  }

  const gridInfo: GridInfo = {
    latMin: Math.min(...latArray),
    latMax: Math.max(...latArray),
    lonMin: Math.min(...lonArray),
    lonMax: Math.max(...lonArray),
    latStep: Math.abs(latArray[0] - latArray[1]),
    lonStep: Math.abs(lonArray[1] - lonArray[0]),
    nLat,
    nLon,
  };

  // Create lookup for grid position
  const latToIdx = new Map(latArray.map((lat, idx) => [lat, idx]));
  const lonToIdx = new Map(lonArray.map((lon, idx) => [lon, idx]));

  // Initialize data arrays with NaN
  const uData = new Array(nLat * nLon).fill(null);
  const vData = new Array(nLat * nLon).fill(null);

  // Fill data arrays
  for (const row of rows) {
    const lat = row[latIdx] as number;
    const lon = row[lonIdx] as number;
    const u = row[ugosIdx];
    const v = row[vgosIdx];

    const latI = latToIdx.get(lat);
    const lonI = lonToIdx.get(lon);

    if (latI !== undefined && lonI !== undefined) {
      const idx = latI * nLon + lonI;
      // Convert null/NaN to 0 for velocity layer compatibility
      uData[idx] = u !== null && !isNaN(Number(u)) ? Number(u) : 0;
      vData[idx] = v !== null && !isNaN(Number(v)) ? Number(v) : 0;
    }
  }

  return buildVelocityData(uData, vData, gridInfo);
}

/**
 * Convert to leaflet-velocity format.
 */
function buildVelocityData(
  uData: (number | null)[],
  vData: (number | null)[],
  grid: GridInfo,
): unknown[] {
  return [
    {
      header: {
        parameterCategory: 2,
        parameterNumber: 2,
        parameterNumberName: "Eastward_sea_water_velocity",
        parameterUnit: "m.s-1",
        nx: grid.nLon,
        ny: grid.nLat,
        lo1: grid.lonMin,
        la1: grid.latMax, // Start from north
        dx: grid.lonStep,
        dy: grid.latStep,
      },
      data: uData,
    },
    {
      header: {
        parameterCategory: 2,
        parameterNumber: 3,
        parameterNumberName: "Northward_sea_water_velocity",
        parameterUnit: "m.s-1",
        nx: grid.nLon,
        ny: grid.nLat,
        lo1: grid.lonMin,
        la1: grid.latMax, // Start from north
        dx: grid.lonStep,
        dy: grid.latStep,
      },
      data: vData,
    },
  ];
}

export async function GET() {
  try {
    const velocityData = await cachedFetch(
      "ocean-currents:erddap",
      CACHE_TTL,
      async () => {
        const url = getErddapUrl();
        console.log("[ocean-currents] Fetching ERDDAP from:", url);

        const response = await fetch(url, {
          cache: "no-store",
          headers: { Accept: "application/json" },
        });

        if (!response.ok) {
          throw new Error(`ERDDAP fetch failed: ${response.status}`);
        }

        const data = (await response.json()) as ErddapResponse;

        if (!data.table || !data.table.rows || data.table.rows.length === 0) {
          throw new Error("Empty ERDDAP response");
        }

        console.log(
          "[ocean-currents] Parsed",
          data.table.rows.length,
          "data points",
        );
        return parseErddapResponse(data);
      },
    );

    return NextResponse.json(velocityData, {
      headers: {
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=1800",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[ocean-currents] Error:", message, error);
    return NextResponse.json(
      { error: `Failed to fetch ocean currents data: ${message}` },
      { status: 500 },
    );
  }
}
