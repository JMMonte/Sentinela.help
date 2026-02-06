import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z
    .string()
    .min(1)
    .default("postgresql://postgres:postgres@localhost:5433/sentinela?schema=public"),
  APP_BASE_URL: z.string().url().optional(),
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
  // ProCiv / Fogos.pt overlay
  ENABLE_PROCIV_OVERLAY: z.coerce.boolean().default(false),
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
});

export const env = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  APP_BASE_URL: process.env.APP_BASE_URL,
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
});
