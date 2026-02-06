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

export async function fetchEarthquakes(
  minMagnitude: number = 2.5,
  hours: number = 24,
): Promise<EarthquakeGeoJSON> {
  // Fetch via server proxy (caches USGS responses)
  const response = await fetch(
    `/api/seismic?hours=${hours}&minMag=${minMagnitude}`,
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch earthquake data: ${response.status}`);
  }

  return (await response.json()) as EarthquakeGeoJSON;
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
