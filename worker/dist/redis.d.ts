/**
 * Redis client wrapper for the worker.
 *
 * Supports two modes:
 * - HTTP mode (Upstash): Uses @upstash/redis for production
 * - Direct mode: Uses ioredis for local development (no size limits)
 *
 * Set REDIS_MODE=direct and REDIS_URL=redis://localhost:6379 for direct mode.
 */
import type { Config } from "./config.js";
type RedisMode = "upstash" | "direct";
export declare function initRedis(config: Config): void;
/**
 * Store data in Redis with TTL.
 */
export declare function storeData<T>(key: string, data: T, ttlSeconds: number): Promise<void>;
/**
 * Get data from Redis.
 */
export declare function getData<T>(key: string): Promise<T | null>;
/**
 * Update collector metadata.
 */
export declare function updateCollectorMeta(collectorName: string, status: "ok" | "error" | "degraded", errorCount?: number): Promise<void>;
/**
 * Get all collector statuses for health check.
 */
export declare function getAllCollectorStatuses(): Promise<Record<string, {
    status: string;
    lastRun: number;
    errorCount: number;
}>>;
/**
 * Check Redis connectivity.
 */
export declare function pingRedis(): Promise<boolean>;
/**
 * Close Redis connection.
 */
export declare function closeRedis(): Promise<void>;
/**
 * Get current Redis mode.
 */
export declare function getRedisMode(): RedisMode;
export {};
//# sourceMappingURL=redis.d.ts.map