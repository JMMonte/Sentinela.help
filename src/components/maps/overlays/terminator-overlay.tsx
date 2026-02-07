"use client";

import { useEffect, useRef, useMemo, useCallback } from "react";
import { useMap, useMapEvents } from "react-leaflet";
import { useTheme } from "next-themes";
import L from "leaflet";

export type TerminatorOverlayProps = {
  /** Enable real-time animation (updates every second) */
  animate?: boolean;
};

const R2D = 180 / Math.PI;
const D2R = Math.PI / 180;

/**
 * Calculate the Julian date for a given Date object.
 */
function getJulianDate(date: Date): number {
  return date.getTime() / 86400000 + 2440587.5;
}

/**
 * Calculate the Greenwich Mean Sidereal Time in degrees.
 */
function getGMST(date: Date): number {
  const jd = getJulianDate(date);
  const d = jd - 2451545.0;
  let gmst = 280.46061837 + 360.98564736629 * d;
  gmst = ((gmst % 360) + 360) % 360;
  return gmst;
}

/**
 * Calculate the sun's position (right ascension and declination).
 */
function getSunPosition(date: Date): { ra: number; dec: number } {
  const jd = getJulianDate(date);
  const n = jd - 2451545.0;

  const L = ((280.46 + 0.9856474 * n) % 360 + 360) % 360;
  const g = ((357.528 + 0.9856003 * n) % 360 + 360) % 360;
  const gRad = g * D2R;

  const lambda = L + 1.915 * Math.sin(gRad) + 0.02 * Math.sin(2 * gRad);
  const lambdaRad = lambda * D2R;

  const epsilon = 23.439 - 0.0000004 * n;
  const epsilonRad = epsilon * D2R;

  const ra = Math.atan2(Math.cos(epsilonRad) * Math.sin(lambdaRad), Math.cos(lambdaRad)) * R2D;
  const dec = Math.asin(Math.sin(epsilonRad) * Math.sin(lambdaRad)) * R2D;

  return { ra: ((ra % 360) + 360) % 360, dec };
}

/**
 * Get the subsolar point (where the sun is directly overhead).
 */
function getSubsolarPoint(date: Date): { lat: number; lng: number } {
  const { ra, dec } = getSunPosition(date);
  const gmst = getGMST(date);

  let lng = ra - gmst;
  while (lng > 180) lng -= 360;
  while (lng < -180) lng += 360;

  return { lat: dec, lng };
}

/**
 * Create night polygon by latitude bands.
 */
function createNightPolygonByLatitude(
  sunLat: number,
  sunLng: number,
  lngOffset: number = 0,
  resolution: number = 180
): L.LatLngExpression[] {
  const sunLatRad = sunLat * D2R;
  const tanSunLat = Math.tan(sunLatRad);

  const nightCenterLng = sunLng + 180 + lngOffset;

  const polygon: [number, number][] = [];

  // West side (sunset line) - from north to south
  for (let i = 0; i <= resolution; i++) {
    const lat = 90 - (i / resolution) * 180;
    const effectiveLat = Math.max(-89.99, Math.min(89.99, lat));
    const latRad = effectiveLat * D2R;
    const tanLat = Math.tan(latRad);

    const cosH = -tanLat * tanSunLat;

    let halfNightWidth: number;
    if (cosH >= 1) {
      halfNightWidth = 180;
    } else if (cosH <= -1) {
      halfNightWidth = 0;
    } else {
      const H = Math.acos(cosH) * R2D;
      halfNightWidth = 180 - H;
    }

    const westLng = nightCenterLng - halfNightWidth;
    polygon.push([lat, westLng]);
  }

  // East side (sunrise line) - from south to north
  for (let i = resolution; i >= 0; i--) {
    const lat = 90 - (i / resolution) * 180;
    const effectiveLat = Math.max(-89.99, Math.min(89.99, lat));
    const latRad = effectiveLat * D2R;
    const tanLat = Math.tan(latRad);

    const cosH = -tanLat * tanSunLat;

    let halfNightWidth: number;
    if (cosH >= 1) {
      halfNightWidth = 180;
    } else if (cosH <= -1) {
      halfNightWidth = 0;
    } else {
      const H = Math.acos(cosH) * R2D;
      halfNightWidth = 180 - H;
    }

    const eastLng = nightCenterLng + halfNightWidth;
    polygon.push([lat, eastLng]);
  }

  return polygon;
}

/**
 * Calculate which world copies are needed based on map bounds.
 */
