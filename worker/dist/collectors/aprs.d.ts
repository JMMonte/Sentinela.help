/**
 * APRS-IS (Automatic Packet Reporting System - Internet Service) Collector
 *
 * Connects directly to APRS-IS servers to receive real-time amateur radio
 * position reports with geographic filtering.
 *
 * Protocol: TCP connection to port 14580 with server-side filtering
 * Reference: https://www.aprs-is.net/javAPRSFilter.aspx
 */
import { WebSocketCollector } from "./base-collector.js";
export type AprsStation = {
    callsign: string;
    latitude: number;
    longitude: number;
    symbol: string;
    symbolTable: string;
    comment: string | null;
    lastHeard: number;
    speed: number | null;
    course: number | null;
    altitude: number | null;
    path: string | null;
};
export declare class AprsCollector extends WebSocketCollector {
    private socket;
    private stations;
    private persistInterval;
    private cleanupInterval;
    private reconnectTimeout;
    private isConnecting;
    private shouldReconnect;
    private buffer;
    constructor();
    start(): Promise<void>;
    stop(): void;
    private connect;
    private scheduleReconnect;
    private processBuffer;
    private parseLine;
    /**
     * Parse an APRS packet into a station object.
     * APRS packet format: CALLSIGN>DEST,PATH:DATA
     */
    private parseAprsPacket;
    /**
     * Parse position data from APRS packet.
     * Supports uncompressed and compressed formats.
     */
    private parsePosition;
    /**
     * Parse uncompressed APRS position.
     * Format: DDMM.MMN/DDDMM.MME$ where $ is symbol code
     */
    private parseUncompressedPosition;
    /**
     * Parse compressed APRS position.
     * Format: /YYYYXXXX$cs where YYYY=lat, XXXX=lon (base91), $=symbol, cs=compressed speed/course
     */
    private parseCompressedPosition;
    private persistToRedis;
    private cleanOldStations;
}
//# sourceMappingURL=aprs.d.ts.map