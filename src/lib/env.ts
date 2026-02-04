import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z
    .string()
    .min(1)
    .default("postgresql://postgres:postgres@localhost:5433/kaos?schema=public"),
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
});
