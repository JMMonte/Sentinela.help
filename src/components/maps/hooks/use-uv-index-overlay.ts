"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { fetchUvIndexData } from "@/lib/overlays/uv-index-api";
import type { GfsGridData } from "@/lib/overlays/gfs-utils";

export type UvIndexOverlayConfig = {
  enabled: boolean;
};

export type UvIndexOverlayState = {
  isAvailable: boolean;
  enabled: boolean;
  data: GfsGridData | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  setEnabled: (enabled: boolean) => void;
  refresh: () => Promise<void>;
};

const REFRESH_INTERVAL = 30 * 60 * 1000; // 30 minutes

export function useUvIndexOverlay(
  config: UvIndexOverlayConfig,
): UvIndexOverlayState {
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
      const gridData = await fetchUvIndexData();
      setData(gridData);
      setLastUpdated(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch UV index");
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
