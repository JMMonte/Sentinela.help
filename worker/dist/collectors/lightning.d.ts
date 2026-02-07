/**
 * Blitzortung Lightning Detection Network Collector
 *
 * Uses WebSocket connection to receive real-time lightning strike data.
 * This collector runs continuously rather than on an interval.
 */
import { WebSocketCollector } from "./base-collector.js";
export type LightningStrike = {
    latitude: number;
    longitude: number;
    time: number;
};
export declare class LightningCollector extends WebSocketCollector {
    private ws;
    private strikes;
    private persistInterval;
    private cleanupInterval;
    private reconnectTimeout;
    private isConnecting;
    private shouldReconnect;
    constructor();
    start(): Promise<void>;
    stop(): void;
    private connectWebSocket;
    private scheduleReconnect;
    private parseStrike;
    private persistToRedis;
    private cleanOldStrikes;
}
//# sourceMappingURL=lightning.d.ts.map