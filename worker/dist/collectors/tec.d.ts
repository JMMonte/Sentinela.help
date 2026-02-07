/**
 * NOAA Total Electron Content (TEC) Collector
 *
 * TEC data indicates ionospheric electron density,
 * which affects GPS accuracy and radio propagation.
 *
 * Uses the new GloTEC (Global TEC) product from NOAA SWPC
 * which provides global coverage via GeoJSON format.
 */
import { BaseCollector } from "./base-collector.js";
export type TecData = {
    grid: number[][];
    latMin: number;
    latMax: number;
    lonMin: number;
    lonMax: number;
    latStep: number;
    lonStep: number;
    timestamp: string;
    unit: string;
};
export declare class TecCollector extends BaseCollector {
    constructor();
    protected collect(): Promise<TecData>;
    private parseGloTecGeoJSON;
    private createDefaultTecData;
}
//# sourceMappingURL=tec.d.ts.map