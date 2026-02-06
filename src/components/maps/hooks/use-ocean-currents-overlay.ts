"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  fetchOceanCurrentsData,
  type OceanCurrentsVelocityData,
} from "@/lib/overlays/ocean-currents-api";

export type OceanCurrentsOverlayConfig = {
  enabled: boolean;
};

export type OceanCurrentsOverlayState = {
  isAvailable: boolean;
  enabled: boolean;
  data: OceanCurrentsVelocityData | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  setEnabled: (enabled: boolean) => void;
  refresh: () => Promise<void>;
};

const REFRESH_INTERVAL = 60 * 60 * 1000; // 1 hour (data updates daily)

export function useOceanCurrentsOverlay(
  config: OceanCurrentsOverlayConfig,
): OceanCurrentsOverlayState {
  const [enabled, setEnabled] = useState(false);
  const [data, setData] = useState<OceanCurrentsVelocityData | null>(null);
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
      // Ocean currents data is global - no bounds needed
      const currents = await fetchOceanCurrentsData();
      setData(currents);
      setLastUpdated(new Date());
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Failed to fetch ocean currents data",
      );
    } finally {
      setIsLoading(false);
    }
  }, [isAvailable]);

  // Fetch when enabled (global data, no bounds dependency)
  useEffect(() => {
    if (!enabled || !isAvailable) return;

    // Only fetch once initially
    if (!hasFetched.current) {
      hasFetched.current = true;
      void refresh();
    }
  }, [enabled, isAvailable, refresh]);

  // Reset fetch flag when disabled
  useEffect(() => {
    if (!enabled) {
      hasFetched.current = false;
    }
  }, [enabled]);

  // Periodic refresh (every hour)
  useEffect(() => {
    if (!enabled || !isAvailable) return;

    const interval = setInterval(() => {
      void refresh();
    }, REFRESH_INTERVAL);

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
