"use client";

import { useEffect, useState, useCallback } from "react";
import {
  fetchEarthquakes,
  type EarthquakeFeature,
} from "@/lib/overlays/seismic-api";

export type SeismicOverlayConfig = {
  enabled: boolean;
  minMagnitude: number;
};

export type SeismicOverlayState = {
  isAvailable: boolean;
  enabled: boolean;
  earthquakes: EarthquakeFeature[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  setEnabled: (enabled: boolean) => void;
  refresh: () => Promise<void>;
};

export function useSeismicOverlay(
  config: SeismicOverlayConfig,
  timeFilterHours: number = 24,
): SeismicOverlayState {
  const [enabled, setEnabled] = useState(false);
  const [earthquakes, setEarthquakes] = useState<EarthquakeFeature[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const isAvailable = config.enabled;

  const refresh = useCallback(async () => {
    if (!isAvailable) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchEarthquakes(config.minMagnitude, timeFilterHours);
      setEarthquakes(data.features);
      setLastUpdated(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch earthquake data");
    } finally {
      setIsLoading(false);
    }
  }, [isAvailable, config.minMagnitude, timeFilterHours]);

  // Fetch when enabled
  useEffect(() => {
    if (!enabled || !isAvailable) return;
    void refresh();
  }, [enabled, isAvailable, refresh]);

  return {
    isAvailable,
    enabled: enabled && isAvailable,
    earthquakes,
    isLoading,
    error,
    lastUpdated,
    setEnabled,
    refresh,
  };
}
