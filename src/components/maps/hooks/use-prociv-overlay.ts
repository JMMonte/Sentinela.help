"use client";

import { useEffect, useState, useCallback } from "react";
import {
  fetchIncidents,
  type ProCivIncident,
} from "@/lib/overlays/prociv-api";

export type ProCivOverlayConfig = {
  enabled: boolean;
};

export type ProCivOverlayState = {
  isAvailable: boolean;
  enabled: boolean;
  incidents: ProCivIncident[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  setEnabled: (enabled: boolean) => void;
  refresh: () => Promise<void>;
};

const REFRESH_INTERVAL = 2 * 60 * 1000; // 2 minutes

export function useProCivOverlay(
  config: ProCivOverlayConfig,
  timeFilterHours: number = 8
): ProCivOverlayState {
  const [enabled, setEnabled] = useState(false);
  const [incidents, setIncidents] = useState<ProCivIncident[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const isAvailable = config.enabled;

  const refresh = useCallback(async () => {
    if (!isAvailable) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchIncidents(timeFilterHours);
      setIncidents(data);
      setLastUpdated(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch ProCiv data");
    } finally {
      setIsLoading(false);
    }
  }, [isAvailable, timeFilterHours]);

  // Fetch on enable and auto-refresh
  useEffect(() => {
    if (!enabled || !isAvailable) return;

    void refresh();
    const interval = setInterval(() => void refresh(), REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [enabled, isAvailable, refresh]);

  return {
    isAvailable,
    enabled: enabled && isAvailable,
    incidents,
    isLoading,
    error,
    lastUpdated,
    setEnabled,
    refresh,
  };
}
