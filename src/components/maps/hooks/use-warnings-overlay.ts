"use client";

import { useEffect, useState, useCallback } from "react";
import {
  fetchWarnings,
  type DistrictWarnings,
} from "@/lib/overlays/warnings-api";

export type WarningsOverlayConfig = {
  enabled: boolean;
};

export type WarningsOverlayState = {
  isAvailable: boolean;
  enabled: boolean;
  districts: DistrictWarnings[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  setEnabled: (enabled: boolean) => void;
  refresh: () => Promise<void>;
};

export function useWarningsOverlay(
  config: WarningsOverlayConfig,
): WarningsOverlayState {
  const [enabled, setEnabled] = useState(false);
  const [districts, setDistricts] = useState<DistrictWarnings[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const isAvailable = config.enabled;

  const refresh = useCallback(async () => {
    if (!isAvailable) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchWarnings();
      setDistricts(data);
      setLastUpdated(new Date());
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Failed to fetch IPMA warnings",
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
    districts,
    isLoading,
    error,
    lastUpdated,
    setEnabled,
    refresh,
  };
}
