"use client";

import { useEffect, useRef, useCallback } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import {
  type Aircraft,
  getAircraftColor,
  formatAltitude,
  formatVelocity,
} from "@/lib/overlays/aircraft-api";

export type AircraftOverlayProps = {
  aircraft: Aircraft[];
  onBoundsChange?: (bounds: { lamin: number; lomin: number; lamax: number; lomax: number }) => void;
};

type MarkerData = {
  marker: L.Marker;
  currentLat: number;
  currentLng: number;
  targetLat: number;
  targetLng: number;
  currentHeading: number;
  targetHeading: number;
};

const ANIMATION_DURATION = 1500; // 1.5 seconds

/**
 * Lerp (linear interpolation) between two values
 */
function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

/**
 * Lerp angle (handles wraparound at 360 degrees)
 */
function lerpAngle(start: number, end: number, t: number): number {
  let diff = end - start;
  // Handle wraparound
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return start + diff * t;
}

/**
 * Easing function (ease-out cubic)
 */
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Aircraft overlay using Leaflet markers with smooth position animation.
 */
export function AircraftOverlay({ aircraft, onBoundsChange }: AircraftOverlayProps) {
  const map = useMap();
  const markersRef = useRef<Map<string, MarkerData>>(new Map());
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const animationRef = useRef<number | null>(null);
  const animationStartRef = useRef<number>(0);
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

  const createIcon = useCallback((plane: Aircraft, heading: number) => {
    const color = getAircraftColor(plane.altitude);
    const rotation = heading - 45;

    return L.divIcon({
      className: "aircraft-marker",
      html: `<div style="transform: rotate(${rotation}deg); color: ${color}; opacity: ${plane.onGround ? 0.4 : 0.9}; transition: transform 0.1s linear;">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="rgba(0,0,0,0.3)" stroke-width="0.5">
          <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>
        </svg>
      </div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });
  }, []);

  const createPopup = useCallback((plane: Aircraft) => {
    const color = getAircraftColor(plane.altitude);
    const callsign = plane.callsign || "Unknown";
    const altitude = formatAltitude(plane.altitude);
    const speed = formatVelocity(plane.velocity);
    const headingStr = plane.heading !== null ? `${Math.round(plane.heading)}°` : "N/A";
    const vrate = plane.verticalRate !== null
      ? `${plane.verticalRate > 0 ? "+" : ""}${Math.round(plane.verticalRate * 196.85)} ft/min`
      : "N/A";

    const altFeet = plane.altitude !== null ? plane.altitude * 3.28084 : null;
    const altCategory = altFeet === null ? "Unknown"
      : altFeet < 1000 ? "Very Low"
      : altFeet < 5000 ? "Low"
      : altFeet < 15000 ? "Medium"
      : altFeet < 30000 ? "High"
      : altFeet < 40000 ? "Very High"
      : "Cruise";

    return `
      <div style="font-size:12px;min-width:150px;">
        <div style="font-weight:600;">${callsign}</div>
        <div style="font-size:11px;color:#666;margin-top:4px;">
          <div><strong>ICAO:</strong> ${plane.icao24.toUpperCase()}</div>
          <div style="display:flex;align-items:center;gap:4px;">
            <strong>Altitude:</strong> ${altitude}
            <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${color};"></span>
            <span style="font-size:10px;opacity:0.7;">${altCategory}</span>
          </div>
          <div><strong>Speed:</strong> ${speed}</div>
          <div><strong>Heading:</strong> ${headingStr}</div>
          <div><strong>V/S:</strong> ${vrate}</div>
          <div><strong>Country:</strong> ${plane.originCountry}</div>
          <div style="font-size:10px;opacity:0.7;margin-top:4px;">
            ${plane.onGround ? "On Ground" : "Airborne"}
          </div>
        </div>
      </div>
    `;
  }, []);

  // Animation loop
  const animate = useCallback(() => {
    const elapsed = performance.now() - animationStartRef.current;
    const progress = Math.min(elapsed / ANIMATION_DURATION, 1);
    const easedProgress = easeOutCubic(progress);

    for (const [, data] of markersRef.current) {
      const newLat = lerp(data.currentLat, data.targetLat, easedProgress);
      const newLng = lerp(data.currentLng, data.targetLng, easedProgress);
      const newHeading = lerpAngle(data.currentHeading, data.targetHeading, easedProgress);

      data.marker.setLatLng([newLat, newLng]);

      // Update icon rotation
      const iconElement = data.marker.getElement()?.querySelector("div");
      if (iconElement) {
        const rotation = newHeading - 45;
        iconElement.style.transform = `rotate(${rotation}deg)`;
      }
    }

    if (progress < 1) {
      animationRef.current = requestAnimationFrame(animate);
    } else {
      // Animation complete - update current positions to target
      for (const [, data] of markersRef.current) {
        data.currentLat = data.targetLat;
        data.currentLng = data.targetLng;
        data.currentHeading = data.targetHeading;
      }
      animationRef.current = null;
    }
  }, []);

  // Update aircraft positions
  useEffect(() => {
    if (!map) return;

    // Initialize layer group if needed
    if (!layerGroupRef.current) {
      layerGroupRef.current = L.layerGroup().addTo(map);
    }

    const layerGroup = layerGroupRef.current;
    const currentIcaos = new Set(aircraft.map(a => a.icao24));
    const existingIcaos = new Set(markersRef.current.keys());

    // Remove markers for aircraft no longer in view
    for (const icao of existingIcaos) {
      if (!currentIcaos.has(icao)) {
        const data = markersRef.current.get(icao);
        if (data) {
          layerGroup.removeLayer(data.marker);
          markersRef.current.delete(icao);
        }
      }
    }

    // Update or create markers
    for (const plane of aircraft) {
      const existing = markersRef.current.get(plane.icao24);
      const heading = plane.heading ?? 0;

      if (existing) {
        // Update target position for existing marker
        existing.targetLat = plane.latitude;
        existing.targetLng = plane.longitude;
        existing.targetHeading = heading;

        // Update popup content
        existing.marker.setPopupContent(createPopup(plane));

        // Update icon (for color changes due to altitude)
        existing.marker.setIcon(createIcon(plane, existing.currentHeading));
      } else {
        // Create new marker
        const marker = L.marker([plane.latitude, plane.longitude], {
          icon: createIcon(plane, heading),
        });

        marker.bindPopup(createPopup(plane));
        layerGroup.addLayer(marker);

        markersRef.current.set(plane.icao24, {
          marker,
          currentLat: plane.latitude,
          currentLng: plane.longitude,
          targetLat: plane.latitude,
          targetLng: plane.longitude,
          currentHeading: heading,
          targetHeading: heading,
        });
      }
    }

    // Start animation if there are existing markers with new targets
    if (markersRef.current.size > 0) {
      // Cancel any existing animation
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }

      animationStartRef.current = performance.now();
      animationRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [map, aircraft, createIcon, createPopup, animate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (layerGroupRef.current && map) {
        map.removeLayer(layerGroupRef.current);
        layerGroupRef.current = null;
      }
      markersRef.current.clear();
    };
  }, [map]);

  return null;
}
