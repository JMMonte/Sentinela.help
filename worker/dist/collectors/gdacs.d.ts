/**
 * GDACS (Global Disaster Alert and Coordination System) Collector
 *
 * Fetches global disaster alerts: earthquakes, floods, cyclones, volcanoes, wildfires, droughts.
 * Data source: https://www.gdacs.org/
 */
import { BaseCollector } from "./base-collector.js";
type GdacsEventType = "EQ" | "FL" | "TC" | "VO" | "WF" | "DR";
type GdacsAlertLevel = "Green" | "Orange" | "Red";
export type GdacsTrackPoint = {
    lng: number;
    lat: number;
    time: string;
    isForecast: boolean;
    index: number;
};
export type GdacsCycloneData = {
    trackPoints: GdacsTrackPoint[];
    forecastCone?: number[][];
    windSpeed: number;
};
export type GdacsEvent = {
    id: string;
    eventType: GdacsEventType;
    name: string;
    description: string;
    alertLevel: GdacsAlertLevel;
    country: string;
    countries: string[];
    lat: number;
    lng: number;
    fromDate: string;
    toDate: string;
    severity: number;
    severityText: string;
    iconUrl: string;
    reportUrl: string;
    isCurrent: boolean;
    cycloneData?: GdacsCycloneData;
};
export type GdacsData = {
    events: GdacsEvent[];
    fetchedAt: string;
};
export declare class GdacsCollector extends BaseCollector {
    constructor();
    protected collect(): Promise<GdacsData>;
}
export {};
//# sourceMappingURL=gdacs.d.ts.map