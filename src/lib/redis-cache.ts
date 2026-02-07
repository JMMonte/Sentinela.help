/**
 * Redis cache utility for reading overlay data from Redis.
 *
 * The background worker writes data to Redis, and the Next.js app reads it.
 * Includes fallback to direct fetching when Redis is unavailable or data is stale.
 *
 * Supports two modes:
 * - HTTP mode (Upstash): Uses @upstash/redis for production
 * - Direct mode: Uses ioredis for local development
 *
 * Set REDIS_MODE=direct and REDIS_URL for local development.
 */

import { Redis as UpstashRedis } from "@upstash/redis";
import IORedis from "ioredis";
import { env } from "./env";

type RedisMode = "upstash" | "direct";

// Lazy-initialized Redis clients
let mode: RedisMode | null = null;
let upstashClient: UpstashRedis | null = null;
let ioredisClient: IORedis | null = null;

function initRedis(): { mode: RedisMode; upstash: UpstashRedis | null; ioredis: IORedis | null } {
  if (mode !== null) {
    return { mode, upstash: upstashClient, ioredis: ioredisClient };
  }

  // Check for direct mode (local development)
  const redisMode = process.env.REDIS_MODE;
  const redisUrl = process.env.REDIS_URL;

  if (redisMode === "direct" && redisUrl) {
    mode = "direct";
    ioredisClient = new IORedis(redisUrl, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });
    console.log("[redis-cache] Using direct Redis mode:", redisUrl);
    return { mode, upstash: null, ioredis: ioredisClient };
  }

  // Default to Upstash HTTP mode
  if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
    mode = "upstash";
    upstashClient = new UpstashRedis({
      url: env.UPSTASH_REDIS_REST_URL,
      token: env.UPSTASH_REDIS_REST_TOKEN,
    });
    return { mode, upstash: upstashClient, ioredis: null };
  }

  mode = "upstash"; // Default but no client
  return { mode, upstash: null, ioredis: null };
}

/**
 * Get data from Redis cache.
 * No fallbacks - data must come from Redis (populated by worker).
 *
 * @param key Redis key (e.g., "kaos:seismic:day")
 * @returns Cached data or null if unavailable
 */
export async function getFromRedis<T>(key: string): Promise<T | null> {
  const { mode: redisMode, upstash, ioredis } = initRedis();

  // No Redis configured
  if ((redisMode === "upstash" && !upstash) || (redisMode === "direct" && !ioredis)) {
    console.error(`[redis-cache] Redis not configured, cannot fetch ${key}`);
    return null;
  }

  try {
    let data: T | null = null;

    if (redisMode === "direct" && ioredis) {
      // Direct mode: parse JSON from string
      const result = await ioredis.get(key);
      data = result ? (JSON.parse(result) as T) : null;
    } else if (upstash) {
      // Upstash mode
      data = await upstash.get<T>(key);
    }

    if (data === null) {
      console.warn(`[redis-cache] Cache miss for ${key}`);
    }

    return data;
  } catch (error) {
    console.error(`[redis-cache] Error fetching ${key}:`, error);
    throw error;
  }
}


/**
 * Check if Redis is available and connected.
 */
export async function isRedisAvailable(): Promise<boolean> {
  const { mode: redisMode, upstash, ioredis } = initRedis();

  try {
    if (redisMode === "direct" && ioredis) {
      await ioredis.ping();
      return true;
    } else if (upstash) {
      await upstash.ping();
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Get collector health status from Redis metadata.
 */
export async function getCollectorStatus(
  collectorName: string
): Promise<{ status: string; lastRun?: number; errorCount?: number } | null> {
  const { mode: redisMode, upstash, ioredis } = initRedis();

  if ((redisMode === "upstash" && !upstash) || (redisMode === "direct" && !ioredis)) {
    return null;
  }

  try {
    let status: string | null = null;
    let lastRun: number | null = null;
    let errorCount: number | null = null;

    if (redisMode === "direct" && ioredis) {
      const results = await Promise.all([
        ioredis.get(`kaos:meta:${collectorName}:status`),
        ioredis.get(`kaos:meta:${collectorName}:last-run`),
        ioredis.get(`kaos:meta:${collectorName}:error-count`),
      ]);
      status = results[0];
      lastRun = results[1] ? parseInt(results[1], 10) : null;
      errorCount = results[2] ? parseInt(results[2], 10) : null;
    } else if (upstash) {
      const results = await Promise.all([
        upstash.get<string>(`kaos:meta:${collectorName}:status`),
        upstash.get<number>(`kaos:meta:${collectorName}:last-run`),
        upstash.get<number>(`kaos:meta:${collectorName}:error-count`),
      ]);
      status = results[0];
      lastRun = results[1];
      errorCount = results[2];
    }

    if (!status) return null;

    return {
      status,
      lastRun: lastRun ?? undefined,
      errorCount: errorCount ?? undefined,
    };
  } catch {
    return null;
  }
}

export type CacheResult<T> = {
  data: T;
  source: "cache" | "fetch";
};

/**
 * Cache-aside pattern for on-demand API data with caching.
 *
 * 1. Check Redis for cached data
 * 2. If not found, fetch from API and store in Redis
 * 3. Returns the data with source info
 *
 * Note: This is for on-demand API data, not worker-populated data.
 * Use getFromRedis for worker-populated data.
 *
 * @param key Redis key (e.g., "kaos:weather:current:41.2:-8.5")
 * @param fetcher Function to fetch from API if not cached
 * @param ttlSeconds TTL for cached data (default: 300 = 5 min)
 */
export async function cacheAside<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number = 300
): Promise<CacheResult<T>> {
  const { mode: redisMode, upstash, ioredis } = initRedis();

  // No Redis configured - fetch directly (development mode)
  if ((redisMode === "upstash" && !upstash) || (redisMode === "direct" && !ioredis)) {
    console.warn(`[redis-cache] Redis not configured, fetching directly for ${key}`);
    const data = await fetcher();
    return { data, source: "fetch" };
  }

  try {
    // Check cache first
    let cached: T | null = null;

    if (redisMode === "direct" && ioredis) {
      const result = await ioredis.get(key);
      cached = result ? (JSON.parse(result) as T) : null;
    } else if (upstash) {
      cached = await upstash.get<T>(key);
    }

    if (cached !== null) {
      return { data: cached, source: "cache" };
    }

    // Cache miss - fetch from API
    const data = await fetcher();

    // Store in cache (fire and forget for faster response)
    if (redisMode === "direct" && ioredis) {
      ioredis.set(key, JSON.stringify(data), "EX", ttlSeconds).catch((err: Error) => {
        console.error(`[redis-cache] Failed to cache ${key}:`, err);
      });
    } else if (upstash) {
      upstash.set(key, data, { ex: ttlSeconds }).catch((err: Error) => {
        console.error(`[redis-cache] Failed to cache ${key}:`, err);
      });
    }

    return { data, source: "fetch" };
  } catch (error) {
    console.error(`[redis-cache] Error in cacheAside for ${key}:`, error);
    throw error;
  }
}
