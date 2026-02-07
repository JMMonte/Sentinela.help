/**
 * Ocean Currents Collector
 *
 * Fetches ocean current data from NOAA CoastWatch ERDDAP.
 * Uses geostrophic velocities from satellite altimetry.
 */
import { BaseCollector } from "./base-collector.js";
type VelocityHeader = {
    parameterCategory: number;
    parameterNumber: number;
    parameterNumberName: string;
    parameterUnit: string;
    nx: number;
    ny: number;
    lo1: number;
    la1: number;
    dx: number;
    dy: number;
};
type VelocityData = {
    header: VelocityHeader;
    data: (number | null)[];
}[];
export declare class OceanCurrentsCollector extends BaseCollector {
    constructor();
    protected collect(): Promise<VelocityData>;
    private parseErddapResponse;
}
export {};
//# sourceMappingURL=ocean-currents.d.ts.map