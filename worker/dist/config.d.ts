/**
 * Worker configuration and environment variables.
 */
import { z } from "zod";
declare const envSchema: z.ZodObject<{
    KV_REST_API_URL: z.ZodOptional<z.ZodString>;
    KV_REST_API_TOKEN: z.ZodOptional<z.ZodString>;
    NASA_FIRMS_API_KEY: z.ZodOptional<z.ZodString>;
    WAQI_API_KEY: z.ZodOptional<z.ZodString>;
    APRS_FI_API_KEY: z.ZodOptional<z.ZodString>;
    OPENSKY_CLIENT_ID: z.ZodOptional<z.ZodString>;
    OPENSKY_CLIENT_SECRET: z.ZodOptional<z.ZodString>;
    WORKER_LOG_LEVEL: z.ZodDefault<z.ZodEnum<["debug", "info", "warn", "error"]>>;
    WORKER_HEALTH_PORT: z.ZodDefault<z.ZodNumber>;
    DISABLE_LIGHTNING: z.ZodDefault<z.ZodEffects<z.ZodUnion<[z.ZodBoolean, z.ZodString]>, boolean, string | boolean>>;
    DISABLE_AIRCRAFT: z.ZodDefault<z.ZodEffects<z.ZodUnion<[z.ZodBoolean, z.ZodString]>, boolean, string | boolean>>;
    DISABLE_SEISMIC: z.ZodDefault<z.ZodEffects<z.ZodUnion<[z.ZodBoolean, z.ZodString]>, boolean, string | boolean>>;
    DISABLE_APRS: z.ZodDefault<z.ZodEffects<z.ZodUnion<[z.ZodBoolean, z.ZodString]>, boolean, string | boolean>>;
    DISABLE_SPACE_WEATHER: z.ZodDefault<z.ZodEffects<z.ZodUnion<[z.ZodBoolean, z.ZodString]>, boolean, string | boolean>>;
    DISABLE_TEC: z.ZodDefault<z.ZodEffects<z.ZodUnion<[z.ZodBoolean, z.ZodString]>, boolean, string | boolean>>;
    DISABLE_AURORA: z.ZodDefault<z.ZodEffects<z.ZodUnion<[z.ZodBoolean, z.ZodString]>, boolean, string | boolean>>;
    DISABLE_FIRES: z.ZodDefault<z.ZodEffects<z.ZodUnion<[z.ZodBoolean, z.ZodString]>, boolean, string | boolean>>;
    DISABLE_KIWISDR: z.ZodDefault<z.ZodEffects<z.ZodUnion<[z.ZodBoolean, z.ZodString]>, boolean, string | boolean>>;
    DISABLE_GFS: z.ZodDefault<z.ZodEffects<z.ZodUnion<[z.ZodBoolean, z.ZodString]>, boolean, string | boolean>>;
    DISABLE_OCEAN: z.ZodDefault<z.ZodEffects<z.ZodUnion<[z.ZodBoolean, z.ZodString]>, boolean, string | boolean>>;
    DISABLE_AIR_QUALITY: z.ZodDefault<z.ZodEffects<z.ZodUnion<[z.ZodBoolean, z.ZodString]>, boolean, string | boolean>>;
    DISABLE_WARNINGS: z.ZodDefault<z.ZodEffects<z.ZodUnion<[z.ZodBoolean, z.ZodString]>, boolean, string | boolean>>;
    DISABLE_PROCIV: z.ZodDefault<z.ZodEffects<z.ZodUnion<[z.ZodBoolean, z.ZodString]>, boolean, string | boolean>>;
    DISABLE_GDACS: z.ZodDefault<z.ZodEffects<z.ZodUnion<[z.ZodBoolean, z.ZodString]>, boolean, string | boolean>>;
}, "strip", z.ZodTypeAny, {
    WORKER_LOG_LEVEL: "debug" | "info" | "warn" | "error";
    WORKER_HEALTH_PORT: number;
    DISABLE_LIGHTNING: boolean;
    DISABLE_AIRCRAFT: boolean;
    DISABLE_SEISMIC: boolean;
    DISABLE_APRS: boolean;
    DISABLE_SPACE_WEATHER: boolean;
    DISABLE_TEC: boolean;
    DISABLE_AURORA: boolean;
    DISABLE_FIRES: boolean;
    DISABLE_KIWISDR: boolean;
    DISABLE_GFS: boolean;
    DISABLE_OCEAN: boolean;
    DISABLE_AIR_QUALITY: boolean;
    DISABLE_WARNINGS: boolean;
    DISABLE_PROCIV: boolean;
    DISABLE_GDACS: boolean;
    KV_REST_API_URL?: string | undefined;
    KV_REST_API_TOKEN?: string | undefined;
    NASA_FIRMS_API_KEY?: string | undefined;
    WAQI_API_KEY?: string | undefined;
    APRS_FI_API_KEY?: string | undefined;
    OPENSKY_CLIENT_ID?: string | undefined;
    OPENSKY_CLIENT_SECRET?: string | undefined;
}, {
    KV_REST_API_URL?: string | undefined;
    KV_REST_API_TOKEN?: string | undefined;
    NASA_FIRMS_API_KEY?: string | undefined;
    WAQI_API_KEY?: string | undefined;
    APRS_FI_API_KEY?: string | undefined;
    OPENSKY_CLIENT_ID?: string | undefined;
    OPENSKY_CLIENT_SECRET?: string | undefined;
    WORKER_LOG_LEVEL?: "debug" | "info" | "warn" | "error" | undefined;
    WORKER_HEALTH_PORT?: number | undefined;
    DISABLE_LIGHTNING?: string | boolean | undefined;
    DISABLE_AIRCRAFT?: string | boolean | undefined;
    DISABLE_SEISMIC?: string | boolean | undefined;
    DISABLE_APRS?: string | boolean | undefined;
    DISABLE_SPACE_WEATHER?: string | boolean | undefined;
    DISABLE_TEC?: string | boolean | undefined;
    DISABLE_AURORA?: string | boolean | undefined;
    DISABLE_FIRES?: string | boolean | undefined;
    DISABLE_KIWISDR?: string | boolean | undefined;
    DISABLE_GFS?: string | boolean | undefined;
    DISABLE_OCEAN?: string | boolean | undefined;
    DISABLE_AIR_QUALITY?: string | boolean | undefined;
    DISABLE_WARNINGS?: string | boolean | undefined;
    DISABLE_PROCIV?: string | boolean | undefined;
    DISABLE_GDACS?: string | boolean | undefined;
}>;
export type Config = z.infer<typeof envSchema>;
export declare function loadConfig(): Config;
/**
 * Collector configuration with intervals and Redis keys.
 */
