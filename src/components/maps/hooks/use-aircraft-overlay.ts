"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { fetchAircraft, type Aircraft } from "@/lib/overlays/aircraft-api";

export type AircraftOverlayConfig = {
  enabled: boolean;
};

export type AircraftOverlayState = {
  isAvailable: boolean;
  enabled: boolean;
  aircraft: Aircraft[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  setEnabled: (enabled: boolean) => void;
  updateBounds: (bounds: { lamin: number; lomin: number; lamax: number; lomax: number }) => void;
};

const DEBOUNCE_MS = 500; // Debounce map movements

export function useAircraftOverlay(config: AircraftOverlayConfig): AircraftOverlayState {
  const [enabled, setEnabled] = useState(false);
  const [aircraft, setAircraft] = useState<Aircraft[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isAvailable = config.enabled;

  // Fetch aircraft for given bounds
  const doFetch = useCallback(async (bounds: { lamin: number; lomin: number; lamax: number; lomax: number }) => {
    if (!isAvailable) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchAircraft(bounds);
      setAircraft(data);
      setLastUpdated(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch aircraft");
    } finally {
      setIsLoading(false);
    }
  }, [isAvailable]);

  // Update bounds - debounced fetch on every pan/zoom
  const updateBounds = useCallback((bounds: { lamin: number; lomin: number; lamax: number; lomax: number }) => {
    if (!enabled || !isAvailable) return;

    // Debounce to avoid hammering API during rapid pan/zoom
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      void doFetch(bounds);
    }, DEBOUNCE_MS);
  }, [enabled, isAvailable, doFetch]);

  // Clear data and debounce timer when disabled
  useEffect(() => {
    if (!enabled) {
      setAircraft([]);
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    }
  }, [enabled]);

  // Cleanup on unmount
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
    aircraft,
    isLoading,
    error,
    lastUpdated,
    setEnabled,
    updateBounds,
  };
}
