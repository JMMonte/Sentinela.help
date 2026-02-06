"use client";

import { useEffect, useRef, useCallback } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import {
  type FireHotspot,
  getFireColor,
  getFireRadius,
} from "@/lib/overlays/fires-api";

export type FiresOverlayProps = {
  hotspots: FireHotspot[];
};

/**
 * Fires overlay - renders NASA FIRMS fire hotspots using canvas for performance.
 * Supports world tiling (fires appear on all visible world copies).
 * Can handle 30,000+ points without blocking the UI.
 */
export function FiresOverlay({ hotspots }: FiresOverlayProps) {
  const map = useMap();
  const canvasLayerRef = useRef<L.Layer | null>(null);

  const renderFires = useCallback(() => {
    if (!map || hotspots.length === 0) return;

    // Remove existing layer
    if (canvasLayerRef.current) {
      map.removeLayer(canvasLayerRef.current);
      canvasLayerRef.current = null;
    }

    // Create canvas layer using L.canvas renderer
    const canvasRenderer = L.canvas({ padding: 0.5 });
    const layerGroup = L.layerGroup();

    // Get map bounds
    const mapBounds = map.getBounds();
    const west = mapBounds.getWest();
    const east = mapBounds.getEast();

    // Calculate which world copies (offsets) are needed
    const startOffset = Math.floor((west + 180) / 360);
    const endOffset = Math.ceil((east + 180) / 360);

    const offsets: number[] = [];
    for (let i = startOffset - 1; i <= endOffset + 1; i++) {
      offsets.push(i * 360);
    }

    // Expanded bounds with padding for smooth panning
    const expandedBounds = mapBounds.pad(0.5);

    // Create markers for each world copy
    for (const offset of offsets) {
      for (const fire of hotspots) {
        const lon = fire.longitude + offset;
        const lat = fire.latitude;

        // Check if this fire (with offset) is visible
        if (!expandedBounds.contains([lat, lon])) continue;

        const color = getFireColor(fire.frp);
        const radius = getFireRadius(fire.frp);

        const circle = L.circleMarker([lat, lon], {
          radius,
          color,
          fillColor: color,
          fillOpacity: 0.8,
          weight: 1,
          renderer: canvasRenderer,
        });

        // Bind popup lazily (only created when clicked)
        circle.bindPopup(() => {
          const confidence = fire.confidence === "h" ? "High" : fire.confidence === "n" ? "Nominal" : "Low";
          const time = `${fire.acq_date} ${String(fire.acq_time).padStart(4, "0").slice(0, 2)}:${String(fire.acq_time).padStart(4, "0").slice(2)}`;
          return `
            <div style="font-size:12px;">
              <div style="font-weight:600;display:flex;align-items:center;gap:4px;">
                <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${color}"></span>
                Fire Hotspot
              </div>
              <div style="font-size:11px;color:#666;margin-top:4px;">
                <div><strong>FRP:</strong> ${fire.frp.toFixed(1)} MW</div>
                <div><strong>Confidence:</strong> ${confidence}</div>
                <div><strong>Satellite:</strong> ${fire.satellite}</div>
                <div><strong>Detected:</strong> ${time}</div>
                <div style="font-size:10px;opacity:0.7;margin-top:4px;">
                  ${fire.latitude.toFixed(4)}°, ${fire.longitude.toFixed(4)}°
                </div>
              </div>
            </div>
          `;
        }, { className: "fire-popup" });

        layerGroup.addLayer(circle);
      }
    }

    layerGroup.addTo(map);
    canvasLayerRef.current = layerGroup;
  }, [map, hotspots]);

  // Initial render and re-render on map move
  useEffect(() => {
    if (!map) return;

    // Debounce the render to avoid blocking during rapid panning
    let timeoutId: ReturnType<typeof setTimeout>;

    const debouncedRender = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(renderFires, 100);
    };

    // Initial render
    renderFires();

    // Re-render on map move to show fires in new viewport
    map.on("moveend", debouncedRender);
    map.on("zoomend", debouncedRender);

    return () => {
      clearTimeout(timeoutId);
      map.off("moveend", debouncedRender);
      map.off("zoomend", debouncedRender);
      if (canvasLayerRef.current) {
        map.removeLayer(canvasLayerRef.current);
        canvasLayerRef.current = null;
      }
    };
  }, [map, renderFires]);

  return null;
}
