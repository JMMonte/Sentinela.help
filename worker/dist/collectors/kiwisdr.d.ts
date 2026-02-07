/**
 * KiwiSDR WebSDR Station Collector
 *
 * Fetches public KiwiSDR station locations and status.
 * The API now returns HTML with embedded data in comments,
 * so we parse the HTML page from kiwisdr.com/.public/
 */
import { BaseCollector } from "./base-collector.js";
export type KiwiStation = {
    name: string;
    url: string;
    latitude: number;
    longitude: number;
    users: number;
    usersMax: number;
    antenna: string | null;
    location: string | null;
    snr: number | null;
    offline: boolean;
};
export declare class KiwiSdrCollector extends BaseCollector {
    constructor();
    protected collect(): Promise<KiwiStation[]>;
    /**
     * Parse station data from HTML with embedded comments.
     * Each station is in a div.cl-entry with data in HTML comments.
     */
    private parseHtmlStations;
    /**
     * Parse a single station entry from its HTML block.
     */
    private parseStationEntry;
}
//# sourceMappingURL=kiwisdr.d.ts.map