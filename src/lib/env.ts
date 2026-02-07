import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z
    .string()
    .min(1)
    .default("postgresql://postgres:postgres@localhost:5433/sentinela?schema=public"),
  APP_BASE_URL: z.string().url().optional(),
  // Upstash Redis for shared cache (preferred)
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
  // Vercel KV (legacy fallback, uses Upstash under the hood)
  KV_REST_API_URL: z.string().url().optional(),
  KV_REST_API_TOKEN: z.string().min(1).optional(),
  GOV_CONTACT_EMAIL: z.string().email().optional(),
  MAX_UPLOAD_IMAGES: z.coerce.number().int().min(1).max(10).default(3),
  MAX_UPLOAD_BYTES: z.coerce
    .number()
    .int()
    .min(1)
    .max(50 * 1024 * 1024)
    .default(5 * 1024 * 1024),
  ENABLE_NOMINATIM: z.coerce.boolean().default(false),
  NOMINATIM_USER_AGENT: z.string().min(1).optional(),
  // Weather overlay (OpenWeatherMap)
  ENABLE_WEATHER_OVERLAY: z.coerce.boolean().default(false),
  OPENWEATHERMAP_API_KEY: z.string().min(1).optional(),
  // Seismic overlay (USGS)
  ENABLE_SEISMIC_OVERLAY: z.coerce.boolean().default(false),
  SEISMIC_MIN_MAGNITUDE: z.coerce.number().min(0).max(10).default(2.5),
  // ProCiv / Fogos.pt overlay (disabled - API broken)
  ENABLE_PROCIV_OVERLAY: z.coerce.boolean().default(false),
  // GDACS global disasters overlay (earthquakes, floods, cyclones, etc.)
  ENABLE_GDACS_OVERLAY: z.coerce.boolean().default(true),
  // Rainfall overlay (IPMA)
  ENABLE_RAINFALL_OVERLAY: z.coerce.boolean().default(false),
  // IPMA weather warnings overlay
  ENABLE_WARNINGS_OVERLAY: z.coerce.boolean().default(false),
  // Wind particle overlay (NOAA GFS, no key required)
  ENABLE_WIND_OVERLAY: z.coerce.boolean().default(false),
  // GFS forecast overlays (temperature, humidity, precipitation, etc.)
  ENABLE_GFS_OVERLAYS: z.coerce.boolean().default(false),
  // Fire Weather Index overlay (composite of temp + humidity)
  ENABLE_FIRE_WEATHER_OVERLAY: z.coerce.boolean().default(false),
  // NASA FIRMS fire detection (requires API key)
  ENABLE_FIRES_OVERLAY: z.coerce.boolean().default(false),
  NASA_FIRMS_API_KEY: z.string().min(1).optional(),
  // Aurora Borealis/Australis overlay (NOAA SWPC, no key required)
  ENABLE_AURORA_OVERLAY: z.coerce.boolean().default(false),
  // Ocean currents overlay (NOAA CoastWatch ERDDAP, no key required)
  ENABLE_OCEAN_CURRENTS_OVERLAY: z.coerce.boolean().default(false),
  // Air Quality overlay (WAQI stations, requires API key)
  ENABLE_AIR_QUALITY_OVERLAY: z.coerce.boolean().default(false),
  WAQI_API_KEY: z.string().optional(),
  // UV Index overlay (Open-Meteo, no key required)
  ENABLE_UV_INDEX_OVERLAY: z.coerce.boolean().default(false),
  // Ocean waves overlay (PacIOOS WAVEWATCH III, no key required)
  ENABLE_WAVES_OVERLAY: z.coerce.boolean().default(false),
  // Sea Surface Temperature overlay (NOAA OISST, no key required)
  ENABLE_SST_OVERLAY: z.coerce.boolean().default(false),
  // Radio data overlays
  // Aircraft overlay (OpenSky Network - OAuth2 credentials for 4000 credits/day vs 400 anonymous)
  ENABLE_AIRCRAFT_OVERLAY: z.coerce.boolean().default(false),
  OPENSKY_CLIENT_ID: z.string().optional(),
  OPENSKY_CLIENT_SECRET: z.string().optional(),
  ENABLE_LIGHTNING_OVERLAY: z.coerce.boolean().default(false),
  ENABLE_KIWISDR_OVERLAY: z.coerce.boolean().default(false),
  ENABLE_APRS_OVERLAY: z.coerce.boolean().default(false),
  APRS_FI_API_KEY: z.string().optional(),
  ENABLE_SPACE_WEATHER_OVERLAY: z.coerce.boolean().default(false),
  ENABLE_TEC_OVERLAY: z.coerce.boolean().default(false),
});

