"use client";

import { useEffect, useState, useCallback } from "react";
import { fetchWindData, type VelocityData } from "@/lib/overlays/wind-api";

export type WindOverlayConfig = {
  enabled: boolean;
};

export type WindOverlayState = {
  isAvailable: boolean;
  enabled: boolean;
  data: VelocityData | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  setEnabled: (enabled: boolean) => void;
  refresh: () => Promise<void>;
};

export function useWindOverlay(
  config: WindOverlayConfig,
): WindOverlayState {
  const [enabled, setEnabled] = useState(false);
  const [data, setData] = useState<VelocityData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const isAvailable = config.enabled;

  const refresh = useCallback(async () => {
    if (!isAvailable) return;

    setIsLoading(true);
    setError(null);

    try {
      const wind = await fetchWindData();
      setData(wind);
      setLastUpdated(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch wind data");
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
