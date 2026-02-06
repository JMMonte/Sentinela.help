"use client";

import { useMemo } from "react";
import { type GfsGridData, getGridValueAt } from "@/lib/overlays/gfs-utils";

export type OverlayType =
  | "temperature"
  | "humidity"
  | "precipitation"
  | "cloudCover"
  | "cape"
  | "fireWeather"
  | "uvIndex"
  | "airQuality";

export type OverlayValueConfig = {
  type: OverlayType;
  data: GfsGridData | null;
  enabled: boolean;
};

export type OverlayValue = {
  type: OverlayType;
  value: number;
  formatted: string;
  unit: string;
  label: string;
  iconSvg: string;
};

// Inline SVG icons (Lucide-style, 14x14)
const ICONS = {
  thermometer: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"/></svg>`,
  droplets: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z"/><path d="M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97"/></svg>`,
  cloudRain: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M16 14v6"/><path d="M8 14v6"/><path d="M12 16v6"/></svg>`,
  cloud: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>`,
  zap: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
  flame: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>`,
  sun: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>`,
  wind: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2"/><path d="M9.6 4.6A2 2 0 1 1 11 8H2"/><path d="M12.6 19.4A2 2 0 1 0 14 16H2"/></svg>`,
};

const OVERLAY_META: Record<
  OverlayType,
  { label: string; unit: string; iconSvg: string; format: (v: number) => string }
> = {
  temperature: {
    label: "Temp",
    unit: "°",
    iconSvg: ICONS.thermometer,
    format: (v) => Math.round(v).toString(),
  },
  humidity: {
    label: "Humidity",
    unit: "%",
    iconSvg: ICONS.droplets,
    format: (v) => Math.round(v).toString(),
  },
  precipitation: {
    label: "Rain",
    unit: "mm",
    iconSvg: ICONS.cloudRain,
    format: (v) => v.toFixed(1),
  },
  cloudCover: {
    label: "Clouds",
    unit: "%",
    iconSvg: ICONS.cloud,
    format: (v) => Math.round(v).toString(),
  },
  cape: {
    label: "CAPE",
    unit: "",
    iconSvg: ICONS.zap,
    format: (v) => Math.round(v).toString(),
  },
  fireWeather: {
    label: "FWI",
    unit: "",
    iconSvg: ICONS.flame,
    format: (v) => Math.round(v).toString(),
  },
  uvIndex: {
    label: "UV",
    unit: "",
    iconSvg: ICONS.sun,
    format: (v) => v.toFixed(1),
  },
  airQuality: {
    label: "AQI",
    unit: "",
    iconSvg: ICONS.wind,
    format: (v) => Math.round(v).toString(),
  },
};

/**
 * Sample overlay values at a specific location.
 * Returns formatted values for all active overlays.
 */
export function useOverlayValues(
  location: [number, number] | undefined,
  overlays: OverlayValueConfig[]
): OverlayValue[] {
  return useMemo(() => {
    if (!location) return [];

    const [lat, lon] = location;
    const values: OverlayValue[] = [];

    for (const overlay of overlays) {
      if (!overlay.enabled || !overlay.data) continue;

      const rawValue = getGridValueAt(overlay.data, lat, lon);
      if (rawValue === null || isNaN(rawValue)) continue;

      const meta = OVERLAY_META[overlay.type];
      values.push({
        type: overlay.type,
        value: rawValue,
        formatted: meta.format(rawValue),
        unit: meta.unit,
        label: meta.label,
        iconSvg: meta.iconSvg,
      });
    }

    return values;
  }, [location, overlays]);
}
