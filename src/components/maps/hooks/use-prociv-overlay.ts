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

  // Fetch when enabled
  useEffect(() => {
    if (!enabled || !isAvailable) return;
    void refresh();
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
