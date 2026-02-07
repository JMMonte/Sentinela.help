/**
 * USGS Earthquake Data Collector
 *
 * Fetches earthquake data from USGS GeoJSON feeds.
 */
import { MultiKeyCollector } from "./base-collector.js";
export declare class SeismicCollector extends MultiKeyCollector {
    constructor();
    run(): Promise<void>;
    protected collect(): Promise<void>;
}
//# sourceMappingURL=seismic.d.ts.map