export declare const COLLECTOR_CONFIGS: {
    readonly lightning: {
        readonly name: "lightning";
        readonly redisKey: "kaos:lightning:global";
        readonly ttlSeconds: 60;
    };
    readonly aircraft: {
        readonly name: "aircraft";
        readonly redisKey: "kaos:aircraft:global";
        readonly ttlSeconds: 120;
        readonly intervalMs: 60000;
    };
    readonly seismic: {
        readonly name: "seismic";
        readonly redisKeyPattern: "kaos:seismic:{feed}";
        readonly ttlSeconds: 180;
        readonly intervalMs: 60000;
    };
    readonly aprs: {
        readonly name: "aprs";
        readonly redisKey: "kaos:aprs:global";
        readonly ttlSeconds: 300;
        readonly intervalMs: 180000;
    };
    readonly spaceWeather: {
        readonly name: "space-weather";
        readonly redisKey: "kaos:space-weather:current";
        readonly ttlSeconds: 1200;
        readonly intervalMs: 300000;
    };
    readonly tec: {
        readonly name: "tec";
        readonly redisKey: "kaos:tec:global";
        readonly ttlSeconds: 1200;
        readonly intervalMs: 900000;
    };
    readonly aurora: {
        readonly name: "aurora";
        readonly redisKey: "kaos:aurora:latest";
        readonly ttlSeconds: 600;
        readonly intervalMs: 300000;
    };
    readonly fires: {
        readonly name: "fires";
        readonly redisKeyPattern: "kaos:fires:{source}:{days}";
        readonly ttlSeconds: 1200;
        readonly intervalMs: 600000;
    };
    readonly kiwisdr: {
        readonly name: "kiwisdr";
        readonly redisKey: "kaos:kiwisdr:stations";
        readonly ttlSeconds: 5400;
        readonly intervalMs: 1800000;
    };
    readonly gfs: {
        readonly name: "gfs";
        readonly redisKeyPattern: "kaos:gfs:{param}";
        readonly ttlSeconds: 5400;
        readonly intervalMs: 1800000;
    };
    readonly oceanCurrents: {
        readonly name: "ocean-currents";
        readonly redisKey: "kaos:ocean-currents:global";
        readonly ttlSeconds: 5400;
        readonly intervalMs: 1800000;
    };
    readonly waves: {
        readonly name: "waves";
        readonly redisKey: "kaos:waves:global";
        readonly ttlSeconds: 5400;
        readonly intervalMs: 1800000;
    };
    readonly sst: {
        readonly name: "sst";
        readonly redisKey: "kaos:sst:global";
        readonly ttlSeconds: 5400;
        readonly intervalMs: 1800000;
    };
    readonly airQuality: {
        readonly name: "air-quality";
        readonly redisKey: "kaos:air-quality:global";
        readonly ttlSeconds: 1200;
        readonly intervalMs: 600000;
    };
    readonly warnings: {
        readonly name: "warnings";
        readonly redisKey: "kaos:warnings:ipma";
        readonly ttlSeconds: 2700;
        readonly intervalMs: 900000;
    };
    readonly prociv: {
        readonly name: "prociv";
        readonly redisKey: "kaos:prociv:ocorrencias";
        readonly ttlSeconds: 600;
        readonly intervalMs: 120000;
    };
    readonly gdacs: {
        readonly name: "gdacs";
        readonly redisKey: "kaos:gdacs:events";
        readonly ttlSeconds: 600;
        readonly intervalMs: 600000;
    };
};
export {};
//# sourceMappingURL=config.d.ts.map