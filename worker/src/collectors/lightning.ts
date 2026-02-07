/**
 * Blitzortung Lightning Detection Network Collector
 *
 * Uses WebSocket connection to receive real-time lightning strike data.
 * This collector runs continuously rather than on an interval.
 */

import WebSocket from "ws";
import { WebSocketCollector } from "./base-collector.js";
import { COLLECTOR_CONFIGS } from "../config.js";
import { storeData, updateCollectorMeta } from "../redis.js";
import { createLogger } from "../logger.js";

const WS_SERVERS = [
  "wss://ws1.blitzortung.org/",
  "wss://ws7.blitzortung.org/",
  "wss://ws8.blitzortung.org/",
];

export type LightningStrike = {
  latitude: number;
  longitude: number;
  time: number;
};

export class LightningCollector extends WebSocketCollector {
  private ws: WebSocket | null = null;
  private strikes: Map<string, LightningStrike> = new Map();
  private persistInterval: ReturnType<typeof setInterval> | null = null;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private isConnecting: boolean = false;
  private shouldReconnect: boolean = true;

  constructor() {
    super({
      name: COLLECTOR_CONFIGS.lightning.name,
      redisKey: COLLECTOR_CONFIGS.lightning.redisKey,
      ttlSeconds: COLLECTOR_CONFIGS.lightning.ttlSeconds,
      persistIntervalMs: 10000,
    });
    this.logger = createLogger("lightning");
  }

  async start(): Promise<void> {
    this.shouldReconnect = true;
    this.connectWebSocket();

    // Persist to Redis every 10 seconds
    this.persistInterval = setInterval(() => {
      this.persistToRedis().catch((error) => {
        this.logger.error("Failed to persist lightning data", error);
      });
    }, this.config.persistIntervalMs);

    // Clean old strikes every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanOldStrikes();
    }, 60000);

    this.logger.info("Lightning collector started");
  }

  stop(): void {
    this.shouldReconnect = false;

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    if (this.persistInterval) {
      clearInterval(this.persistInterval);
      this.persistInterval = null;
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.logger.info("Lightning collector stopped");
  }

  private connectWebSocket(): void {
    if (this.isConnecting || this.ws) return;

    this.isConnecting = true;
    const url = WS_SERVERS[Math.floor(Math.random() * WS_SERVERS.length)];

    this.logger.debug(`Connecting to ${url}`);

    try {
      this.ws = new WebSocket(url);

      this.ws.on("open", () => {
        this.isConnecting = false;
        this.logger.info(`Connected to ${url}`);

        // Subscribe to global lightning data
        this.ws?.send('{"a":111}');

        updateCollectorMeta(this.config.name, "ok", 0).catch(() => {});
      });

      this.ws.on("message", (data: Buffer) => {
        const strike = this.parseStrike(data);
        if (strike) {
          // Use lat+lon+time as key to reduce duplicates
          const key = `${strike.latitude.toFixed(2)}_${strike.longitude.toFixed(2)}_${Math.floor(strike.time / 1000)}`;
          this.strikes.set(key, strike);
        }
      });

      this.ws.on("close", () => {
        this.isConnecting = false;
        this.ws = null;
        this.logger.warn("WebSocket closed");

        if (this.shouldReconnect) {
          this.scheduleReconnect();
        }
      });

      this.ws.on("error", (error: Error) => {
        this.isConnecting = false;
        this.logger.error("WebSocket error", error);
        updateCollectorMeta(this.config.name, "degraded", 1).catch(() => {});
      });
    } catch (error) {
      this.isConnecting = false;
      this.logger.error("Failed to create WebSocket", error);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (!this.shouldReconnect) return;

    this.logger.debug("Scheduling reconnect in 5 seconds");
    this.reconnectTimeout = setTimeout(() => {
      this.connectWebSocket();
    }, 5000);
  }

  private parseStrike(buffer: Buffer): LightningStrike | null {
    // Convert to string, replacing non-ASCII with space
    let str = "";
    for (let i = 0; i < buffer.length; i++) {
      const b = buffer[i];
      if (b >= 0x20 && b < 0x7f) str += String.fromCharCode(b);
      else str += " ";
    }

    // Find "lat" and "lon" markers
    const latIdx = str.indexOf('"lat');
    const lonIdx = str.indexOf("lon");

    if (latIdx === -1 || lonIdx === -1) return null;

    // Extract number sequences after markers
    const latPart = str.substring(latIdx + 4, lonIdx);
    const lonPart = str.substring(lonIdx + 3, lonIdx + 30);

    // Find first number (possibly negative, with decimal)
    const latMatch = latPart.match(/(-?\d+\.?\d*)/);
    const lonMatch = lonPart.match(/(-?\d+\.?\d*)/);

    if (latMatch && lonMatch) {
      const lat = parseFloat(latMatch[1]);
      const lon = parseFloat(lonMatch[1]);

      // Validate coordinates
      if (!isNaN(lat) && !isNaN(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
        return { latitude: lat, longitude: lon, time: Date.now() };
      }
    }

    return null;
  }

  private async persistToRedis(): Promise<void> {
    const strikesArray = Array.from(this.strikes.values()).sort(
      (a, b) => b.time - a.time
    );

    await storeData(
      this.config.redisKey,
      strikesArray,
      this.config.ttlSeconds
    );

    this.logger.debug(`Persisted ${strikesArray.length} strikes to Redis`);
  }

  private cleanOldStrikes(): void {
    const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000;
    let removed = 0;

    for (const [key, strike] of this.strikes) {
      if (strike.time < thirtyMinutesAgo) {
        this.strikes.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      this.logger.debug(`Cleaned ${removed} old strikes`);
    }
  }
}
