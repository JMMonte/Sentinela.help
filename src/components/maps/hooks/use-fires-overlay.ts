"use client";

import { useEffect, useState, useCallback } from "react";
import { fetchFireHotspots, type FireHotspot } from "@/lib/overlays/fires-api";

export type FiresOverlayConfig = {
  enabled: boolean;
};

export type FiresOverlayState = {
  isAvailable: boolean;
  enabled: boolean;
  hotspots: FireHotspot[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  setEnabled: (enabled: boolean) => void;
  refresh: () => Promise<void>;
};

export function useFiresOverlay(config: FiresOverlayConfig): FiresOverlayState {
  const [enabled, setEnabled] = useState(false);
  const [hotspots, setHotspots] = useState<FireHotspot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const isAvailable = config.enabled;

  const refresh = useCallback(async () => {
    if (!isAvailable) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchFireHotspots(1);
      setHotspots(data);
      setLastUpdated(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch fires");
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
    hotspots,
    isLoading,
    error,
    lastUpdated,
    setEnabled,
    refresh,
  };
}
