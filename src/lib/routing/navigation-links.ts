export type NavigationApp = {
  id: string;
  name: string;
  url: string;
};

/**
 * Generate deep links for external navigation apps.
 * All coordinates use [lat, lng] convention.
 */
export function getNavigationLinks(
  origin: [number, number],
  destination: [number, number],
): NavigationApp[] {
  const [oLat, oLng] = origin;
  const [dLat, dLng] = destination;

  return [
    {
      id: "google",
      name: "Google Maps",
      url: `https://www.google.com/maps/dir/?api=1&origin=${oLat},${oLng}&destination=${dLat},${dLng}&travelmode=driving`,
    },
    {
      id: "waze",
      name: "Waze",
      url: `https://waze.com/ul?ll=${dLat},${dLng}&navigate=yes`,
    },
    {
      id: "apple",
      name: "Apple Maps",
      url: `https://maps.apple.com/?saddr=${oLat},${oLng}&daddr=${dLat},${dLng}&dirflg=d`,
    },
    {
      id: "osm",
      name: "OSM",
      url: `https://www.openstreetmap.org/directions?engine=osrm_car&route=${oLat},${oLng};${dLat},${dLng}`,
    },
  ];
}
