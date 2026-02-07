/**
 * OpenSky Network Aircraft Collector
 *
 * Fetches global aircraft positions from OpenSky Network ADS-B data.
 * Uses OAuth2 client credentials for higher rate limits (4000 credits/day).
 *
 * API Documentation: https://openskynetwork.github.io/opensky-api/rest.html
 */
import { BaseCollector } from "./base-collector.js";
import { COLLECTOR_CONFIGS } from "../config.js";
const TOKEN_CACHE_TTL = 25 * 60 * 1000; // 25 minutes (tokens expire after 30)
const FETCH_TIMEOUT = 30000;
// Bounding box for Europe/Atlantic region (reduces data from 10k+ to ~2k aircraft)
const BOUNDS = {
    lamin: 25, // South (North Africa)
    lamax: 72, // North (Scandinavia)
    lomin: -30, // West (Atlantic/Azores)
    lomax: 45, // East (Eastern Europe)
};
export class AircraftCollector extends BaseCollector {
    appConfig;
    cachedToken = null;
    constructor(appConfig) {
        super({
            name: COLLECTOR_CONFIGS.aircraft.name,
            redisKey: COLLECTOR_CONFIGS.aircraft.redisKey,
            ttlSeconds: COLLECTOR_CONFIGS.aircraft.ttlSeconds,
        });
        this.appConfig = appConfig;
    }
    async getToken() {
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
            const timeout = setTimeout(() => controller.abort(), 10000);
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
                signal: controller.signal,
            });
            clearTimeout(timeout);
            if (!response.ok) {
                this.logger.error(`Failed to get OpenSky token: ${response.status}`);
                return null;
            }
            const data = (await response.json());
            this.cachedToken = {
                token: data.access_token,
                expiresAt: Date.now() + TOKEN_CACHE_TTL,
            };
            this.logger.info("Obtained OpenSky OAuth token");
            return this.cachedToken.token;
        }
        catch (error) {
            this.logger.error("Error getting OpenSky token", error);
            return null;
        }
    }
    async collect() {
        this.logger.debug("Fetching global aircraft data from OpenSky");
        const token = await this.getToken();
        const headers = {
            Accept: "application/json",
        };
        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
        // Fetch aircraft within bounding box (Europe/Atlantic region)
        const url = new URL("https://opensky-network.org/api/states/all");
        url.searchParams.set("lamin", String(BOUNDS.lamin));
        url.searchParams.set("lamax", String(BOUNDS.lamax));
        url.searchParams.set("lomin", String(BOUNDS.lomin));
        url.searchParams.set("lomax", String(BOUNDS.lomax));
        const response = await fetch(url.toString(), {
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
        const data = (await response.json());
        const aircraft = this.parseResponse(data);
        this.logger.info(`Collected ${aircraft.length} aircraft positions`);
        return aircraft;
    }
    parseResponse(data) {
        if (!data.states)
            return [];
        return data.states
            .filter((state) => state[5] !== null && state[6] !== null)
            .map((state) => ({
            icao24: state[0],
            callsign: state[1]?.trim() || null,
            originCountry: state[2],
            lastContact: state[4],
            longitude: state[5],
            latitude: state[6],
            altitude: state[7],
            onGround: state[8],
            velocity: state[9],
            heading: state[10],
            verticalRate: state[11],
        }));
    }
}
//# sourceMappingURL=aircraft.js.map