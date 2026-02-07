/**
 * Abstract base class for all data collectors.
 */
import { storeData, updateCollectorMeta } from "../redis.js";
import { createLogger } from "../logger.js";
import { sleep } from "../utils/fetch.js";
export class BaseCollector {
    config;
    logger;
    consecutiveErrors = 0;
    isRunning = false;
    constructor(config) {
        this.config = {
            retryAttempts: 3,
            retryDelayMs: 1000,
            ...config,
        };
        this.logger = createLogger(config.name);
    }
    get name() {
        return this.config.name;
    }
    /**
     * Run the collector once. Handles errors and updates metadata.
     */
    async run() {
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
        }
        catch (error) {
            this.consecutiveErrors++;
            await this.handleError(error);
        }
        finally {
            this.isRunning = false;
        }
    }
    /**
     * Collect with retry logic.
     */
    async collectWithRetry() {
        let lastError;
        for (let attempt = 0; attempt <= (this.config.retryAttempts || 0); attempt++) {
            try {
                return await this.collect();
            }
            catch (error) {
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
    async store(data) {
        await storeData(this.config.redisKey, data, this.config.ttlSeconds);
    }
    /**
     * Handle collection errors.
     */
    async handleError(error) {
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
export class MultiKeyCollector extends BaseCollector {
    /**
     * Store data to a specific key (for multi-key collectors).
     */
    async storeToKey(key, data, ttlSeconds) {
        await storeData(key, data, ttlSeconds || this.config.ttlSeconds);
    }
}
/**
 * Base class for WebSocket-based collectors (like Lightning).
 * These run continuously rather than on an interval.
 */
export class WebSocketCollector {
    logger;
    config;
    constructor(config) {
        this.config = {
            persistIntervalMs: 10000,
            ...config,
        };
        this.logger = createLogger(config.name);
    }
    get name() {
        return this.config.name;
    }
}
//# sourceMappingURL=base-collector.js.map