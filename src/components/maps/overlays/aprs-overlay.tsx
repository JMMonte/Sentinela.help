"use client";

import { useEffect, useRef, useCallback } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import {
  type AprsStation,
  getStationType,
  getAprsColor,
  getAprsIcon,
  formatLastHeard,
} from "@/lib/overlays/aprs-api";

export type AprsOverlayProps = {
  stations: AprsStation[];
  onBoundsChange?: (bounds: { lamin: number; lomin: number; lamax: number; lomax: number }) => void;
};

/**
 * APRS overlay - renders amateur radio station positions.
 * Different icons/colors for different station types.
 */
export function AprsOverlay({ stations, onBoundsChange }: AprsOverlayProps) {
  const map = useMap();
  const layerRef = useRef<L.LayerGroup | null>(null);
  const onBoundsChangeRef = useRef(onBoundsChange);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep the callback ref updated
  useEffect(() => {
    onBoundsChangeRef.current = onBoundsChange;
  }, [onBoundsChange]);

  // Notify parent of bounds on mount and when map moves
  useEffect(() => {
    if (!map) return;

    const notifyBounds = () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        const b = map.getBounds().pad(0.3);
        onBoundsChangeRef.current?.({
          lamin: b.getSouth(),
          lomin: b.getWest(),
          lamax: b.getNorth(),
          lomax: b.getEast(),
        });
      }, 500);
    };

    // Initial bounds notification
    const initTimer = setTimeout(() => {
      const b = map.getBounds().pad(0.3);
      onBoundsChangeRef.current?.({
        lamin: b.getSouth(),
        lomin: b.getWest(),
        lamax: b.getNorth(),
        lomax: b.getEast(),
      });
    }, 100);

    map.on("moveend", notifyBounds);

    return () => {
      clearTimeout(initTimer);
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      map.off("moveend", notifyBounds);
    };
  }, [map]);

  const renderStations = useCallback(() => {
    if (!map) return;

    // Remove existing layer
    if (layerRef.current) {
      map.removeLayer(layerRef.current);
      layerRef.current = null;
    }

    if (stations.length === 0) return;

    const canvasRenderer = L.canvas({ padding: 0.5 });
    const layerGroup = L.layerGroup();

    const mapBounds = map.getBounds();
    const west = mapBounds.getWest();
    const east = mapBounds.getEast();

    // Calculate world copy offsets
    const startOffset = Math.floor((west + 180) / 360);
    const endOffset = Math.ceil((east + 180) / 360);
    const offsets: number[] = [];
    for (let i = startOffset - 1; i <= endOffset + 1; i++) {
      offsets.push(i * 360);
    }

    const expandedBounds = mapBounds.pad(0.5);

    for (const offset of offsets) {
      for (const station of stations) {
        const lon = station.longitude + offset;
        const lat = station.latitude;

        if (!expandedBounds.contains([lat, lon])) continue;

        const type = getStationType(station.symbol, station.symbolTable);
        const color = getAprsColor(type);
        const icon = getAprsIcon(type);

        const marker = L.circleMarker([lat, lon], {
          radius: 5,
          color: "#333",
          fillColor: color,
          fillOpacity: 0.9,
          weight: 1,
          renderer: canvasRenderer,
        });

        marker.bindPopup(() => {
          const lastHeard = formatLastHeard(station.lastHeard);
          const speed = station.speed !== null ? `${station.speed.toFixed(0)} km/h` : "N/A";
          const altitude = station.altitude !== null ? `${station.altitude.toFixed(0)} m` : "N/A";
          const comment = station.comment || "No comment";

          let weatherHtml = "";
          if (station.weather) {
            const w = station.weather;
            weatherHtml = `
              <div style="margin-top:6px;padding-top:6px;border-top:1px solid #ddd;">
                <strong>Weather:</strong>
                ${w.temp !== null ? `<div>Temp: ${w.temp}°C</div>` : ""}
                ${w.humidity !== null ? `<div>Humidity: ${w.humidity}%</div>` : ""}
                ${w.windSpeed !== null ? `<div>Wind: ${w.windSpeed} km/h</div>` : ""}
                ${w.rain1h !== null ? `<div>Rain (1h): ${w.rain1h} mm</div>` : ""}
              </div>
            `;
          }

          return `
            <div style="font-size:12px;min-width:160px;">
              <div style="font-weight:600;display:flex;align-items:center;gap:4px;">
                <span style="font-size:14px;">${icon}</span>
                ${station.callsign}
              </div>
              <div style="font-size:11px;color:#666;margin-top:4px;">
                <div><strong>Type:</strong> ${type}</div>
                <div><strong>Last heard:</strong> ${lastHeard}</div>
                <div><strong>Speed:</strong> ${speed}</div>
                <div><strong>Altitude:</strong> ${altitude}</div>
                <div style="word-break:break-word;"><strong>Comment:</strong> ${comment}</div>
                ${station.path ? `<div><strong>Path:</strong> ${station.path}</div>` : ""}
                ${weatherHtml}
                <div style="font-size:10px;opacity:0.7;margin-top:4px;">
                  ${station.latitude.toFixed(4)}°, ${station.longitude.toFixed(4)}°
                </div>
              </div>
            </div>
          `;
        });

        layerGroup.addLayer(marker);
      }
    }

    layerGroup.addTo(map);
    layerRef.current = layerGroup;
  }, [map, stations]);

  useEffect(() => {
    if (!map) return;

    let timeoutId: ReturnType<typeof setTimeout>;
    const debouncedRender = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(renderStations, 100);
    };

    renderStations();

    map.on("moveend", debouncedRender);
    map.on("zoomend", debouncedRender);

    return () => {
      clearTimeout(timeoutId);
      map.off("moveend", debouncedRender);
      map.off("zoomend", debouncedRender);
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [map, renderStations]);

  return null;
}
