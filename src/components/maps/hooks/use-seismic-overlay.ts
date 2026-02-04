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

const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

export function useSeismicOverlay(
  config: SeismicOverlayConfig
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
      const data = await fetchEarthquakes(config.minMagnitude);
      setEarthquakes(data.features);
      setLastUpdated(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch earthquake data");
    } finally {
      setIsLoading(false);
    }
  }, [isAvailable, config.minMagnitude]);

  // Fetch on enable and auto-refresh
  useEffect(() => {
    if (!enabled || !isAvailable) return;

    void refresh();
    const interval = setInterval(() => void refresh(), REFRESH_INTERVAL);
    return () => clearInterval(interval);
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
