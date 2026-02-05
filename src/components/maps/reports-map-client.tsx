"use client";

import { useEffect, useMemo } from "react";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import {
  MapContainer,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import type { LatLngExpression } from "leaflet";

import { cn } from "@/lib/utils";
import { type IncidentType } from "@/lib/reports/incident-types";
import {
  type CurrentWeatherData,
  getWeatherIconUrl,
  msToKmh,
  windDegToDirection,
} from "@/lib/overlays/weather-api";
import {
  createClusterIcon,
  createImageMarkerIcon,
  createSolvedImageMarkerIcon,
  createEscalatedImageMarkerIcon,
  YELLOW_PIN_ICON,
  SOLVED_PIN_ICON,
  ESCALATED_PIN_ICON,
} from "./marker-icons";
import { MarkerClusterGroup, type ClusteredMarker } from "./marker-cluster-group";
import { WeatherOverlay } from "./overlays/weather-overlay";
import { SeismicOverlay } from "./overlays/seismic-overlay";
import { ProCivOverlay } from "./overlays/prociv-overlay";
import { RainfallOverlay } from "./overlays/rainfall-overlay";
import { OverlayControls } from "./overlays/overlay-controls";
import { useWeatherOverlay, type WeatherOverlayConfig } from "./hooks/use-weather-overlay";
import { useSeismicOverlay, type SeismicOverlayConfig } from "./hooks/use-seismic-overlay";
import { useProCivOverlay, type ProCivOverlayConfig } from "./hooks/use-prociv-overlay";
import { useRainfallOverlay, type RainfallOverlayConfig } from "./hooks/use-rainfall-overlay";
import { useLocationWeather } from "./hooks/use-location-weather";
import { UserLocationMarker, PinLocationMarker } from "./user-location-marker";

const TILE_LIGHT =
  "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
const TILE_DARK =
  "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const TILE_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>';

export type ReportStatus = "NEW" | "NOTIFIED" | "CLOSED";

export type ReportMapItem = {
  id: string;
  type: IncidentType;
  status: ReportStatus;
  latitude: number;
  longitude: number;
  createdAt: string;
  description: string | null;
  imageUrl: string | null;
  score: number;
};

export type OverlayConfig = {
  weather: WeatherOverlayConfig;
  seismic: SeismicOverlayConfig;
  prociv: ProCivOverlayConfig;
  rainfall: RainfallOverlayConfig;
};

export type ReportsMapProps = {
  reports: ReportMapItem[];
  center?: LatLngExpression;
  /** Coordinates to fly to (triggers animation when changed). */
  flyTo?: LatLngExpression;
  userLocation?: [number, number];
  /** Coordinates of the pin dropped by the user for a new report. */
  pinLocation?: [number, number];
  /** Called when the user clicks the map to drop a pin. */
  onMapClick?: (lat: number, lng: number) => void;
  /** Called when user clicks "View report" in a popup. */
  onReportSelect?: (reportId: string) => void;
  zoom?: number;
  className?: string;
  /** Configuration for map overlays (weather, seismic). */
  overlayConfig?: OverlayConfig;
  /** Time filter in hours – controls how far back overlays fetch data. */
  timeFilterHours?: number;
};

function FlyToCenter({ center }: { center?: LatLngExpression }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, 17, { duration: 0.5 });
    }
  }, [map, center]);
  return null;
}