function getRequiredOffsets(bounds: L.LatLngBounds): number[] {
  const west = bounds.getWest();
  const east = bounds.getEast();

  // Calculate which 360 world copies are visible
  const minWorldIndex = Math.floor(west / 360);
  const maxWorldIndex = Math.floor(east / 360);

  const offsets: number[] = [];
  for (let i = minWorldIndex - 1; i <= maxWorldIndex + 1; i++) {
    offsets.push(i * 360);
  }

  return offsets;
}

/**
 * Day/Night terminator overlay.
 * Shows the shadow of night on the map.
 */
export function TerminatorOverlay({ animate = false }: TerminatorOverlayProps) {
  const map = useMap();
  const { resolvedTheme } = useTheme();
  const layersRef = useRef<Map<number, L.Polygon>>(new Map());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const sunPositionRef = useRef<{ lat: number; lng: number } | null>(null);

  const isDark = resolvedTheme === "dark";

  const style: L.PolylineOptions = useMemo(() => ({
    fillColor: isDark ? "rgba(0, 0, 0, 0.4)" : "rgba(0, 0, 30, 0.18)",
    fillOpacity: 1,
    stroke: false,
    interactive: false,
  }), [isDark]);

  // Update polygon coordinates without recreating them
  const updatePolygonCoordinates = useCallback((sunLat: number, sunLng: number) => {
    layersRef.current.forEach((polygon, offset) => {
      const newCoords = createNightPolygonByLatitude(sunLat, sunLng, offset, 180);
      polygon.setLatLngs(newCoords);
    });
  }, []);

  // Update polygons based on current view
  const updatePolygons = useCallback(() => {
    if (!map || !sunPositionRef.current) return;

    const bounds = map.getBounds();
    const requiredOffsets = getRequiredOffsets(bounds);
    const { lat: sunLat, lng: sunLng } = sunPositionRef.current;

    // Remove polygons that are no longer needed
    const currentOffsets = new Set(requiredOffsets);
    layersRef.current.forEach((polygon, offset) => {
      if (!currentOffsets.has(offset)) {
        map.removeLayer(polygon);
        layersRef.current.delete(offset);
      }
    });

    // Add polygons that are newly needed
    for (const offset of requiredOffsets) {
      if (!layersRef.current.has(offset)) {
        const nightPolygon = createNightPolygonByLatitude(sunLat, sunLng, offset, 180);
        const polygon = L.polygon(nightPolygon, style);
        polygon.addTo(map);
        layersRef.current.set(offset, polygon);
      }
    }
  }, [map, style]);

  // Update sun position and refresh polygons
  const updateSunPosition = useCallback((recreate: boolean = true) => {
    if (!map) return;

    const now = new Date();
    sunPositionRef.current = getSubsolarPoint(now);

    if (recreate) {
      // Clear all existing polygons (full refresh)
      layersRef.current.forEach((polygon) => {
        map.removeLayer(polygon);
      });
      layersRef.current.clear();
      updatePolygons();
    } else {
      // Just update coordinates (for animation)
      updatePolygonCoordinates(sunPositionRef.current.lat, sunPositionRef.current.lng);
    }
  }, [map, updatePolygons, updatePolygonCoordinates]);

  // Animation tick for real-time updates (once per second)
  const animationTick = useCallback(() => {
    updateSunPosition(false);
  }, [updateSunPosition]);

  // Listen to map move events
  useMapEvents({
    moveend: updatePolygons,
    zoomend: updatePolygons,
  });

  // Initial setup and interval/animation
  useEffect(() => {
    if (!map) return;

    // Initial render
    updateSunPosition(true);

    if (animate) {
      // Update every second for real-time animation
      intervalRef.current = setInterval(animationTick, 1000);
    } else {
      // Update every minute when not animating
      intervalRef.current = setInterval(() => updateSunPosition(false), 60000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      layersRef.current.forEach((polygon) => {
        map.removeLayer(polygon);
      });
      layersRef.current.clear();
    };
  }, [map, animate, updateSunPosition, animationTick]);

  // Update style when theme changes
  useEffect(() => {
    if (!map || !sunPositionRef.current) return;

    // Recreate all polygons with new style
    const { lat: sunLat, lng: sunLng } = sunPositionRef.current;

    layersRef.current.forEach((polygon, offset) => {
      map.removeLayer(polygon);
      const nightPolygon = createNightPolygonByLatitude(sunLat, sunLng, offset, 180);
      const newPolygon = L.polygon(nightPolygon, style);
      newPolygon.addTo(map);
      layersRef.current.set(offset, newPolygon);
    });
  }, [map, style]);

  return null;
}
