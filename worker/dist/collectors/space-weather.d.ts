/**
 * NOAA Space Weather Prediction Center Collector
 *
 * Fetches space weather data including Kp index, solar flux, and X-ray flux.
 */
import { BaseCollector } from "./base-collector.js";
export type SpaceWeatherData = {
    kpIndex: number;
    kpDescription: string;
    solarFlux: number | null;
    xrayFlux: string | null;
    timestamp: string;
};
export declare class SpaceWeatherCollector extends BaseCollector {
    constructor();
    protected collect(): Promise<SpaceWeatherData>;
}
//# sourceMappingURL=space-weather.d.ts.map