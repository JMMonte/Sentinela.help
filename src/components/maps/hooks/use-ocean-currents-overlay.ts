"use client";

import { useEffect, useState, useCallback } from "react";
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

export function useOceanCurrentsOverlay(
  config: OceanCurrentsOverlayConfig,
): OceanCurrentsOverlayState {
  const [enabled, setEnabled] = useState(false);
  const [data, setData] = useState<OceanCurrentsVelocityData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const isAvailable = config.enabled;

  const refresh = useCallback(async () => {
    if (!isAvailable) return;

    setIsLoading(true);
    setError(null);

    try {
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

  // Fetch when enabled
  useEffect(() => {
    if (!enabled || !isAvailable) return;
    void refresh();
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
