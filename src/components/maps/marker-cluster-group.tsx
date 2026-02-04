"use client";

import { useEffect, useRef, useMemo } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.markercluster";

export type ClusteredMarker = {
  id: string;
  position: [number, number];
  icon: L.DivIcon;
  popupContent?: string;
};

export type MarkerClusterGroupProps = {
  /** Markers to cluster */
  markers: ClusteredMarker[];
  /** Custom function to create cluster icons */
  iconCreateFunction?: (cluster: L.MarkerCluster) => L.DivIcon;
  /** Maximum radius that a cluster will cover (default: 60) */
  maxClusterRadius?: number;
  /** Disable clustering at this zoom level and below */
  disableClusteringAtZoom?: number;
  /** Show coverage polygon on hover */
  showCoverageOnHover?: boolean;
  /** Spider legs on max zoom */
  spiderfyOnMaxZoom?: boolean;
  /** Chunked loading for better performance */
  chunkedLoading?: boolean;
};

export function MarkerClusterGroup({
  markers,
  iconCreateFunction,
  maxClusterRadius = 60,
  disableClusteringAtZoom = 18,
  showCoverageOnHover = false,
  spiderfyOnMaxZoom = true,
  chunkedLoading = true,
}: MarkerClusterGroupProps) {
  const map = useMap();
  const clusterGroupRef = useRef<L.MarkerClusterGroup | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());

  // Memoize options to prevent unnecessary recreation
  const options = useMemo(
    () => ({
      iconCreateFunction,
      maxClusterRadius,
      disableClusteringAtZoom,
      showCoverageOnHover,
      spiderfyOnMaxZoom,
      chunkedLoading,
    }),
    [
      iconCreateFunction,
      maxClusterRadius,
      disableClusteringAtZoom,
      showCoverageOnHover,
      spiderfyOnMaxZoom,
      chunkedLoading,
    ]
  );

  // Create cluster group on mount
  useEffect(() => {
    const clusterGroup = L.markerClusterGroup(options);
    clusterGroupRef.current = clusterGroup;
    map.addLayer(clusterGroup);

    return () => {
      map.removeLayer(clusterGroup);
      clusterGroupRef.current = null;
      markersRef.current.clear();
    };
  }, [map, options]);

  // Update markers when they change
  useEffect(() => {
    const clusterGroup = clusterGroupRef.current;
    if (!clusterGroup) return;

    const currentMarkers = markersRef.current;
    const newMarkerIds = new Set(markers.map((m) => m.id));

    // Remove markers that are no longer in the list
    for (const [id, marker] of currentMarkers) {
      if (!newMarkerIds.has(id)) {
        clusterGroup.removeLayer(marker);
        currentMarkers.delete(id);
      }
    }

    // Add or update markers
    for (const markerData of markers) {
      const existing = currentMarkers.get(markerData.id);

      if (existing) {
        // Update existing marker position and icon if changed
        const currentPos = existing.getLatLng();
        if (
          currentPos.lat !== markerData.position[0] ||
          currentPos.lng !== markerData.position[1]
        ) {
          existing.setLatLng(markerData.position);
        }
        existing.setIcon(markerData.icon);
      } else {
        // Create new marker
        const marker = L.marker(markerData.position, { icon: markerData.icon });

        if (markerData.popupContent) {
          marker.bindPopup(markerData.popupContent);
        }

        clusterGroup.addLayer(marker);
        currentMarkers.set(markerData.id, marker);
      }
    }
  }, [markers]);

  return null;
}
