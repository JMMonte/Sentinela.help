"use client";

import { useEffect, useState, useCallback } from "react";
import {
  fetchRainfallObservations,
  type StationObservation,
} from "@/lib/overlays/rainfall-api";

export type RainfallOverlayConfig = {
  enabled: boolean;
};

export type RainfallOverlayState = {
  isAvailable: boolean;
  enabled: boolean;
  stations: StationObservation[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  setEnabled: (enabled: boolean) => void;
  refresh: () => Promise<void>;
};

const REFRESH_INTERVAL = 10 * 60 * 1000; // 10 minutes (IPMA updates hourly)

export function useRainfallOverlay(
  config: RainfallOverlayConfig,
  timeFilterHours: number = 24,
): RainfallOverlayState {
  const [enabled, setEnabled] = useState(false);
  const [stations, setStations] = useState<StationObservation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const isAvailable = config.enabled;

  // IPMA only provides 24h of data, so cap the filter
  const effectiveHours = Math.min(timeFilterHours, 24);

  const refresh = useCallback(async () => {
    if (!isAvailable) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchRainfallObservations(effectiveHours);
      setStations(data);
      setLastUpdated(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch rainfall data");
    } finally {
      setIsLoading(false);
    }
  }, [isAvailable, effectiveHours]);

  useEffect(() => {
    if (!enabled || !isAvailable) return;

    void refresh();
    const interval = setInterval(() => void refresh(), REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [enabled, isAvailable, refresh]);

  return {
    isAvailable,
    enabled: enabled && isAvailable,
    stations,
    isLoading,
    error,
    lastUpdated,
    setEnabled,
    refresh,
  };
}
