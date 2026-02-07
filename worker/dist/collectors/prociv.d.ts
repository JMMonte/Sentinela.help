/**
 * Portuguese Civil Protection (ProCiv) / Fogos.pt Collector
 *
 * Fetches active and recent fire/emergency incidents from Portugal.
 */
import { BaseCollector } from "./base-collector.js";
type FogosIncident = {
    id: string;
    dateTime: {
        sec: number;
    };
    [key: string]: unknown;
};
export type ProcivData = {
    success: boolean;
    data: FogosIncident[];
    fetchedAt: string;
};
export declare class ProcivCollector extends BaseCollector {
    constructor();
    protected collect(): Promise<ProcivData>;
    private fetchEndpoint;
}
export {};
//# sourceMappingURL=prociv.d.ts.map