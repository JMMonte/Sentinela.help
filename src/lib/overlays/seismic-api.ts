export type EarthquakeFeature = {
  id: string;
  geometry: {
    type: "Point";
    coordinates: [number, number, number]; // [lng, lat, depth]
  };
  properties: {
    mag: number;
    place: string;
    time: number;
    url: string;
    type: string;
    title: string;
  };
};

export type EarthquakeGeoJSON = {
  type: "FeatureCollection";
  features: EarthquakeFeature[];
  metadata: {
    generated: number;
    count: number;
    title: string;
  };
};

const USGS_FEED_URL =
  "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson";

export async function fetchEarthquakes(
  minMagnitude: number = 2.5
): Promise<EarthquakeGeoJSON> {
  const response = await fetch(USGS_FEED_URL);

  if (!response.ok) {
    throw new Error(`Failed to fetch earthquake data: ${response.status}`);
  }

  const data = (await response.json()) as EarthquakeGeoJSON;

  // Filter by minimum magnitude
  return {
    ...data,
    features: data.features.filter((f) => f.properties.mag >= minMagnitude),
  };
}

export function getMagnitudeColor(magnitude: number): string {
  if (magnitude >= 7) return "#dc2626"; // red-600
  if (magnitude >= 5) return "#ea580c"; // orange-600
  if (magnitude >= 3) return "#ca8a04"; // yellow-600
  return "#65a30d"; // lime-600
}

export function getMagnitudeRadius(magnitude: number): number {
  // Exponential scaling for visual impact
  return Math.max(4, Math.pow(magnitude, 1.5) * 2);
}
