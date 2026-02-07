/**
 * Abstract base class for all data collectors.
 */
import { type Logger } from "../logger.js";
export interface CollectorConfig {
    name: string;
    redisKey: string;
    ttlSeconds: number;
    retryAttempts?: number;
    retryDelayMs?: number;
}
export declare abstract class BaseCollector {
    protected config: CollectorConfig;
    protected logger: Logger;
    private consecutiveErrors;
    private isRunning;
    constructor(config: CollectorConfig);
    get name(): string;
    /**
     * Implement this method to collect data from the external source.
     * Should return the data to be stored in Redis.
     */
    protected abstract collect(): Promise<unknown>;
    /**
     * Run the collector once. Handles errors and updates metadata.
     */
    run(): Promise<void>;
    /**
     * Collect with retry logic.
     */
    private collectWithRetry;
    /**
     * Store collected data in Redis.
     */
    protected store(data: unknown): Promise<void>;
    /**
     * Handle collection errors.
     */
    private handleError;
}
/**
 * Base class for collectors that produce multiple Redis keys.
 */
export declare abstract class MultiKeyCollector extends BaseCollector {
    /**
     * Store data to a specific key (for multi-key collectors).
     */
    protected storeToKey(key: string, data: unknown, ttlSeconds?: number): Promise<void>;
}
/**
 * Base class for WebSocket-based collectors (like Lightning).
 * These run continuously rather than on an interval.
 */
export declare abstract class WebSocketCollector {
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
    });
    get name(): string;
    /**
     * Start the WebSocket connection and data collection.
     */
    abstract start(): Promise<void>;
    /**
     * Stop the WebSocket connection.
     */
    abstract stop(): void;
}
//# sourceMappingURL=base-collector.d.ts.map