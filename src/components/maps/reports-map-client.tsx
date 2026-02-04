"use client";

import { useEffect, useMemo } from "react";
import { useTheme } from "next-themes";
import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import type { LatLngExpression } from "leaflet";

import { cn } from "@/lib/utils";
import { incidentTypeLabel, type IncidentType } from "@/lib/reports/incident-types";
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
import { OverlayControls } from "./overlays/overlay-controls";
import { useWeatherOverlay, type WeatherOverlayConfig } from "./hooks/use-weather-overlay";
import { useSeismicOverlay, type SeismicOverlayConfig } from "./hooks/use-seismic-overlay";

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
  zoom?: number;
  className?: string;
  /** Configuration for map overlays (weather, seismic). */
  overlayConfig?: OverlayConfig;
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

function buildPopupHtml(report: ReportMapItem): string {
  const imageHtml = report.imageUrl
    ? `<img src="${report.imageUrl}" alt="" style="height:96px;width:100%;border-radius:4px;object-fit:cover;" />`
    : "";

  const typeLabel = incidentTypeLabel[report.type] ?? report.type;
  const date = new Date(report.createdAt).toLocaleString();
  const scoreColor = report.score > 0 ? "#ef4444" : report.score < 0 ? "#3b82f6" : "#71717a";
  const scoreLabel = report.score > 0 ? `+${report.score}` : String(report.score);

  return `
    <div style="display:grid;gap:8px;min-width:180px;">
      ${imageHtml}
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
        <span style="font-size:12px;font-weight:500;background:#f4f4f5;padding:2px 6px;border-radius:4px;">${typeLabel}</span>
        <span style="font-size:11px;font-weight:600;color:${scoreColor};">${scoreLabel}</span>
        <span style="font-size:11px;color:#71717a;">${date}</span>
      </div>
      <a href="/reports/${report.id}" style="font-size:14px;text-decoration:underline;">View report</a>
    </div>
  `;
}

const DEFAULT_OVERLAY_CONFIG: OverlayConfig = {
  weather: { enabled: false, apiKey: undefined },
  seismic: { enabled: false, minMagnitude: 2.5 },
};

export function ReportsMapClient({
  reports,
  center,
  flyTo,
  userLocation,
  pinLocation,
  onMapClick,
  zoom,
  className,
  overlayConfig = DEFAULT_OVERLAY_CONFIG,
}: ReportsMapProps) {
  const { resolvedTheme } = useTheme();
  const tileUrl = resolvedTheme === "dark" ? TILE_DARK : TILE_LIGHT;

  // Overlay state
  const weather = useWeatherOverlay(overlayConfig.weather);
  const seismic = useSeismicOverlay(overlayConfig.seismic);

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
          popupContent: buildPopupHtml(report),
        };
      }),
    [reports]
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

        {/* User location (blue dot) */}
        {userLocation && (
          <CircleMarker
            center={userLocation}
            radius={10}
            pathOptions={{
              color: "#3b82f6",
              fillColor: "#3b82f6",
              fillOpacity: 0.3,
              weight: 3,
            }}
          >
            <Popup>
              <span className="text-sm font-medium">Your location</span>
            </Popup>
          </CircleMarker>
        )}

        {/* User's new report pin (yellow) */}
        {pinLocation && (
          <CircleMarker
            center={pinLocation}
            radius={10}
            pathOptions={{
              color: "#eab308",
              fillColor: "#eab308",
              fillOpacity: 0.35,
            }}
          />
        )}

        {/* Clustered report markers */}
        <MarkerClusterGroup
          markers={clusteredMarkers}
          iconCreateFunction={createClusterIcon}
          maxClusterRadius={35}
        />
      </MapContainer>

      {/* Overlay controls (outside MapContainer for proper z-index) */}
      <OverlayControls weather={weather} seismic={seismic} />
    </div>
  );
}
