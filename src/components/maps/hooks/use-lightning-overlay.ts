"use client";

import { useEffect, useState, useCallback } from "react";
import { fetchLightning, type LightningStrike } from "@/lib/overlays/lightning-api";

export type LightningOverlayConfig = {
  enabled: boolean;
};

export type LightningOverlayState = {
  isAvailable: boolean;
  enabled: boolean;
  strikes: LightningStrike[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  setEnabled: (enabled: boolean) => void;
  refresh: () => Promise<void>;
};

export function useLightningOverlay(config: LightningOverlayConfig): LightningOverlayState {
  const [enabled, setEnabled] = useState(false);
  const [strikes, setStrikes] = useState<LightningStrike[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const isAvailable = config.enabled;

  const refresh = useCallback(async () => {
    if (!isAvailable) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchLightning();
      setStrikes(data);
      setLastUpdated(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch lightning");
    } finally {
      setIsLoading(false);
    }
  }, [isAvailable]);

  // Fetch when enabled
  useEffect(() => {
    if (!enabled || !isAvailable) return;
    void refresh();
  }, [enabled, isAvailable, refresh]);

  // Clear data when disabled
  useEffect(() => {
    if (!enabled) {
      setStrikes([]);
    }
  }, [enabled]);

  return {
    isAvailable,
    enabled: enabled && isAvailable,
    strikes,
    isLoading,
    error,
    lastUpdated,
    setEnabled,
    refresh,
  };
}
