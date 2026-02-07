/**
 * Worker configuration and environment variables.
 */
import { z } from "zod";
const envSchema = z.object({
    // Redis (Upstash or Vercel KV) - optional if using REDIS_MODE=direct
    KV_REST_API_URL: z.string().url().optional(),
    KV_REST_API_TOKEN: z.string().min(1).optional(),
    // API Keys
    NASA_FIRMS_API_KEY: z.string().optional(),
    WAQI_API_KEY: z.string().optional(),
    APRS_FI_API_KEY: z.string().optional(),
    OPENSKY_CLIENT_ID: z.string().optional(),
    OPENSKY_CLIENT_SECRET: z.string().optional(),
    // Worker configuration
    WORKER_LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
    WORKER_HEALTH_PORT: z.coerce.number().int().min(1).max(65535).default(8080),
    // Feature flags to disable specific collectors
    DISABLE_LIGHTNING: z.coerce.boolean().default(false),
    DISABLE_AIRCRAFT: z.coerce.boolean().default(false),
    DISABLE_SEISMIC: z.coerce.boolean().default(false),
    DISABLE_APRS: z.coerce.boolean().default(false),
    DISABLE_SPACE_WEATHER: z.coerce.boolean().default(false),
    DISABLE_TEC: z.coerce.boolean().default(false),
    DISABLE_AURORA: z.coerce.boolean().default(false),
    DISABLE_FIRES: z.coerce.boolean().default(false),
    DISABLE_KIWISDR: z.coerce.boolean().default(false),
    DISABLE_GFS: z.coerce.boolean().default(false),
    DISABLE_OCEAN: z.coerce.boolean().default(false),
    DISABLE_AIR_QUALITY: z.coerce.boolean().default(false),
    DISABLE_WARNINGS: z.coerce.boolean().default(false),
    DISABLE_PROCIV: z.coerce.boolean().default(false),
    DISABLE_GDACS: z.coerce.boolean().default(false),
});
export function loadConfig() {
    const result = envSchema.safeParse(process.env);
    if (!result.success) {
        console.error("Invalid environment configuration:");
        console.error(result.error.format());
        process.exit(1);
    }
    return result.data;
}
/**
 * Collector configuration with intervals and Redis keys.
 */
export const COLLECTOR_CONFIGS = {
    lightning: {
        name: "lightning",
        redisKey: "kaos:lightning:global",
        ttlSeconds: 60,
        // WebSocket-based, no interval
    },
    aircraft: {
        name: "aircraft",
        redisKey: "kaos:aircraft:global",
        ttlSeconds: 120,
        intervalMs: 60_000, // 60 seconds - OpenSky has strict rate limits
    },
    seismic: {
        name: "seismic",
        redisKeyPattern: "kaos:seismic:{feed}",
        ttlSeconds: 180,
        intervalMs: 60_000, // 1 minute
    },
    aprs: {
        name: "aprs",
        redisKey: "kaos:aprs:global",
        ttlSeconds: 300,
        intervalMs: 180_000, // 3 minutes
    },
    spaceWeather: {
        name: "space-weather",
        redisKey: "kaos:space-weather:current",
        ttlSeconds: 1200,
        intervalMs: 300_000, // 5 minutes
    },
    tec: {
        name: "tec",
        redisKey: "kaos:tec:global",
        ttlSeconds: 1200,
        intervalMs: 900_000, // 15 minutes
    },
    aurora: {
        name: "aurora",
        redisKey: "kaos:aurora:latest",
        ttlSeconds: 600,
        intervalMs: 300_000, // 5 minutes
    },
    fires: {
        name: "fires",
        redisKeyPattern: "kaos:fires:{source}:{days}",
        ttlSeconds: 1200,
        intervalMs: 600_000, // 10 minutes
    },
    kiwisdr: {
        name: "kiwisdr",
        redisKey: "kaos:kiwisdr:stations",
        ttlSeconds: 5400,
        intervalMs: 1_800_000, // 30 minutes
    },
    gfs: {
        name: "gfs",
        redisKeyPattern: "kaos:gfs:{param}",
        ttlSeconds: 5400,
        intervalMs: 1_800_000, // 30 minutes
    },
    oceanCurrents: {
        name: "ocean-currents",
        redisKey: "kaos:ocean-currents:global",
        ttlSeconds: 5400,
        intervalMs: 1_800_000, // 30 minutes
    },
    waves: {
        name: "waves",
        redisKey: "kaos:waves:global",
        ttlSeconds: 5400,
        intervalMs: 1_800_000, // 30 minutes
    },
    sst: {
        name: "sst",
        redisKey: "kaos:sst:global",
        ttlSeconds: 5400,
        intervalMs: 1_800_000, // 30 minutes
    },
    airQuality: {
        name: "air-quality",
        redisKey: "kaos:air-quality:global",
        ttlSeconds: 1200,
        intervalMs: 600_000, // 10 minutes
    },
    warnings: {
        name: "warnings",
        redisKey: "kaos:warnings:ipma",
        ttlSeconds: 2700,
        intervalMs: 900_000, // 15 minutes
    },
    prociv: {
        name: "prociv",
        redisKey: "kaos:prociv:ocorrencias",
        ttlSeconds: 600,
        intervalMs: 120_000, // 2 minutes
    },
    gdacs: {
        name: "gdacs",
        redisKey: "kaos:gdacs:events",
        ttlSeconds: 600,
        intervalMs: 600_000, // 10 minutes
    },
};
//# sourceMappingURL=config.js.map