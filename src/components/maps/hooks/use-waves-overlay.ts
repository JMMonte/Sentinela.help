"use client";

import { useEffect, useState, useCallback } from "react";
import { fetchWaveData } from "@/lib/overlays/waves-api";
import type { WaveGridData } from "@/lib/overlays/waves-api";

export type WavesOverlayConfig = {
  enabled: boolean;
};

export type WavesOverlayState = {
  isAvailable: boolean;
  enabled: boolean;
  data: WaveGridData | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  setEnabled: (enabled: boolean) => void;
  refresh: () => Promise<void>;
};

export function useWavesOverlay(
  config: WavesOverlayConfig,
): WavesOverlayState {
  const [enabled, setEnabled] = useState(false);
  const [data, setData] = useState<WaveGridData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const isAvailable = config.enabled;

  const refresh = useCallback(async () => {
    if (!isAvailable) return;

    setIsLoading(true);
    setError(null);

    try {
      const waveData = await fetchWaveData();
      setData(waveData);
      setLastUpdated(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch wave data");
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
