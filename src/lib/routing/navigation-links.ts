import type { TravelMode } from "./osrm";

export type NavigationApp = {
  id: string;
  name: string;
  url: string;
};

// Google Maps travel mode mapping
const GOOGLE_TRAVEL_MODE: Record<TravelMode, string> = {
  driving: "driving",
  cycling: "bicycling",
  foot: "walking",
};

// Apple Maps direction flag mapping
const APPLE_DIRFLG: Record<TravelMode, string> = {
  driving: "d",
  cycling: "b",  // not officially supported but accepted
  foot: "w",
};

// OSM routing engine mapping
const OSM_ENGINE: Record<TravelMode, string> = {
  driving: "osrm_car",
  cycling: "osrm_bike",
  foot: "osrm_foot",
};

/**
 * Generate deep links for external navigation apps.
 * All coordinates use [lat, lng] convention.
 */
export function getNavigationLinks(
  origin: [number, number],
  destination: [number, number],
  mode: TravelMode = "driving",
): NavigationApp[] {
  const [oLat, oLng] = origin;
  const [dLat, dLng] = destination;

  const links: NavigationApp[] = [
    {
      id: "google",
      name: "Google Maps",
      url: `https://www.google.com/maps/dir/?api=1&origin=${oLat},${oLng}&destination=${dLat},${dLng}&travelmode=${GOOGLE_TRAVEL_MODE[mode]}`,
    },
    {
      id: "apple",
      name: "Apple Maps",
      url: `https://maps.apple.com/?saddr=${oLat},${oLng}&daddr=${dLat},${dLng}&dirflg=${APPLE_DIRFLG[mode]}`,
    },
    {
      id: "osm",
      name: "OSM",
      url: `https://www.openstreetmap.org/directions?engine=${OSM_ENGINE[mode]}&route=${oLat},${oLng};${dLat},${dLng}`,
    },
  ];

  // Waze only supports driving
  if (mode === "driving") {
    links.splice(1, 0, {
      id: "waze",
      name: "Waze",
      url: `https://waze.com/ul?ll=${dLat},${dLng}&navigate=yes`,
    });
  }

  return links;
}
