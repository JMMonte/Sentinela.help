import { env } from "@/lib/env";
import type { OverlayConfig } from "@/components/maps/reports-map-client";

/**
 * Get overlay configuration from environment variables.
 * Call this in a server component and pass to ReportsMap.
 *
 * Note: API keys are NOT passed to client components.
 * Weather data is fetched through server-side proxy endpoints.
 */
export function getOverlayConfig(): OverlayConfig {
  return {
    weather: {
      // API key handled server-side via /api/weather/* proxy routes
      enabled: env.ENABLE_WEATHER_OVERLAY && !!env.OPENWEATHERMAP_API_KEY,
    },
    seismic: {
      enabled: env.ENABLE_SEISMIC_OVERLAY,
      minMagnitude: env.SEISMIC_MIN_MAGNITUDE,
    },
    prociv: {
      enabled: env.ENABLE_PROCIV_OVERLAY,
    },
    rainfall: {
      enabled: env.ENABLE_RAINFALL_OVERLAY,
    },
    warnings: {
      enabled: env.ENABLE_WARNINGS_OVERLAY,
    },
    wind: {
      enabled: env.ENABLE_WIND_OVERLAY,
    },
    // GFS forecast overlays
    temperature: {
      enabled: env.ENABLE_GFS_OVERLAYS,
    },
    humidity: {
      enabled: env.ENABLE_GFS_OVERLAYS,
    },
    precipitation: {
      enabled: env.ENABLE_GFS_OVERLAYS,
    },
    cloudCover: {
      enabled: env.ENABLE_GFS_OVERLAYS,
    },
    cape: {
      enabled: env.ENABLE_GFS_OVERLAYS,
    },
    fireWeather: {
      enabled: env.ENABLE_FIRE_WEATHER_OVERLAY,
    },
    fires: {
      enabled: env.ENABLE_FIRES_OVERLAY,
    },
    aurora: {
      enabled: env.ENABLE_AURORA_OVERLAY,
    },
    airQuality: {
      enabled: env.ENABLE_AIR_QUALITY_OVERLAY,
    },
    uvIndex: {
      enabled: env.ENABLE_UV_INDEX_OVERLAY,
    },
    waves: {
      enabled: env.ENABLE_WAVES_OVERLAY,
    },
    oceanCurrents: {
      enabled: env.ENABLE_OCEAN_CURRENTS_OVERLAY,
    },
    sst: {
      enabled: env.ENABLE_SST_OVERLAY,
    },
  };
}
