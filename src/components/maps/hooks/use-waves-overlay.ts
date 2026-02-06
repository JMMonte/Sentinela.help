"use client";

import { useEffect, useState, useCallback, useRef } from "react";
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

const REFRESH_INTERVAL = 60 * 60 * 1000; // 1 hour

export function useWavesOverlay(
  config: WavesOverlayConfig,
): WavesOverlayState {
  const [enabled, setEnabled] = useState(false);
  const [data, setData] = useState<WaveGridData | null>(null);
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

  // Periodic refresh
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
