/**
 * Redis client wrapper for the worker.
 *
 * Supports two modes:
 * - HTTP mode (Upstash): Uses @upstash/redis for production
 * - Direct mode: Uses ioredis for local development (no size limits)
 *
 * Set REDIS_MODE=direct and REDIS_URL=redis://localhost:6379 for direct mode.
 */
import { Redis as UpstashRedis } from "@upstash/redis";
import { Redis as IORedis } from "ioredis";
import { createLogger } from "./logger.js";
const logger = createLogger("redis");
let mode = "upstash";
let upstashClient = null;
let ioredisClient = null;
export function initRedis(config) {
    // Check if we should use direct Redis connection
    const redisMode = process.env.REDIS_MODE;
    const redisUrl = process.env.REDIS_URL;
    if (redisMode === "direct" && redisUrl) {
        mode = "direct";
        ioredisClient = new IORedis(redisUrl, {
            maxRetriesPerRequest: 3,
            lazyConnect: true,
        });
        ioredisClient.on("error", (err) => {
            logger.error("Redis connection error", { error: err.message });
        });
        ioredisClient.on("connect", () => {
            logger.info("Direct Redis connection established");
        });
        logger.info("Redis client initialized (direct mode)", { url: redisUrl });
    }
    else if (config.KV_REST_API_URL && config.KV_REST_API_TOKEN) {
        mode = "upstash";
        upstashClient = new UpstashRedis({
            url: config.KV_REST_API_URL,
            token: config.KV_REST_API_TOKEN,
        });
        logger.info("Redis client initialized (Upstash HTTP mode)");
    }
    else {
        logger.error("No Redis configuration found. Set REDIS_MODE=direct with REDIS_URL, or provide KV_REST_API_URL and KV_REST_API_TOKEN");
        process.exit(1);
    }
}
/**
 * Store data in Redis with TTL.
 */
export async function storeData(key, data, ttlSeconds) {
    if (mode === "direct" && ioredisClient) {
        // Direct mode: serialize JSON and use native SET with EX
        const serialized = JSON.stringify(data);
        await ioredisClient.set(key, serialized, "EX", ttlSeconds);
    }
    else if (upstashClient) {
        // Upstash mode
        await upstashClient.set(key, data, { ex: ttlSeconds });
    }
    else {
        throw new Error("Redis not initialized");
    }
    logger.debug(`Stored data in ${key}`, { ttlSeconds });
}
/**
 * Get data from Redis.
 */
export async function getData(key) {
    if (mode === "direct" && ioredisClient) {
        const result = await ioredisClient.get(key);
        return result ? JSON.parse(result) : null;
    }
    else if (upstashClient) {
        return upstashClient.get(key);
    }
    throw new Error("Redis not initialized");
}
/**
 * Update collector metadata.
 */
export async function updateCollectorMeta(collectorName, status, errorCount = 0) {
    const now = Date.now();
    const statusKey = `kaos:meta:${collectorName}:status`;
    const lastRunKey = `kaos:meta:${collectorName}:last-run`;
    const errorCountKey = `kaos:meta:${collectorName}:error-count`;
    if (mode === "direct" && ioredisClient) {
        const pipeline = ioredisClient.pipeline();
        pipeline.set(statusKey, status);
        pipeline.set(lastRunKey, now.toString());
        pipeline.set(errorCountKey, errorCount.toString());
        await pipeline.exec();
    }
    else if (upstashClient) {
        await Promise.all([
            upstashClient.set(statusKey, status),
            upstashClient.set(lastRunKey, now),
            upstashClient.set(errorCountKey, errorCount),
        ]);
    }
    else {
        throw new Error("Redis not initialized");
    }
}
/**
 * Get all collector statuses for health check.
 */
export async function getAllCollectorStatuses() {
    const result = {};
    if (mode === "direct" && ioredisClient) {
        const keys = await ioredisClient.keys("kaos:meta:*:status");
        for (const key of keys) {
            const collectorName = key.replace("kaos:meta:", "").replace(":status", "");
            const [status, lastRun, errorCount] = await Promise.all([
                ioredisClient.get(`kaos:meta:${collectorName}:status`),
                ioredisClient.get(`kaos:meta:${collectorName}:last-run`),
                ioredisClient.get(`kaos:meta:${collectorName}:error-count`),
            ]);
            result[collectorName] = {
                status: status || "unknown",
                lastRun: lastRun ? parseInt(lastRun, 10) : 0,
                errorCount: errorCount ? parseInt(errorCount, 10) : 0,
            };
        }
    }
    else if (upstashClient) {
        const keys = await upstashClient.keys("kaos:meta:*:status");
        for (const key of keys) {
            const collectorName = key.replace("kaos:meta:", "").replace(":status", "");
            const [status, lastRun, errorCount] = await Promise.all([
                upstashClient.get(`kaos:meta:${collectorName}:status`),
                upstashClient.get(`kaos:meta:${collectorName}:last-run`),
                upstashClient.get(`kaos:meta:${collectorName}:error-count`),
            ]);
            result[collectorName] = {
                status: status || "unknown",
                lastRun: lastRun || 0,
                errorCount: errorCount || 0,
            };
        }
    }
    return result;
}
/**
 * Check Redis connectivity.
 */
export async function pingRedis() {
    try {
        if (mode === "direct" && ioredisClient) {
            await ioredisClient.ping();
            return true;
        }
        else if (upstashClient) {
            await upstashClient.ping();
            return true;
        }
        return false;
    }
    catch {
        return false;
    }
}
/**
 * Close Redis connection.
 */
export async function closeRedis() {
    if (mode === "direct" && ioredisClient) {
        await ioredisClient.quit();
        ioredisClient = null;
    }
    upstashClient = null;
    logger.info("Redis connection closed");
}
/**
 * Get current Redis mode.
 */
export function getRedisMode() {
    return mode;
}
//# sourceMappingURL=redis.js.map