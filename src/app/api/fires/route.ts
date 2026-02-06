import { NextResponse } from "next/server";
import { cachedFetch } from "@/lib/server-cache";
import { env } from "@/lib/env";
import {
  fetchWithTimeout,
  validateInt,
  validateEnum,
  getErrorMessage,
  getErrorStatus,
} from "@/lib/api-utils";

/**
 * NASA FIRMS Fire Detection API route.
 *
 * Fetches active fire hotspots detected by MODIS and VIIRS satellites.
 * Data is near real-time (3-4 hour delay).
 *
 * API Documentation: https://firms.modaps.eosdis.nasa.gov/api/
 */

const CACHE_TTL = 15 * 60 * 1000; // 15 minutes
const FETCH_TIMEOUT = 30000; // 30 seconds

// Valid FIRMS data sources
const VALID_SOURCES = new Set([
  "VIIRS_SNPP_NRT",
  "VIIRS_NOAA20_NRT",
  "MODIS_NRT",
  "VIIRS_SNPP_SP",
  "VIIRS_NOAA20_SP",
  "MODIS_SP",
]);

export type FireHotspot = {
  latitude: number;
  longitude: number;
  brightness: number; // Kelvin
  confidence: string | number; // "nominal", "high", "low" or 0-100
  frp: number; // Fire Radiative Power (MW)
  satellite: string; // "Terra", "Aqua", "N20", "SNPP"
  instrument: string; // "MODIS", "VIIRS"
  acq_date: string; // YYYY-MM-DD
  acq_time: string; // HHMM
  daynight: string; // "D" or "N"
};

type FirmsResponse = FireHotspot[];

/**
 * Parse FIRMS CSV response into structured data.
 */
function parseFirmsCsv(csv: string): FireHotspot[] {
  const lines = csv.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = lines[0].split(",");
  const hotspots: FireHotspot[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",");
    if (values.length < headers.length) continue;

    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h.trim()] = values[idx]?.trim() || "";
    });

    hotspots.push({
      latitude: parseFloat(row.latitude),
      longitude: parseFloat(row.longitude),
      brightness: parseFloat(row.brightness || row.bright_ti4 || "0"),
      confidence: row.confidence || "nominal",
      frp: parseFloat(row.frp || "0"),
      satellite: row.satellite || "Unknown",
      instrument: row.instrument || "Unknown",
      acq_date: row.acq_date || "",
      acq_time: row.acq_time || "",
      daynight: row.daynight || "D",
    });
  }

  return hotspots.filter(
    (h) => !isNaN(h.latitude) && !isNaN(h.longitude),
  );
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  // Validate input parameters
  const daysResult = validateInt(searchParams.get("days"), 1, 1, 10);
  if (!daysResult.success) {
    return NextResponse.json({ error: daysResult.error }, { status: 400 });
  }
  const days = daysResult.value;

  const sourceResult = validateEnum(
    searchParams.get("source"),
    VALID_SOURCES,
    "VIIRS_SNPP_NRT"
  );
  if (!sourceResult.success) {
    return NextResponse.json({ error: sourceResult.error }, { status: 400 });
  }
  const source = sourceResult.value;

  // Check for API key
  const apiKey = env.NASA_FIRMS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "NASA FIRMS API key not configured" },
      { status: 503 },
    );
  }

  try {
    const hotspots = await cachedFetch<FirmsResponse>(
      `fires:${source}:${days}`,
      CACHE_TTL,
      async () => {
        // World coverage - FIRMS supports "world" for global data
        // For Portugal specifically, we could use area coordinates
        // Format: west,south,east,north
        // Portugal approximate bounds: -10,36,-6,42
        const area = "world"; // or "-10,36,-6,42" for Portugal only

        const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${apiKey}/${source}/${area}/${days}`;
        console.log("[fires] Fetching from FIRMS:", source, "days:", days);

        const response = await fetchWithTimeout(
          url,
          {
            cache: "no-store",
            headers: {
              Accept: "text/csv",
            },
          },
          FETCH_TIMEOUT
        );

        if (!response.ok) {
          const text = await response.text();
          throw new Error(`FIRMS API error: ${response.status} - ${text}`);
        }

        const csv = await response.text();
        return parseFirmsCsv(csv);
      },
    );

    return NextResponse.json(hotspots, {
      headers: {
        "Cache-Control": "public, max-age=900, stale-while-revalidate=300",
      },
    });
  } catch (error) {
    const message = getErrorMessage(error);
    const status = getErrorStatus(error);
    console.error("[fires] Error:", message);
    return NextResponse.json(
      { error: `Failed to fetch fire data: ${message}` },
      { status },
    );
  }
}