function ResizeInvalidator() {
  const map = useMap();
  useEffect(() => {
    const container = map.getContainer();
    const observer = new ResizeObserver(() => {
      map.invalidateSize();
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [map]);
  return null;
}

function ClickHandler({
  onPick,
}: {
  onPick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(event) {
      onPick(event.latlng.lat, event.latlng.lng);
    },
  });
  return null;
}

type PopupTranslations = {
  typeLabel: string;
  viewReport: string;
};

function buildWeatherRowHtml(w: CurrentWeatherData): string {
  const temp = Math.round(w.main.temp);
  const iconUrl = getWeatherIconUrl(w.weather[0].icon);
  const wind = msToKmh(w.wind.speed);
  const windDir = windDegToDirection(w.wind.deg);
  const humidity = w.main.humidity;
  const description = w.weather[0].description;

  return `
    <div style="display:flex;align-items:center;gap:6px;font-size:11px;color:#71717a;border-top:1px solid #e4e4e7;padding-top:6px;">
      <img src="${iconUrl}" alt="${description}" style="width:24px;height:24px;margin:-2px 0;" />
      <span style="font-weight:600;color:#18181b;">${temp}&deg;C</span>
      <span>${wind}<small style="font-size:9px;opacity:0.7;margin-left:1px;">km/h</small> ${windDir}</span>
      <span>${humidity}<small style="font-size:9px;opacity:0.7;margin-left:1px;">%</small></span>
    </div>
  `;
}

function buildPopupHtml(
  report: ReportMapItem,
  translations: PopupTranslations,
  weather?: CurrentWeatherData | null,
): string {
  const imageHtml = report.imageUrl
    ? `<img src="${report.imageUrl}" alt="" style="height:96px;width:100%;border-radius:4px;object-fit:cover;" />`
    : "";

  const date = new Date(report.createdAt).toLocaleString();
  const scoreColor = report.score > 0 ? "#ef4444" : report.score < 0 ? "#3b82f6" : "#71717a";
  const scoreLabel = report.score > 0 ? `+${report.score}` : String(report.score);
  const weatherHtml = weather ? buildWeatherRowHtml(weather) : "";

  return `
    <div style="display:grid;gap:8px;min-width:180px;">
      ${imageHtml}
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
        <span style="font-size:12px;font-weight:500;background:#f4f4f5;padding:2px 6px;border-radius:4px;">${translations.typeLabel}</span>
        <span style="font-size:11px;font-weight:600;color:${scoreColor};">${scoreLabel}</span>
        <span style="font-size:11px;color:#71717a;">${date}</span>
      </div>
      ${weatherHtml}
      <button data-report-id="${report.id}" style="font-size:14px;text-decoration:underline;background:none;border:none;padding:0;cursor:pointer;text-align:left;color:inherit;">${translations.viewReport}</button>
    </div>
  `;
}

const DEFAULT_OVERLAY_CONFIG: OverlayConfig = {
  weather: { enabled: false, apiKey: undefined },
  seismic: { enabled: false, minMagnitude: 2.5 },
  prociv: { enabled: false },
  rainfall: { enabled: false },
};

export function ReportsMapClient({
  reports,
  center,
  flyTo,
  userLocation,
  pinLocation,
  onMapClick,
  onReportSelect,
  zoom,
  className,
  overlayConfig = DEFAULT_OVERLAY_CONFIG,
  timeFilterHours = 8,
}: ReportsMapProps) {
  const { resolvedTheme } = useTheme();
  const tileUrl = resolvedTheme === "dark" ? TILE_DARK : TILE_LIGHT;
  const tIncidentTypes = useTranslations("incidentTypes");
  const tReports = useTranslations("reports");
  const tMap = useTranslations("map");

  // Overlay state
  const weather = useWeatherOverlay(overlayConfig.weather);
  const seismic = useSeismicOverlay(overlayConfig.seismic, timeFilterHours);
  const prociv = useProCivOverlay(overlayConfig.prociv, timeFilterHours);
  const rainfall = useRainfallOverlay(overlayConfig.rainfall, timeFilterHours);

  // Location weather (current weather at user position)
  const locationWeather = useLocationWeather(
    weather.isAvailable ? userLocation : undefined,
    overlayConfig.weather.apiKey
  );

  // Weather at pin location (for yellow marker popup)
  const pinWeather = useLocationWeather(
    weather.isAvailable ? pinLocation : undefined,
    overlayConfig.weather.apiKey
  );

  // Handle clicks on "View report" buttons in popups
  useEffect(() => {
    if (!onReportSelect) return;

    const selectReport = onReportSelect;
    function handlePopupClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      const reportId = target.getAttribute("data-report-id");
      if (reportId) {
        e.preventDefault();
        selectReport(reportId);
      }
    }

    document.addEventListener("click", handlePopupClick);
    return () => document.removeEventListener("click", handlePopupClick);
  }, [onReportSelect]);

  // Convert reports to clustered markers
  const clusteredMarkers: ClusteredMarker[] = useMemo(
    () =>
      reports.map((report) => {
        const isSolved = report.status === "CLOSED";
        const isEscalated = report.status === "NOTIFIED";
        let icon;
        if (report.imageUrl) {
          if (isSolved) {
            icon = createSolvedImageMarkerIcon(report.imageUrl);
          } else if (isEscalated) {
            icon = createEscalatedImageMarkerIcon(report.imageUrl);
          } else {
            icon = createImageMarkerIcon(report.imageUrl);
          }
        } else {
          if (isSolved) {
            icon = SOLVED_PIN_ICON;
          } else if (isEscalated) {
            icon = ESCALATED_PIN_ICON;
          } else {
            icon = YELLOW_PIN_ICON;
          }
        }
        return {
          id: report.id,
          position: [report.latitude, report.longitude] as [number, number],
          icon,
          popupContent: buildPopupHtml(
            report,
            {
              typeLabel: tIncidentTypes(report.type),
              viewReport: tReports("viewReport"),
            },
            locationWeather.data,
          ),
        };
      }),
    [reports, tIncidentTypes, tReports, locationWeather.data]
  );

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={center ?? [37.7749, -122.4194]}
        zoom={zoom ?? (center ? 11 : 4)}
        className={cn("h-[420px] w-full rounded-md z-0", className)}
        scrollWheelZoom
      >
        <TileLayer key={tileUrl} attribution={TILE_ATTR} url={tileUrl} />
        <ResizeInvalidator />
        <FlyToCenter center={flyTo} />
        {onMapClick && <ClickHandler onPick={onMapClick} />}

        {/* Weather overlay (above base tiles, below markers) */}
        {weather.enabled && weather.tileUrl && (
          <WeatherOverlay tileUrl={weather.tileUrl} opacity={weather.opacity} />
        )}

        {/* Seismic overlay (above weather, below user markers) */}
        {seismic.enabled && seismic.earthquakes.length > 0 && (
          <SeismicOverlay earthquakes={seismic.earthquakes} />
        )}

        {/* ProCiv overlay (civil protection occurrences) */}
        {prociv.enabled && prociv.incidents.length > 0 && (
          <ProCivOverlay incidents={prociv.incidents} />
        )}

        {/* Rainfall overlay (IPMA station observations) */}
        {rainfall.enabled && rainfall.stations.length > 0 && (
          <RainfallOverlay stations={rainfall.stations} />
        )}

        {/* User location (blue dot + ambient weather) */}
        {userLocation && (
          <UserLocationMarker
            position={userLocation}
            weather={locationWeather.data}
            locationLabel={tMap("yourLocation")}
            reportLabel={tReports("reportIncident")}
            onReportIncident={
              onMapClick
                ? () => onMapClick(userLocation[0], userLocation[1])
                : undefined
            }
          />
        )}

        {/* User's new report pin (yellow) */}
        {pinLocation && (
          <PinLocationMarker
            position={pinLocation}
            weather={pinWeather.data}
            locationLabel={tMap("yourLocation")}
            reportLabel={tReports("reportIncident")}
          />
        )}

        {/* Clustered report markers */}
        <MarkerClusterGroup
          markers={clusteredMarkers}
          iconCreateFunction={createClusterIcon}
          maxClusterRadius={35}
        />
      </MapContainer>

      {/* Overlay controls (portals itself into the header topbar) */}
      <OverlayControls weather={weather} seismic={seismic} prociv={prociv} rainfall={rainfall} />
    </div>
  );
}
