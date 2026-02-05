import { env } from "@/lib/env";
import type { OverlayConfig } from "@/components/maps/reports-map-client";

/**
 * Get overlay configuration from environment variables.
 * Call this in a server component and pass to ReportsMap.
 */
export function getOverlayConfig(): OverlayConfig {
  return {
    weather: {
      enabled: env.ENABLE_WEATHER_OVERLAY,
      apiKey: env.OPENWEATHERMAP_API_KEY,
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
  };
}
