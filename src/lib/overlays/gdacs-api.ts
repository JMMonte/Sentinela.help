/**
 * GDACS (Global Disaster Alert and Coordination System) API integration.
 *
 * Provides global disaster alerts for earthquakes, floods, tropical cyclones,
 * volcanoes, wildfires, and droughts.
 *
 * API Documentation: https://www.gdacs.org/
 */

export type GdacsEventType = "EQ" | "FL" | "TC" | "VO" | "WF" | "DR";

export type GdacsAlertLevel = "Green" | "Orange" | "Red";

// Track point for tropical cyclone with timestamp
export type GdacsTrackPoint = {
  lng: number;
  lat: number;
  time: string; // e.g., "07/02 06:00 UTC"
  isForecast: boolean; // true if future position
  index: number; // Track point index from GDACS (for proper ordering)
};

// Cyclone-specific data
export type GdacsCycloneData = {
  trackPoints: GdacsTrackPoint[];
  forecastCone?: number[][]; // [lng, lat][] polygon for uncertainty cone
  windSpeed: number; // km/h
};

export type GdacsEvent = {
  id: string;
  eventType: GdacsEventType;
  name: string;
  description: string;
  alertLevel: GdacsAlertLevel;
  country: string;
  countries: string[];
  lat: number;
  lng: number;
  fromDate: string;
  toDate: string;
  severity: number;
  severityText: string;
  iconUrl: string;
  reportUrl: string;
  isCurrent: boolean;
  // For tropical cyclones: detailed track and forecast data
  cycloneData?: GdacsCycloneData;
};

export type GdacsResponse = {
  events: GdacsEvent[];
  fetchedAt: string;
};

/**
 * Get event type display name
 */
export function getEventTypeName(type: GdacsEventType): string {
  const names: Record<GdacsEventType, string> = {
    EQ: "Earthquake",
    FL: "Flood",
    TC: "Tropical Cyclone",
    VO: "Volcano",
    WF: "Wildfire",
    DR: "Drought",
  };
  return names[type] || type;
}

/**
 * Get event type icon/emoji
 */
export function getEventTypeIcon(type: GdacsEventType): string {
  const icons: Record<GdacsEventType, string> = {
    EQ: "earthquake",
    FL: "flood",
    TC: "cyclone",
    VO: "volcano",
    WF: "fire",
    DR: "drought",
  };
  return icons[type] || "alert";
}

/**
 * Get alert level color
 */
export function getAlertColor(level: GdacsAlertLevel): string {
  const colors: Record<GdacsAlertLevel, string> = {
    Green: "#22c55e",
    Orange: "#f97316",
    Red: "#ef4444",
  };
  return colors[level] || "#71717a";
}

/**
 * Get marker size based on alert level
 */
export function getMarkerSize(level: GdacsAlertLevel): number {
  const sizes: Record<GdacsAlertLevel, number> = {
    Green: 8,
    Orange: 12,
    Red: 16,
  };
  return sizes[level] || 8;
}

/**
 * Fetch GDACS events from our API proxy
 */
export async function fetchGdacsEvents(): Promise<GdacsEvent[]> {
  const response = await fetch("/api/gdacs");

  if (!response.ok) {
    throw new Error(`Failed to fetch GDACS data: ${response.status}`);
  }

  const data = (await response.json()) as GdacsResponse;
  return data.events;
}
