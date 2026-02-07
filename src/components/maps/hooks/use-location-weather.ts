"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  fetchCurrentWeather,
  type CurrentWeatherData,
} from "@/lib/overlays/weather-api";

export type LocationWeatherState = {
  data: CurrentWeatherData | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
};

/**
 * Hook to fetch current weather for a location.
 * Uses server-side proxy - API key is not needed client-side.
 */
export function useLocationWeather(
  location: [number, number] | undefined,
  enabled: boolean = true
): LocationWeatherState {
  const [data, setData] = useState<CurrentWeatherData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const prevLocationRef = useRef<string | null>(null);

  const lat = location?.[0];
  const lon = location?.[1];

  const fetchWeather = useCallback(async () => {
    if (lat == null || lon == null || !enabled) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchCurrentWeather(lat, lon);
      setData(result);
      setLastUpdated(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch weather");
    } finally {
      setIsLoading(false);
    }
  }, [lat, lon, enabled]);

  // Fetch when location changes
  useEffect(() => {
    if (lat == null || lon == null || !enabled) {
      setData(null);
      return;
    }

    const locationKey = `${lat},${lon}`;
    if (prevLocationRef.current !== locationKey) {
      prevLocationRef.current = locationKey;
      void fetchWeather();
    }
  }, [lat, lon, enabled, fetchWeather]);

  return { data, isLoading, error, lastUpdated };
}
