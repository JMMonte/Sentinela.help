"use client";

import { useEffect, useRef, useCallback } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import {
  type LightningStrike,
  getLightningColor,
  getLightningOpacity,
  getLightningRadius,
  formatLightningTime,
} from "@/lib/overlays/lightning-api";

export type LightningOverlayProps = {
  strikes: LightningStrike[];
};

/**
 * Lightning overlay - renders Blitzortung lightning strikes.
 * Newer strikes are brighter and larger, creating a pulsing effect.
 */
export function LightningOverlay({ strikes }: LightningOverlayProps) {
  const map = useMap();
  const layerRef = useRef<L.LayerGroup | null>(null);

  const renderStrikes = useCallback(() => {
    if (!map) return;

    // Remove existing layer
    if (layerRef.current) {
      map.removeLayer(layerRef.current);
      layerRef.current = null;
    }

    if (strikes.length === 0) return;

    const canvasRenderer = L.canvas({ padding: 0.5 });
    const layerGroup = L.layerGroup();

    const now = Date.now();
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
      for (const strike of strikes) {
        const lon = strike.longitude + offset;
        const lat = strike.latitude;

        if (!expandedBounds.contains([lat, lon])) continue;

        const ageMs = now - strike.time;
        const color = getLightningColor(ageMs);
        const opacity = getLightningOpacity(ageMs);
        const radius = getLightningRadius(ageMs);

        // Create lightning marker with glow effect
        const marker = L.circleMarker([lat, lon], {
          radius,
          color: "#ffffff",
          fillColor: color,
          fillOpacity: opacity,
          weight: 2,
          opacity: opacity * 0.8,
          renderer: canvasRenderer,
        });

        marker.bindPopup(() => {
          const timeStr = formatLightningTime(strike.time);
          const localTime = new Date(strike.time).toLocaleTimeString();

          return `
            <div style="font-size:12px;">
              <div style="font-weight:600;display:flex;align-items:center;gap:4px;">
                <span style="font-size:14px;">⚡</span>
                Lightning Strike
              </div>
              <div style="font-size:11px;color:#666;margin-top:4px;">
                <div><strong>Time:</strong> ${localTime}</div>
                <div><strong>Age:</strong> ${timeStr}</div>
                <div style="font-size:10px;opacity:0.7;margin-top:4px;">
                  ${strike.latitude.toFixed(4)}°, ${strike.longitude.toFixed(4)}°
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
  }, [map, strikes]);

  useEffect(() => {
    if (!map) return;

    let timeoutId: ReturnType<typeof setTimeout>;
    const debouncedRender = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(renderStrikes, 100);
    };

    renderStrikes();

    // Re-render periodically to update strike ages
    const ageInterval = setInterval(renderStrikes, 30000);

    map.on("moveend", debouncedRender);
    map.on("zoomend", debouncedRender);

    return () => {
      clearTimeout(timeoutId);
      clearInterval(ageInterval);
      map.off("moveend", debouncedRender);
      map.off("zoomend", debouncedRender);
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [map, renderStrikes]);

  return null;
}
