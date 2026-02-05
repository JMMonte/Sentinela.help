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

const REFRESH_INTERVAL = 10 * 60 * 1000; // 10 minutes

export function useLocationWeather(
  location: [number, number] | undefined,
  apiKey: string | undefined
): LocationWeatherState {
  const [data, setData] = useState<CurrentWeatherData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const prevLocationRef = useRef<string | null>(null);

  const lat = location?.[0];
  const lon = location?.[1];

  const fetchWeather = useCallback(async () => {
    if (lat == null || lon == null || !apiKey) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchCurrentWeather(lat, lon, apiKey);
      setData(result);
      setLastUpdated(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch weather");
    } finally {
      setIsLoading(false);
    }
  }, [lat, lon, apiKey]);

  useEffect(() => {
    if (lat == null || lon == null || !apiKey) {
      setData(null);
      return;
    }

    const locationKey = `${lat},${lon}`;
    if (prevLocationRef.current !== locationKey) {
      prevLocationRef.current = locationKey;
      void fetchWeather();
    }

    const interval = setInterval(() => void fetchWeather(), REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [lat, lon, apiKey, fetchWeather]);

  return { data, isLoading, error, lastUpdated };
}
