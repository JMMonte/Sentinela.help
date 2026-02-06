"use client";

import { useEffect, useState, useCallback } from "react";
import type { GfsGridData } from "@/lib/overlays/gfs-utils";
import { fetchAirQualityGrid } from "@/lib/overlays/air-quality-api";

export type AirQualityOverlayConfig = {
  enabled: boolean;
};

export type AirQualityOverlayState = {
  isAvailable: boolean;
  enabled: boolean;
  data: GfsGridData | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  setEnabled: (enabled: boolean) => void;
  refresh: () => Promise<void>;
};

const REFRESH_INTERVAL = 15 * 60 * 1000; // 15 minutes

export function useAirQualityOverlay(
  config: AirQualityOverlayConfig
): AirQualityOverlayState {
  const [enabled, setEnabled] = useState(false);
  const [data, setData] = useState<GfsGridData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const isAvailable = config.enabled;

  const refresh = useCallback(async () => {
    if (!isAvailable) return;

    setIsLoading(true);
    setError(null);

    try {
      const gridData = await fetchAirQualityGrid();
      setData(gridData);
      setLastUpdated(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch air quality data");
    } finally {
      setIsLoading(false);
    }
  }, [isAvailable]);

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
    data,
    isLoading,
    error,
    lastUpdated,
    setEnabled,
    refresh,
  };
}
