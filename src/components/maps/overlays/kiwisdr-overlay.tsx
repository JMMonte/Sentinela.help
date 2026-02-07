"use client";

import { useEffect, useRef, useCallback } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import {
  type KiwiStation,
  getKiwiColor,
  getKiwiStatus,
} from "@/lib/overlays/kiwisdr-api";

export type KiwiSdrOverlayProps = {
  stations: KiwiStation[];
};

/**
 * KiwiSDR overlay - renders WebSDR station locations.
 * Click to open the SDR in a new tab.
 */
export function KiwiSdrOverlay({ stations }: KiwiSdrOverlayProps) {
  const map = useMap();
  const layerRef = useRef<L.LayerGroup | null>(null);

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

        const color = getKiwiColor(station);
        const status = getKiwiStatus(station);

        const marker = L.circleMarker([lat, lon], {
          radius: 5,
          color: "#333",
          fillColor: color,
          fillOpacity: station.offline ? 0.4 : 0.9,
          weight: 1,
          renderer: canvasRenderer,
        });

        marker.bindPopup(() => {
          const antenna = station.antenna || "Not specified";
          const location = station.location || "Unknown";
          const snr = station.snr !== null ? `${station.snr} dB` : "N/A";

          return `
            <div style="font-size:12px;min-width:180px;">
              <div style="font-weight:600;display:flex;align-items:center;gap:4px;">
                <span style="font-size:14px;">📻</span>
                ${station.name}
              </div>
              <div style="font-size:11px;color:#666;margin-top:4px;">
                <div><strong>Status:</strong> <span style="color:${color}">${status}</span></div>
                <div><strong>Location:</strong> ${location}</div>
                <div><strong>Antenna:</strong> ${antenna}</div>
                <div><strong>SNR:</strong> ${snr}</div>
                <div><strong>Frequency:</strong> 0-30 MHz</div>
                ${!station.offline ? `
                  <div style="margin-top:8px;">
                    <a href="${station.url}" target="_blank" rel="noopener noreferrer"
                       style="color:#3b82f6;text-decoration:none;font-weight:500;">
                      Open SDR →
                    </a>
                  </div>
                ` : ""}
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
