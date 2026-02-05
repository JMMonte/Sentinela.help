"use client";

import { useEffect, useRef } from "react";
import { CircleMarker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.heat";
import type { StationObservation } from "@/lib/overlays/rainfall-api";

export type RainfallOverlayProps = {
  stations: StationObservation[];
};

/** Max precipitation value for heatmap intensity normalisation. */
const HEAT_MAX = 40;

const HEAT_GRADIENT: Record<number, string> = {
  0.0: "#3b82f600", // transparent at zero
  0.15: "#60a5fa",  // blue-400
  0.35: "#38bdf8",  // sky-400
  0.5: "#facc15",   // yellow-400
  0.7: "#f97316",   // orange-500
  0.85: "#ef4444",  // red-500
  1.0: "#7c3aed",   // purple-600
};

/**
 * Imperative Leaflet.heat canvas layer managed through useMap().
 * Renders a blurred heatmap based on station precipitation totals.
 */
function HeatmapLayer({ stations }: { stations: StationObservation[] }) {
  const map = useMap();
  const heatRef = useRef<L.HeatLayer | null>(null);

  useEffect(() => {
    const points: [number, number, number][] = stations
      .filter((s) => s.precTotal > 0)
      .map((s) => [s.lat, s.lng, Math.min(s.precTotal, HEAT_MAX)]);

    if (!heatRef.current) {
      heatRef.current = L.heatLayer(points, {
        radius: 30,
        blur: 25,
        max: HEAT_MAX,
        maxZoom: 12,
        minOpacity: 0.25,
        gradient: HEAT_GRADIENT,
      }).addTo(map);
    } else {
      heatRef.current.setLatLngs(points);
    }

    return () => {
      if (heatRef.current) {
        map.removeLayer(heatRef.current);
        heatRef.current = null;
      }
    };
  }, [map, stations]);

  return null;
}

export function RainfallOverlay({ stations }: RainfallOverlayProps) {
  return (
    <>
      {/* Canvas heatmap for visual intensity */}
      <HeatmapLayer stations={stations} />

      {/* Small clickable dots for station popups */}
      {stations.map((s) => (
        <CircleMarker
          key={s.stationId}
          center={[s.lat, s.lng]}
          radius={4}
          pathOptions={{
            fillColor: "#fff",
            fillOpacity: s.precTotal > 0 ? 0.6 : 0.25,
            color: "#475569",
            weight: 1,
            opacity: s.precTotal > 0 ? 0.7 : 0.3,
          }}
        >
          <Popup>
            <div className="grid gap-1 min-w-[180px]">
              <div className="font-semibold text-sm">{s.name}</div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                <span>Precip. (24h):</span>
                <span className="font-medium text-foreground">
                  {s.precTotal}mm
                </span>
                <span>Precip. (last h):</span>
                <span className="font-medium text-foreground">
                  {s.precHourly}mm
                </span>
                {s.temperature != null && (
                  <>
                    <span>Temperatura:</span>
                    <span>{s.temperature}°C</span>
                  </>
                )}
                {s.humidity != null && (
                  <>
                    <span>Humidade:</span>
                    <span>{s.humidity}%</span>
                  </>
                )}
              </div>
              <div className="text-[10px] text-muted-foreground pt-1">
                Fonte: IPMA ({s.hoursWithData}h de dados)
              </div>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </>
  );
}
