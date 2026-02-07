/**
 * Waves Collector
 *
 * Fetches ocean wave data from PacIOOS WAVEWATCH III ERDDAP.
 * Returns significant wave height at 0.5° resolution.
 */
import { BaseCollector } from "./base-collector.js";
type WaveGridData = {
    header: {
        nx: number;
        ny: number;
        lo1: number;
        la1: number;
        dx: number;
        dy: number;
    };
    heightData: number[];
    periodData: number[];
    directionData: number[];
    time: string;
    unit: string;
    name: string;
};
export declare class WavesCollector extends BaseCollector {
    constructor();
    protected collect(): Promise<WaveGridData>;
}
export {};
//# sourceMappingURL=waves.d.ts.map