"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { fetchAprsStations, type AprsStation } from "@/lib/overlays/aprs-api";

export type AprsOverlayConfig = {
  enabled: boolean;
};

export type AprsOverlayState = {
  isAvailable: boolean;
  enabled: boolean;
  stations: AprsStation[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  setEnabled: (enabled: boolean) => void;
  updateBounds: (bounds: { lamin: number; lomin: number; lamax: number; lomax: number }) => void;
};

const DEBOUNCE_MS = 500;

export function useAprsOverlay(config: AprsOverlayConfig): AprsOverlayState {
  const [enabled, setEnabled] = useState(false);
  const [stations, setStations] = useState<AprsStation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isAvailable = config.enabled;

  const doFetch = useCallback(async (bounds: { lamin: number; lomin: number; lamax: number; lomax: number }) => {
    if (!isAvailable) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchAprsStations(bounds);
      setStations(data);
      setLastUpdated(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch APRS stations");
    } finally {
      setIsLoading(false);
    }
  }, [isAvailable]);

  const updateBounds = useCallback((bounds: { lamin: number; lomin: number; lamax: number; lomax: number }) => {
    if (!enabled || !isAvailable) return;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      void doFetch(bounds);
    }, DEBOUNCE_MS);
  }, [enabled, isAvailable, doFetch]);

  useEffect(() => {
    if (!enabled) {
      setStations([]);
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    }
  }, [enabled]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return {
    isAvailable,
    enabled: enabled && isAvailable,
    stations,
    isLoading,
    error,
    lastUpdated,
    setEnabled,
    updateBounds,
  };
}
