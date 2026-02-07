"use client";

import { useEffect, useState, useCallback } from "react";
import { fetchSpaceWeather, type SpaceWeatherData } from "@/lib/overlays/space-weather-api";
import { fetchTec, type TecData } from "@/lib/overlays/tec-api";

export type IonosphereOverlayConfig = {
  enabled: boolean;
};

export type IonosphereOverlayState = {
  isAvailable: boolean;
  enabled: boolean;
  spaceWeather: SpaceWeatherData | null;
  tecData: TecData | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  setEnabled: (enabled: boolean) => void;
  refresh: () => Promise<void>;
};

/**
 * Combined hook for ionosphere data (space weather + TEC).
 * Fetches both data sources in parallel when enabled.
 */
export function useIonosphereOverlay(config: IonosphereOverlayConfig): IonosphereOverlayState {
  const [enabled, setEnabled] = useState(false);
  const [spaceWeather, setSpaceWeather] = useState<SpaceWeatherData | null>(null);
  const [tecData, setTecData] = useState<TecData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const isAvailable = config.enabled;

  const refresh = useCallback(async () => {
    if (!isAvailable) return;

    setIsLoading(true);
    setError(null);

    try {
      const [swResult, tecResult] = await Promise.allSettled([
        fetchSpaceWeather(),
        fetchTec(),
      ]);

      if (swResult.status === "fulfilled") {
        setSpaceWeather(swResult.value);
      } else {
        console.warn("Failed to fetch space weather:", swResult.reason);
      }

      if (tecResult.status === "fulfilled") {
        setTecData(tecResult.value);
      } else {
        console.warn("Failed to fetch TEC data:", tecResult.reason);
      }

      if (swResult.status === "rejected" && tecResult.status === "rejected") {
        setError("Failed to fetch ionosphere data");
      }

      setLastUpdated(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch ionosphere data");
    } finally {
      setIsLoading(false);
    }
  }, [isAvailable]);

  // Fetch when enabled
  useEffect(() => {
    if (!enabled || !isAvailable) return;
    void refresh();
  }, [enabled, isAvailable, refresh]);

  return {
    isAvailable,
    enabled: enabled && isAvailable,
    spaceWeather,
    tecData,
    isLoading,
    error,
    lastUpdated,
    setEnabled,
    refresh,
  };
}
