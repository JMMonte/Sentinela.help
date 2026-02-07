"use client";

import { useEffect, useMemo } from "react";
import { Marker, Popup, Polyline, Polygon, CircleMarker, Tooltip } from "react-leaflet";
import L, { LatLngExpression } from "leaflet";
import type { GdacsEvent, GdacsAlertLevel, GdacsEventType } from "@/lib/overlays/gdacs-api";
import { getAlertColor, getEventTypeName } from "@/lib/overlays/gdacs-api";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STYLE_ID = "gdacs-style";

// Event type SVG icons (simple geometric shapes)
const EVENT_ICONS: Record<GdacsEventType, string> = {
  EQ: `<path d="M12 2L2 12h3v8h14v-8h3L12 2z" fill="currentColor"/>`, // House/shake
  FL: `<path d="M12 2C8 6 4 9.5 4 14a8 8 0 0016 0c0-4.5-4-8-8-12z" fill="currentColor"/>`, // Water drop
  TC: `<path d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 3a7 7 0 017 7h-3a4 4 0 00-8 0H5a7 7 0 017-7z" fill="currentColor"/>`, // Spiral
  VO: `<path d="M12 2L4 20h16L12 2zm0 4l5 12H7l5-12z" fill="currentColor"/>`, // Triangle/mountain
  WF: `<path d="M12 2c-2 3-6 6-6 10a6 6 0 0012 0c0-4-4-7-6-10zm0 14a2 2 0 110-4 2 2 0 010 4z" fill="currentColor"/>`, // Flame
  DR: `<path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" stroke="currentColor" stroke-width="2" fill="none"/>`, // Sun
};

// GDACS alert level colors
function getAlertLevelColor(level: GdacsAlertLevel): string {
  const colors: Record<GdacsAlertLevel, string> = {
    Green: "#22c55e",
    Orange: "#f97316",
    Red: "#ef4444",
  };
  return colors[level] || "#71717a";
}

// Size based on alert level
function getIconSize(level: GdacsAlertLevel): number {
  const sizes: Record<GdacsAlertLevel, number> = {
    Green: 24,
    Orange: 32,
    Red: 40,
  };
  return sizes[level] || 24;
}

// Pulse animation for Red alerts
function shouldPulse(level: GdacsAlertLevel): boolean {
  return level === "Red" || level === "Orange";
}

// ---------------------------------------------------------------------------
// Inject global styles
// ---------------------------------------------------------------------------

