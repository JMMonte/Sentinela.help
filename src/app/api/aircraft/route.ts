import { NextResponse } from "next/server";
import { cacheAside } from "@/lib/redis-cache";
import {
  fetchWithTimeout,
  validateFloat,
} from "@/lib/api-utils";

/**
 * OpenSky Network ADS-B Aircraft Tracking API route.
 *
 * Fetches real-time aircraft positions from ADS-B receivers worldwide.
 * Free API has rate limits: 400 credits/day anonymous, 4000 with account.
 *
 * API Documentation: https://openskynetwork.github.io/opensky-api/rest.html
 *
 * Authentication: Since March 2025, new accounts must use OAuth2 client credentials.
 * Set OPENSKY_CLIENT_ID and OPENSKY_CLIENT_SECRET environment variables.
 */

const CACHE_TTL_SECONDS = 60; // 60 seconds - balance freshness vs rate limits
const FETCH_TIMEOUT = 30000;
const TOKEN_CACHE_TTL = 25 * 60 * 1000; // 25 minutes (tokens expire after 30)

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getOpenSkyToken(): Promise<string | null> {
  const clientId = process.env.OPENSKY_CLIENT_ID;
  const clientSecret = process.env.OPENSKY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return null; // No credentials, use anonymous access
  }

  // Return cached token if still valid
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  try {
    const response = await fetch("https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!response.ok) {
      console.error("[aircraft] Failed to get OpenSky token:", response.status);
      return null;
    }

    const data = await response.json();
    cachedToken = {
      token: data.access_token,
      expiresAt: Date.now() + TOKEN_CACHE_TTL,
    };
    console.log("[aircraft] Obtained OpenSky OAuth token");
    return cachedToken.token;
  } catch (error) {
    console.error("[aircraft] Error getting OpenSky token:", error);
    return null;
  }
}

type OpenSkyState = [
  string,        // 0: icao24
  string | null, // 1: callsign
  string,        // 2: origin_country
  number | null, // 3: time_position
  number,        // 4: last_contact
  number | null, // 5: longitude
  number | null, // 6: latitude
  number | null, // 7: baro_altitude
  boolean,       // 8: on_ground
  number | null, // 9: velocity
  number | null, // 10: true_track (heading)
  number | null, // 11: vertical_rate
  number[] | null, // 12: sensors
  number | null, // 13: geo_altitude
  string | null, // 14: squawk
  boolean,       // 15: spi
  number,        // 16: position_source
];

type OpenSkyResponse = {
  time: number;
  states: OpenSkyState[] | null;
};

export type Aircraft = {
  icao24: string;
  callsign: string | null;
  latitude: number;
  longitude: number;
  altitude: number | null;
  velocity: number | null;
  heading: number | null;
  verticalRate: number | null;
  onGround: boolean;
  lastContact: number;
  originCountry: string;
};

function parseOpenSkyResponse(data: OpenSkyResponse): Aircraft[] {
  if (!data.states) return [];

  return data.states
    .filter((state) => state[5] !== null && state[6] !== null)
    .map((state) => ({
      icao24: state[0],
      callsign: state[1]?.trim() || null,
      originCountry: state[2],
      lastContact: state[4],
      longitude: state[5]!,
      latitude: state[6]!,
      altitude: state[7], // baro_altitude in meters
      onGround: state[8],
      velocity: state[9], // m/s
      heading: state[10], // degrees from north
      verticalRate: state[11], // m/s
    }));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  // Validate bounding box parameters
  const laminResult = validateFloat(searchParams.get("lamin"), -90, -90, 90);
  const lomaxResult = validateFloat(searchParams.get("lomax"), 180, -180, 180);
  const lamaxResult = validateFloat(searchParams.get("lamax"), 90, -90, 90);
  const lominResult = validateFloat(searchParams.get("lomin"), -180, -180, 180);

  if (!laminResult.success) {
    return NextResponse.json({ error: laminResult.error }, { status: 400 });
  }
  if (!lomaxResult.success) {
    return NextResponse.json({ error: lomaxResult.error }, { status: 400 });
  }
  if (!lamaxResult.success) {
    return NextResponse.json({ error: lamaxResult.error }, { status: 400 });
  }
  if (!lominResult.success) {
    return NextResponse.json({ error: lominResult.error }, { status: 400 });
  }

  const lamin = laminResult.value;
  const lomax = lomaxResult.value;
  const lamax = lamaxResult.value;
  const lomin = lominResult.value;

  // Build cache key based on bounds (rounded for cache efficiency)
  const boundsKey = `${Math.round(lamin)},${Math.round(lomin)},${Math.round(lamax)},${Math.round(lomax)}`;
  const cacheKey = `kaos:aircraft:${boundsKey}`;

  try {
    const result = await cacheAside<Aircraft[]>(
      cacheKey,
      async () => {
        // Build URL with bounding box
        const params = new URLSearchParams({
          lamin: lamin.toString(),
          lomin: lomin.toString(),
          lamax: lamax.toString(),
          lomax: lomax.toString(),
        });

        const url = `https://opensky-network.org/api/states/all?${params}`;
        console.log("[aircraft] Fetching from OpenSky:", boundsKey);

        // Get OAuth token if credentials are configured
        const token = await getOpenSkyToken();
        const headers: Record<string, string> = {
          Accept: "application/json",
        };
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }

        const response = await fetchWithTimeout(
          url,
          {
            cache: "no-store",
            headers,
          },
          FETCH_TIMEOUT
        );

        // Log remaining credits from response header
        const remaining = response.headers.get("X-Rate-Limit-Remaining");
        if (remaining) {
          console.log("[aircraft] Rate limit remaining:", remaining);
        }

        if (!response.ok) {
          if (response.status === 429) {
            throw new Error("OpenSky API rate limit exceeded");
          }
          const text = await response.text();
          throw new Error(`OpenSky API error: ${response.status} - ${text}`);
        }

        const data = (await response.json()) as OpenSkyResponse;
        return parseOpenSkyResponse(data);
      },
      CACHE_TTL_SECONDS
    );

    return NextResponse.json(result.data, {
      headers: {
        "Cache-Control": "no-cache",
        "X-Data-Source": result.source,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[aircraft] Error:", message);
    return NextResponse.json(
      { error: `Failed to fetch aircraft data: ${message}` },
      { status: 500 }
    );
  }
}
