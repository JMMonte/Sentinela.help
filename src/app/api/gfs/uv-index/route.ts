import { NextResponse } from "next/server";
import { cachedFetch } from "@/lib/server-cache";
import { parseGribData, extractGfsField, buildGridData } from "@/lib/overlays/gfs-parse";
import { buildGfsUrl, type GfsGridData, type GfsGridHeader } from "@/lib/overlays/gfs-utils";

/**
 * GFS UV Index API route.
 *
 * Calculates UV Index from NOAA GFS Total Ozone Column (TOZNE) data
 * using the Madronich analytic formula:
 *
 *   UV Index = 12.5 × cos(θ)^2.42 × (Ozone/300)^(-1.23)
 *
 * Where θ is the solar zenith angle and Ozone is in Dobson Units.
 *
 * Reference: https://pubmed.ncbi.nlm.nih.gov/18028230/
 */

const CACHE_TTL = 60 * 60 * 1000; // 1 hour (ozone data is stable)

// GRIB2 identifiers for Total Ozone (TOZNE)
// Discipline 0 (Meteorological), Category 14 (Trace gases), Parameter 0 (Total ozone)
const OZONE_CATEGORY = 14;
const OZONE_PARAMETER = 0;

// Cloud cover for attenuation (optional enhancement)
const CLOUD_CATEGORY = 6; // Cloud
const CLOUD_PARAMETER = 1; // Total cloud cover

/**
 * Calculate solar zenith angle in degrees for a given position and time.
 * Uses simplified astronomical calculations.
 */
function calculateSolarZenithAngle(lat: number, lon: number, date: Date): number {
  const dayOfYear = getDayOfYear(date);
  const hour = date.getUTCHours() + date.getUTCMinutes() / 60;

  // Solar declination (simplified formula)
  const declination = 23.45 * Math.sin((2 * Math.PI * (284 + dayOfYear)) / 365);
  const declinationRad = (declination * Math.PI) / 180;

  // Hour angle (15° per hour from solar noon)
  // Solar noon occurs when the sun is at the meridian
  const solarNoonOffset = lon / 15; // hours from UTC
  const hourAngle = (hour - 12 + solarNoonOffset) * 15;
  const hourAngleRad = (hourAngle * Math.PI) / 180;

  const latRad = (lat * Math.PI) / 180;

  // Solar zenith angle formula
  const cosZenith =
    Math.sin(latRad) * Math.sin(declinationRad) +
    Math.cos(latRad) * Math.cos(declinationRad) * Math.cos(hourAngleRad);

  // Clamp to valid range and convert to degrees
  const zenithRad = Math.acos(Math.max(-1, Math.min(1, cosZenith)));
  return (zenithRad * 180) / Math.PI;
}

/**
 * Get day of year (1-365/366).
 */
function getDayOfYear(date: Date): number {
  const start = new Date(date.getUTCFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/**
 * Calculate UV Index using Madronich formula.
 *
 * @param ozoneDU - Total ozone column in Dobson Units
 * @param solarZenithAngle - Solar zenith angle in degrees
 * @param cloudCoverFraction - Cloud cover from 0 to 1 (optional)
 * @returns UV Index value
 */
function calculateUvIndex(
  ozoneDU: number,
  solarZenithAngle: number,
  cloudCoverFraction: number = 0
): number {
  // No UV when sun is below horizon
  if (solarZenithAngle >= 90) {
    return 0;
  }

  // Cosine of solar zenith angle
  const cosZenith = Math.cos((solarZenithAngle * Math.PI) / 180);

  // Madronich clear-sky formula
  // UV Index = 12.5 × μ₀^2.42 × (Ω/300)^(-1.23)
  const uvClearSky = 12.5 * Math.pow(cosZenith, 2.42) * Math.pow(ozoneDU / 300, -1.23);

  // Cloud attenuation (simplified)
  // Clear: 100%, Scattered: ~89%, Broken: ~73%, Overcast: ~31%
  const cloudTransmission = 1 - 0.7 * cloudCoverFraction;

  return Math.max(0, uvClearSky * cloudTransmission);
}

export async function GET() {
  try {
    const gridData = await cachedFetch<GfsGridData>(
      "gfs:uv-index:v1",
      CACHE_TTL,
      async () => {
        // Fetch ozone data from GFS
        // Level: "entire atmosphere (considered as a single layer)"
        const url = buildGfsUrl([
          { param: "TOZNE", level: "entire_atmosphere_(considered_as_a_single_layer)" },
        ]);
        console.log("[gfs/uv-index] Fetching ozone from:", url);

        const response = await fetch(url, {
          cache: "no-store",
          headers: { "Accept-Encoding": "gzip" },
        });

        if (!response.ok) {
          throw new Error(`GFS fetch failed: ${response.status}`);
        }

        const buffer = await response.arrayBuffer();
        const messages = await parseGribData(Buffer.from(buffer));

        const ozoneField = extractGfsField(messages, OZONE_CATEGORY, OZONE_PARAMETER);
        if (!ozoneField) {
          throw new Error("Ozone field not found in GRIB data");
        }

        // Build UV Index grid from ozone data
        const now = new Date();
        const { header, data: ozoneData } = buildGridData(
          ozoneField,
          "Ozone",
          "DU",
          (v) => v // Ozone already in Dobson Units
        );

        // Calculate UV Index for each grid point
        const uvData = new Array<number>(ozoneData.length);
        const nx = header.nx;
        const ny = header.ny;

        for (let yi = 0; yi < ny; yi++) {
          const lat = header.la1 - yi * header.dy;
          for (let xi = 0; xi < nx; xi++) {
            const lon = header.lo1 + xi * header.dx;
            // Normalize longitude to -180 to 180 for solar calculations
            const normalizedLon = lon > 180 ? lon - 360 : lon;

            const idx = yi * nx + xi;
            const ozone = ozoneData[idx];

            if (isNaN(ozone) || ozone <= 0) {
              uvData[idx] = NaN;
              continue;
            }

            const solarZenith = calculateSolarZenithAngle(lat, normalizedLon, now);
            uvData[idx] = calculateUvIndex(ozone, solarZenith);
          }
        }

        const validCount = uvData.filter((v) => !isNaN(v) && v > 0).length;
        console.log(
          `[gfs/uv-index] Calculated UV Index: ${nx}x${ny}, ${validCount} daylight points`
        );

        return {
          header,
          data: uvData,
          unit: "UV Index",
          name: "UV Index",
        };
      }
    );

    return NextResponse.json(gridData, {
      headers: {
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=1800",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[gfs/uv-index] Error:", message);
    return NextResponse.json(
      { error: `Failed to fetch UV index data: ${message}` },
      { status: 500 }
    );
  }
}
