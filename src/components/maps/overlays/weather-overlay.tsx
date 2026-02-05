"use client";

import { TileLayer } from "react-leaflet";

export type WeatherOverlayProps = {
  tileUrl: string;
  opacity?: number;
};

export function WeatherOverlay({ tileUrl, opacity = 1.0 }: WeatherOverlayProps) {
  return (
    <TileLayer
      url={tileUrl}
      opacity={opacity}
      attribution='&copy; <a href="https://openweathermap.org">OpenWeatherMap</a>'
    />
  );
}
