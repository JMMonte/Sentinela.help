/**
 * GFS (Global Forecast System) Collector
 *
 * Fetches weather data from NOAA GFS at 0.25° resolution.
 * Handles multiple parameters: wind, temperature, humidity, precipitation, clouds, CAPE, UV index.
 */
import { MultiKeyCollector } from "./base-collector.js";
export declare class GfsCollector extends MultiKeyCollector {
    constructor();
    protected collect(): Promise<null>;
    private collectTemperature;
    private collectHumidity;
    private collectPrecipitation;
    private collectCloudCover;
    private collectCape;
    private collectWind;
    private collectUvIndex;
}
//# sourceMappingURL=gfs.d.ts.map