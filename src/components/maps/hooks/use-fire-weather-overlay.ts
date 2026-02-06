"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { fetchFireWeatherData } from "@/lib/overlays/fire-weather-api";
import type { GfsGridData } from "@/lib/overlays/gfs-utils";

export type FireWeatherOverlayConfig = {
  enabled: boolean;
};

export type FireWeatherOverlayState = {
  isAvailable: boolean;
  enabled: boolean;
  data: GfsGridData | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  setEnabled: (enabled: boolean) => void;
  refresh: () => Promise<void>;
};

const REFRESH_INTERVAL = 60 * 60 * 1000; // 1 hour

export function useFireWeatherOverlay(
  config: FireWeatherOverlayConfig,
): FireWeatherOverlayState {
  const [enabled, setEnabled] = useState(false);
  const [data, setData] = useState<GfsGridData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const hasFetched = useRef(false);

  const isAvailable = config.enabled;

  const refresh = useCallback(async () => {
    if (!isAvailable) return;

    setIsLoading(true);
    setError(null);

    try {
      const gridData = await fetchFireWeatherData();
      setData(gridData);
      setLastUpdated(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch fire weather");
    } finally {
      setIsLoading(false);
    }
  }, [isAvailable]);

  useEffect(() => {
    if (!enabled || !isAvailable) return;
    if (!hasFetched.current) {
      hasFetched.current = true;
      void refresh();
    }
  }, [enabled, isAvailable, refresh]);

  useEffect(() => {
    if (!enabled) hasFetched.current = false;
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !isAvailable) return;
    const interval = setInterval(() => void refresh(), REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [enabled, isAvailable, refresh]);

  return {
    isAvailable,
    enabled: enabled && isAvailable,
    data,
    isLoading,
    error,
    lastUpdated,
    setEnabled,
    refresh,
  };
}
