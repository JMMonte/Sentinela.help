/**
 * Abstract base class for all data collectors.
 */

import { storeData, updateCollectorMeta } from "../redis.js";
import { createLogger, type Logger } from "../logger.js";
import { sleep } from "../utils/fetch.js";

export interface CollectorConfig {
  name: string;
  redisKey: string;
  ttlSeconds: number;
  retryAttempts?: number;
  retryDelayMs?: number;
}

export abstract class BaseCollector {
  protected config: CollectorConfig;
  protected logger: Logger;
  private consecutiveErrors: number = 0;
  private isRunning: boolean = false;

  constructor(config: CollectorConfig) {
    this.config = {
      retryAttempts: 3,
      retryDelayMs: 1000,
      ...config,
    };
    this.logger = createLogger(config.name);
  }

  get name(): string {
    return this.config.name;
  }

  /**
   * Implement this method to collect data from the external source.
   * Should return the data to be stored in Redis.
   */
  protected abstract collect(): Promise<unknown>;

  /**
   * Run the collector once. Handles errors and updates metadata.
   */
  async run(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn("Collector already running, skipping");
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      this.logger.debug("Starting collection");

      const data = await this.collectWithRetry();
      await this.store(data);

      this.consecutiveErrors = 0;
      await updateCollectorMeta(this.config.name, "ok", 0);

      const duration = Date.now() - startTime;
      this.logger.info("Collection complete", { durationMs: duration });
    } catch (error) {
      this.consecutiveErrors++;
      await this.handleError(error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Collect with retry logic.
   */
  private async collectWithRetry(): Promise<unknown> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= (this.config.retryAttempts || 0); attempt++) {
      try {
        return await this.collect();
      } catch (error) {
        lastError = error;
        this.logger.warn(`Collection attempt ${attempt + 1} failed`, {
          error: error instanceof Error ? error.message : String(error),
        });

        if (attempt < (this.config.retryAttempts || 0)) {
          const delay = (this.config.retryDelayMs || 1000) * Math.pow(2, attempt);
          await sleep(delay);
        }
      }
    }

    throw lastError;
  }

  /**
   * Store collected data in Redis.
   */
  protected async store(data: unknown): Promise<void> {
    await storeData(this.config.redisKey, data, this.config.ttlSeconds);
  }

  /**
   * Handle collection errors.
   */
  private async handleError(error: unknown): Promise<void> {
    const status = this.consecutiveErrors >= 3 ? "error" : "degraded";

    this.logger.error("Collection failed", error, {
      consecutiveErrors: this.consecutiveErrors,
      status,
    });

    await updateCollectorMeta(this.config.name, status, this.consecutiveErrors);
  }
}

/**
 * Base class for collectors that produce multiple Redis keys.
 */
export abstract class MultiKeyCollector extends BaseCollector {
  /**
   * Store data to a specific key (for multi-key collectors).
   */
  protected async storeToKey(key: string, data: unknown, ttlSeconds?: number): Promise<void> {
    await storeData(key, data, ttlSeconds || this.config.ttlSeconds);
  }
}

/**
 * Base class for WebSocket-based collectors (like Lightning).
 * These run continuously rather than on an interval.
 */
export abstract class WebSocketCollector {
  protected logger: Logger;
  protected config: {
    name: string;
    redisKey: string;
    ttlSeconds: number;
    persistIntervalMs: number;
  };

  constructor(config: {
    name: string;
    redisKey: string;
    ttlSeconds: number;
    persistIntervalMs?: number;
  }) {
    this.config = {
      persistIntervalMs: 10000,
      ...config,
    };
    this.logger = createLogger(config.name);
  }

  get name(): string {
    return this.config.name;
  }

  /**
   * Start the WebSocket connection and data collection.
   */
  abstract start(): Promise<void>;

  /**
   * Stop the WebSocket connection.
   */
  abstract stop(): void;
}