function ensureStyles() {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    @keyframes gdacs-pulse {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.15); opacity: 0.85; }
    }
    .gdacs-marker {
      overflow: visible !important;
      background: transparent !important;
      border: none !important;
    }
    .gdacs-pulse {
      animation: gdacs-pulse 2s ease-in-out infinite;
    }
  `;
  document.head.appendChild(style);
}

// ---------------------------------------------------------------------------
// DivIcon factory
// ---------------------------------------------------------------------------

function createDisasterIcon(event: GdacsEvent): L.DivIcon {
  const color = getAlertLevelColor(event.alertLevel);
  const size = getIconSize(event.alertLevel);
  const half = size / 2;
  const iconPath = EVENT_ICONS[event.eventType] || EVENT_ICONS.EQ;
  const pulseClass = shouldPulse(event.alertLevel) ? "gdacs-pulse" : "";

  return L.divIcon({
    className: "gdacs-marker",
    iconSize: [size, size],
    iconAnchor: [half, half],
    popupAnchor: [0, -half - 4],
    html: `
      <div class="${pulseClass}" style="
        width: ${size}px;
        height: ${size}px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: ${color};
        border-radius: 50%;
        border: 2px solid rgba(255,255,255,0.9);
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      ">
        <svg
          width="${size * 0.55}"
          height="${size * 0.55}"
          viewBox="0 0 24 24"
          style="color: white;"
        >
          ${iconPath}
        </svg>
      </div>
    `,
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export type GdacsOverlayProps = {
  events: GdacsEvent[];
};

export function GdacsOverlay({ events }: GdacsOverlayProps) {
  useEffect(() => {
    ensureStyles();
  }, []);

  const icons = useMemo(
    () => new Map(events.map((e) => [e.id, createDisasterIcon(e)])),
    [events]
  );

  // Render cyclone track elements
  const renderCycloneTracks = (event: GdacsEvent) => {
    if (event.eventType !== "TC" || !event.cycloneData) return null;

    const { trackPoints, forecastCone, windSpeed } = event.cycloneData;
    if (trackPoints.length < 2) return null;

    const color = getAlertLevelColor(event.alertLevel);
    const elements: React.ReactNode[] = [];

    // Separate past and future track points
    const pastPoints = trackPoints.filter((p) => !p.isForecast);
    const futurePoints = trackPoints.filter((p) => p.isForecast);

    // Render forecast cone first (underneath everything)
    if (forecastCone && forecastCone.length > 2) {
      const conePositions: LatLngExpression[] = forecastCone.map(
        ([lng, lat]) => [lat, lng] as LatLngExpression
      );
      elements.push(
        <Polygon
          key={`cone-${event.id}`}
          positions={conePositions}
          pathOptions={{
            color: color,
            weight: 1,
            opacity: 0.4,
            fillColor: color,
            fillOpacity: 0.15,
          }}
        />
      );
    }

    // Render past track (solid line)
    if (pastPoints.length >= 2) {
      const pastPositions: LatLngExpression[] = pastPoints.map(
        (p) => [p.lat, p.lng] as LatLngExpression
      );
      elements.push(
        <Polyline
          key={`past-track-${event.id}`}
          positions={pastPositions}
          pathOptions={{
            color,
            weight: 4,
            opacity: 1,
            lineCap: "round",
            lineJoin: "round",
          }}
        />
      );
    }

    // Connect past to future with a transitional line
    if (pastPoints.length > 0 && futurePoints.length > 0) {
      const lastPast = pastPoints[pastPoints.length - 1];
      const firstFuture = futurePoints[0];
      elements.push(
        <Polyline
          key={`transition-${event.id}`}
          positions={[
            [lastPast.lat, lastPast.lng],
            [firstFuture.lat, firstFuture.lng],
          ]}
          pathOptions={{
            color,
            weight: 3,
            opacity: 0.6,
            dashArray: "6, 6",
          }}
        />
      );
    }

    // Render future track (dashed, fading opacity)
    if (futurePoints.length >= 2) {
      const futurePositions: LatLngExpression[] = futurePoints.map(
        (p) => [p.lat, p.lng] as LatLngExpression
      );
      elements.push(
        <Polyline
          key={`future-track-${event.id}`}
          positions={futurePositions}
          pathOptions={{
            color,
            weight: 3,
            opacity: 0.5,
            dashArray: "8, 8",
            lineCap: "round",
            lineJoin: "round",
          }}
        />
      );
    }

    // Render track points as small circles
    trackPoints.forEach((point, idx) => {
      const isFuture = point.isForecast;
      const radius = isFuture ? 4 + (idx - pastPoints.length) * 0.5 : 5; // Future points grow slightly
      const opacity = isFuture ? 0.6 : 1;

      elements.push(
        <CircleMarker
          key={`point-${event.id}-${idx}`}
          center={[point.lat, point.lng]}
          radius={Math.min(radius, 10)}
          pathOptions={{
            color: "white",
            weight: 2,
            fillColor: color,
            fillOpacity: opacity,
            opacity: opacity,
          }}
        >
          <Tooltip direction="top" offset={[0, -8]}>
            <div className="text-xs">
              <div className="font-medium">{event.name}</div>
              <div>{point.time}</div>
              <div>{isFuture ? "Forecast" : "Observed"}</div>
              <div>{windSpeed.toFixed(0)} km/h</div>
            </div>
          </Tooltip>
        </CircleMarker>
      );
    });

    return elements;
  };

  return (
    <>
      {/* Render cyclone tracks first (under markers) */}
      {events.map((event) => renderCycloneTracks(event))}

      {/* Render markers for all events */}
      {events.map((event) => (
        <Marker
          key={event.id}
          position={[event.lat, event.lng]}
          icon={icons.get(event.id)!}
        >
          <Popup>
            <div className="grid gap-1 min-w-[200px]">
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{
                    backgroundColor: getAlertColor(event.alertLevel),
                  }}
                />
                <span className="font-semibold">
                  {getEventTypeName(event.eventType)}
                </span>
                <span
                  className="text-xs px-1.5 py-0.5 rounded"
                  style={{
                    backgroundColor: getAlertColor(event.alertLevel),
                    color: "white",
                  }}
                >
                  {event.alertLevel}
                </span>
              </div>
              <div className="text-sm font-medium">{event.name}</div>
              <div className="text-xs text-muted-foreground">
                {event.countries.join(", ")}
              </div>
              {event.cycloneData && (
                <div className="text-xs text-muted-foreground">
                  Wind: {event.cycloneData.windSpeed.toFixed(0)} km/h
                </div>
              )}
              {event.severityText && !event.cycloneData && (
                <div className="text-xs text-muted-foreground">
                  {event.severityText}
                </div>
              )}
              {event.cycloneData && (
                <div className="text-xs text-muted-foreground">
                  Track: {event.cycloneData.trackPoints.length} points
                </div>
              )}
              <div className="text-xs text-muted-foreground">
                {new Date(event.fromDate).toLocaleDateString()} -{" "}
                {event.isCurrent
                  ? "Ongoing"
                  : new Date(event.toDate).toLocaleDateString()}
              </div>
              <a
                href={event.reportUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs underline mt-1"
              >
                GDACS Report
              </a>
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  );
}
