"use client";

import { useEffect } from "react";
import { Polyline, useMap } from "react-leaflet";
import L from "leaflet";

export type RouteOverlayProps = {
  geometry: [number, number][]; // [lat, lng] pairs
};

export function RouteOverlay({ geometry }: RouteOverlayProps) {
  const map = useMap();

  // Fit map bounds to show the full route
  useEffect(() => {
    if (geometry.length < 2) return;
    const bounds = L.latLngBounds(geometry);
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
  }, [map, geometry]);

  return (
    <Polyline
      positions={geometry}
      pathOptions={{
        color: "#2563eb",
        weight: 4,
        opacity: 0.8,
        lineCap: "round",
        lineJoin: "round",
      }}
    />
  );
}
