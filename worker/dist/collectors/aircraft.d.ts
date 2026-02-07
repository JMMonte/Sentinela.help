/**
 * OpenSky Network Aircraft Collector
 *
 * Fetches global aircraft positions from OpenSky Network ADS-B data.
 * Uses OAuth2 client credentials for higher rate limits (4000 credits/day).
 *
 * API Documentation: https://openskynetwork.github.io/opensky-api/rest.html
 */
import { BaseCollector } from "./base-collector.js";
import { type Config } from "../config.js";
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
export declare class AircraftCollector extends BaseCollector {
    private appConfig;
    private cachedToken;
    constructor(appConfig: Config);
    private getToken;
    protected collect(): Promise<Aircraft[]>;
    private parseResponse;
}
//# sourceMappingURL=aircraft.d.ts.map