/**
 * Sea Surface Temperature (SST) Collector
 *
 * Fetches SST data from NOAA OISST via Coastwatch ERDDAP.
 * 0.25° global resolution, updated daily.
 */
import { BaseCollector } from "./base-collector.js";
type SstGridData = {
    header: {
        nx: number;
        ny: number;
        lo1: number;
        la1: number;
        dx: number;
        dy: number;
    };
    data: number[];
    unit: string;
    name: string;
};
export declare class SstCollector extends BaseCollector {
    constructor();
    protected collect(): Promise<SstGridData>;
}
export {};
//# sourceMappingURL=sst.d.ts.map