export const env = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  APP_BASE_URL: process.env.APP_BASE_URL,
  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
  KV_REST_API_URL: process.env.KV_REST_API_URL,
  KV_REST_API_TOKEN: process.env.KV_REST_API_TOKEN,
  GOV_CONTACT_EMAIL: process.env.GOV_CONTACT_EMAIL,
  MAX_UPLOAD_IMAGES: process.env.MAX_UPLOAD_IMAGES,
  MAX_UPLOAD_BYTES: process.env.MAX_UPLOAD_BYTES,
  ENABLE_NOMINATIM: process.env.ENABLE_NOMINATIM,
  NOMINATIM_USER_AGENT: process.env.NOMINATIM_USER_AGENT,
  ENABLE_WEATHER_OVERLAY: process.env.ENABLE_WEATHER_OVERLAY,
  OPENWEATHERMAP_API_KEY: process.env.OPENWEATHERMAP_API_KEY,
  ENABLE_SEISMIC_OVERLAY: process.env.ENABLE_SEISMIC_OVERLAY,
  SEISMIC_MIN_MAGNITUDE: process.env.SEISMIC_MIN_MAGNITUDE,
  ENABLE_PROCIV_OVERLAY: process.env.ENABLE_PROCIV_OVERLAY,
  ENABLE_GDACS_OVERLAY: process.env.ENABLE_GDACS_OVERLAY,
  ENABLE_RAINFALL_OVERLAY: process.env.ENABLE_RAINFALL_OVERLAY,
  ENABLE_WARNINGS_OVERLAY: process.env.ENABLE_WARNINGS_OVERLAY,
  ENABLE_WIND_OVERLAY: process.env.ENABLE_WIND_OVERLAY,
  ENABLE_GFS_OVERLAYS: process.env.ENABLE_GFS_OVERLAYS,
  ENABLE_FIRE_WEATHER_OVERLAY: process.env.ENABLE_FIRE_WEATHER_OVERLAY,
  ENABLE_FIRES_OVERLAY: process.env.ENABLE_FIRES_OVERLAY,
  NASA_FIRMS_API_KEY: process.env.NASA_FIRMS_API_KEY,
  ENABLE_AURORA_OVERLAY: process.env.ENABLE_AURORA_OVERLAY,
  ENABLE_OCEAN_CURRENTS_OVERLAY: process.env.ENABLE_OCEAN_CURRENTS_OVERLAY,
  ENABLE_AIR_QUALITY_OVERLAY: process.env.ENABLE_AIR_QUALITY_OVERLAY,
  WAQI_API_KEY: process.env.WAQI_API_KEY,
  ENABLE_UV_INDEX_OVERLAY: process.env.ENABLE_UV_INDEX_OVERLAY,
  ENABLE_WAVES_OVERLAY: process.env.ENABLE_WAVES_OVERLAY,
  ENABLE_SST_OVERLAY: process.env.ENABLE_SST_OVERLAY,
  // Radio data overlays
  ENABLE_AIRCRAFT_OVERLAY: process.env.ENABLE_AIRCRAFT_OVERLAY,
  OPENSKY_CLIENT_ID: process.env.OPENSKY_CLIENT_ID,
  OPENSKY_CLIENT_SECRET: process.env.OPENSKY_CLIENT_SECRET,
  ENABLE_LIGHTNING_OVERLAY: process.env.ENABLE_LIGHTNING_OVERLAY,
  ENABLE_KIWISDR_OVERLAY: process.env.ENABLE_KIWISDR_OVERLAY,
  ENABLE_APRS_OVERLAY: process.env.ENABLE_APRS_OVERLAY,
  APRS_FI_API_KEY: process.env.APRS_FI_API_KEY,
  ENABLE_SPACE_WEATHER_OVERLAY: process.env.ENABLE_SPACE_WEATHER_OVERLAY,
  ENABLE_TEC_OVERLAY: process.env.ENABLE_TEC_OVERLAY,
});
