/**
 * OpenSky Network Aircraft Collector
 *
 * Fetches global aircraft positions from OpenSky Network ADS-B data.
 * Uses OAuth2 client credentials for higher rate limits (4000 credits/day).
 *
 * API Documentation: https://openskynetwork.github.io/opensky-api/rest.html
 */

import { BaseCollector } from "./base-collector.js";
import { COLLECTOR_CONFIGS, type Config } from "../config.js";

const TOKEN_CACHE_TTL = 25 * 60 * 1000; // 25 minutes (tokens expire after 30)
const FETCH_TIMEOUT = 30000;
const TOKEN_FETCH_TIMEOUT = 30000; // Increased from 10s - Railway may have slow routes to OpenSky

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

// Compact aircraft type for Redis storage (~50% smaller)
export type Aircraft = {
  i: string;        // icao24
  c?: string;       // callsign (omitted if null)
  la: number;       // latitude (3 decimals)
  lo: number;       // longitude (3 decimals)
  al?: number;      // altitude (omitted if null, rounded)
  v?: number;       // velocity (omitted if null, rounded)
  h?: number;       // heading (omitted if null, rounded)
  vr?: number;      // verticalRate (omitted if null, rounded)
  g: boolean;       // onGround
  t: number;        // lastContact
  o: string;        // originCountry
};

export class AircraftCollector extends BaseCollector {
  private appConfig: Config;
  private cachedToken: { token: string; expiresAt: number } | null = null;

  constructor(appConfig: Config) {
    super({
      name: COLLECTOR_CONFIGS.aircraft.name,
      redisKey: COLLECTOR_CONFIGS.aircraft.redisKey,
      ttlSeconds: COLLECTOR_CONFIGS.aircraft.ttlSeconds,
    });
    this.appConfig = appConfig;
  }

  private async getToken(): Promise<string | null> {
    const clientId = this.appConfig.OPENSKY_CLIENT_ID;
    const clientSecret = this.appConfig.OPENSKY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      this.logger.warn("No OpenSky credentials configured, using anonymous access");
      return null;
    }

    // Return cached token if still valid
    if (this.cachedToken && Date.now() < this.cachedToken.expiresAt) {
      return this.cachedToken.token;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), TOKEN_FETCH_TIMEOUT);

      const response = await fetch(
        "https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            grant_type: "client_credentials",
            client_id: clientId,
            client_secret: clientSecret,
          }),
          signal: controller.signal,
        }
      );

      clearTimeout(timeout);

      if (!response.ok) {
        this.logger.error(`Failed to get OpenSky token: ${response.status}`);
        return null;
      }

      const data = (await response.json()) as { access_token: string };
      this.cachedToken = {
        token: data.access_token,
        expiresAt: Date.now() + TOKEN_CACHE_TTL,
      };
      this.logger.info("Obtained OpenSky OAuth token");
      return this.cachedToken.token;
    } catch (error) {
      this.logger.error("Error getting OpenSky token", error);
      return null;
    }
  }

  protected async collect(): Promise<Aircraft[]> {
    this.logger.debug("Fetching global aircraft data from OpenSky");

    const token = await this.getToken();
    const headers: Record<string, string> = {
      Accept: "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    // Fetch all aircraft globally - API route filters by bounding box
    const response = await fetch("https://opensky-network.org/api/states/all", {
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    // Log remaining credits
    const remaining = response.headers.get("X-Rate-Limit-Remaining");
    if (remaining) {
      this.logger.debug(`Rate limit remaining: ${remaining}`);
    }

    if (!response.ok) {
      if (response.status === 429) {
        this.logger.warn("OpenSky rate limit exceeded, will retry later");
        throw new Error("Rate limit exceeded");
      }
      throw new Error(`OpenSky API error: ${response.status}`);
    }

    const data = (await response.json()) as OpenSkyResponse;
    const aircraft = this.parseResponse(data);

    this.logger.info(`Collected ${aircraft.length} aircraft positions`);
    return aircraft;
  }

  private parseResponse(data: OpenSkyResponse): Aircraft[] {
    if (!data.states) return [];

    return data.states
      .filter((state) => state[5] !== null && state[6] !== null)
      .map((state): Aircraft => {
        const aircraft: Aircraft = {
          i: state[0],
          la: Math.round(state[6]! * 1000) / 1000,
          lo: Math.round(state[5]! * 1000) / 1000,
          g: state[8],
          t: state[4],
          o: state[2],
        };
        // Only include optional fields if they have values
        const callsign = state[1]?.trim();
        if (callsign) aircraft.c = callsign;
        if (state[7] !== null) aircraft.al = Math.round(state[7]);
        if (state[9] !== null) aircraft.v = Math.round(state[9]);
        if (state[10] !== null) aircraft.h = Math.round(state[10]);
        if (state[11] !== null) aircraft.vr = Math.round(state[11]);
        return aircraft;
      });
  }
}
