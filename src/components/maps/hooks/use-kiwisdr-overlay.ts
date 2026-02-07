"use client";

import { useEffect, useState, useCallback } from "react";
import { fetchKiwiStations, type KiwiStation } from "@/lib/overlays/kiwisdr-api";

export type KiwiSdrOverlayConfig = {
  enabled: boolean;
};

export type KiwiSdrOverlayState = {
  isAvailable: boolean;
  enabled: boolean;
  stations: KiwiStation[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  setEnabled: (enabled: boolean) => void;
  refresh: () => Promise<void>;
};

export function useKiwiSdrOverlay(config: KiwiSdrOverlayConfig): KiwiSdrOverlayState {
  const [enabled, setEnabled] = useState(false);
  const [stations, setStations] = useState<KiwiStation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const isAvailable = config.enabled;

  const refresh = useCallback(async () => {
    if (!isAvailable) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchKiwiStations();
      setStations(data);
      setLastUpdated(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch KiwiSDR stations");
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
    stations,
    isLoading,
    error,
    lastUpdated,
    setEnabled,
    refresh,
  };
}
