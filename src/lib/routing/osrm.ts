export type RouteResult = {
  geometry: [number, number][]; // [lat, lng] pairs (Leaflet convention)
  distance: number; // meters
  duration: number; // seconds
};

type OsrmResponse = {
  code: string;
  routes: Array<{
    distance: number;
    duration: number;
    geometry: {
      type: "LineString";
      coordinates: [number, number][]; // [lng, lat] (GeoJSON convention)
    };
  }>;
};

/**
 * Fetch a driving route from OSRM (OpenStreetMap Routing Machine).
 * Uses the free public demo server. No API key needed.
 */
export async function fetchRoute(
  origin: [number, number], // [lat, lng]
  destination: [number, number], // [lat, lng]
): Promise<RouteResult> {
  // OSRM expects lng,lat order
  const coords = `${origin[1]},${origin[0]};${destination[1]},${destination[0]}`;
  const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`OSRM error: ${res.status}`);

  const data = (await res.json()) as OsrmResponse;
  if (data.code !== "Ok" || !data.routes[0]) {
    throw new Error("No route found");
  }

  const route = data.routes[0];
  return {
    // Convert GeoJSON [lng, lat] → Leaflet [lat, lng]
    geometry: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
    distance: route.distance,
    duration: route.duration,
  };
}

/** Format meters as human-readable distance. */
export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

/** Format seconds as human-readable duration. */
export function formatDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return `${hours} h ${remaining} min`;
}
