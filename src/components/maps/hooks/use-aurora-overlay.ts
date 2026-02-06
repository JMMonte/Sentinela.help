"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { fetchAuroraData, type AuroraData } from "@/lib/overlays/aurora-api";

export type AuroraOverlayConfig = {
  enabled: boolean;
};

export type AuroraOverlayState = {
  isAvailable: boolean;
  enabled: boolean;
  data: AuroraData | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  setEnabled: (enabled: boolean) => void;
  refresh: () => Promise<void>;
};

const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes (matches NOAA update rate)

export function useAuroraOverlay(config: AuroraOverlayConfig): AuroraOverlayState {
  const [enabled, setEnabled] = useState(false);
  const [data, setData] = useState<AuroraData | null>(null);
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
      const auroraData = await fetchAuroraData();
      setData(auroraData);
      setLastUpdated(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch aurora data");
    } finally {
      setIsLoading(false);
    }
  }, [isAvailable]);

  // Initial fetch when enabled
  useEffect(() => {
    if (!enabled || !isAvailable) return;
    if (!hasFetched.current) {
      hasFetched.current = true;
      void refresh();
    }
  }, [enabled, isAvailable, refresh]);

  // Reset fetch flag when disabled
  useEffect(() => {
    if (!enabled) hasFetched.current = false;
  }, [enabled]);

  // Auto-refresh interval
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
