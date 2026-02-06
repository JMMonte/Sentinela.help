"use client";

import { useState, useMemo } from "react";
import {
  type WeatherLayer,
  WEATHER_LAYERS,
  getWeatherTileUrl,
} from "@/lib/overlays/weather-api";

export type WeatherOverlayConfig = {
  enabled: boolean;
};

export type WeatherOverlayState = {
  isAvailable: boolean;
  enabled: boolean;
  activeLayer: WeatherLayer;
  opacity: number;
  tileUrl: string | null;
  availableLayers: typeof WEATHER_LAYERS;
  setEnabled: (enabled: boolean) => void;
  setActiveLayer: (layer: WeatherLayer) => void;
  setOpacity: (opacity: number) => void;
};

export function useWeatherOverlay(
  config: WeatherOverlayConfig
): WeatherOverlayState {
  const [enabled, setEnabled] = useState(false);
  const [activeLayer, setActiveLayer] = useState<WeatherLayer>("precipitation_new");
  const [opacity, setOpacity] = useState(0.85);

  // Weather is available if enabled in config (API key checked server-side)
  const isAvailable = config.enabled;

  const tileUrl = useMemo(() => {
    if (!enabled || !isAvailable) return null;
    // API key is handled by the server proxy - not needed client-side
    return getWeatherTileUrl(activeLayer);
  }, [enabled, isAvailable, activeLayer]);

  return {
    isAvailable,
    enabled: enabled && isAvailable,
    activeLayer,
    opacity,
    tileUrl,
    availableLayers: WEATHER_LAYERS,
    setEnabled,
    setActiveLayer,
    setOpacity,
  };
}
