/**
 * NOAA Aurora Forecast Collector
 *
 * Fetches aurora probability data from NOAA SWPC OVATION model.
 */
import { BaseCollector } from "./base-collector.js";
export type AuroraData = {
    "Observation Time": string;
    "Forecast Time": string;
    coordinates: [number, number, number][];
};
export declare class AuroraCollector extends BaseCollector {
    constructor();
    protected collect(): Promise<AuroraData>;
}
//# sourceMappingURL=aurora.d.ts.map