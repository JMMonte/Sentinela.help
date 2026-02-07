import { track } from "@vercel/analytics";

// Event names as constants for type safety and consistency
export const AnalyticsEvents = {
  // Map overlay events
  OVERLAY_ENABLED: "overlay_enabled",
  OVERLAY_DISABLED: "overlay_disabled",

  // User preference events
  THEME_CHANGED: "theme_changed",
  LANGUAGE_CHANGED: "language_changed",

  // Navigation events
  ABOUT_PAGE_VIEWED: "about_page_viewed",
  DATA_SOURCE_VIEWED: "data_source_viewed",

  // Map interaction events
  MAP_ZOOMED: "map_zoomed",
  LOCATION_REQUESTED: "location_requested",
} as const;

type OverlayName =
  | "weather"
  | "temperature"
  | "humidity"
  | "precipitation"
  | "cloudCover"
  | "cape"
  | "fireWeather"
  | "wind"
  | "oceanCurrents"
  | "waves"
  | "sst"
  | "airQuality"
  | "uvIndex"
  | "aurora"
  | "seismic"
  | "prociv"
  | "gdacs"
  | "warnings"
  | "fires"
  | "rainfall"
  | "aircraft"
  | "lightning"
  | "kiwisdr"
  | "aprs"
  | "ionosphere"
  | "terminator";

type ThemeValue = "light" | "dark" | "system";
type Locale = "en" | "pt-PT" | "es";

// Typed event tracking functions
export function trackOverlayEnabled(overlay: OverlayName, category?: string) {
  track(AnalyticsEvents.OVERLAY_ENABLED, { overlay, category });
}

export function trackOverlayDisabled(overlay: OverlayName, category?: string) {
  track(AnalyticsEvents.OVERLAY_DISABLED, { overlay, category });
}

export function trackThemeChanged(theme: ThemeValue) {
  track(AnalyticsEvents.THEME_CHANGED, { theme });
}

export function trackLanguageChanged(locale: Locale, previousLocale: Locale) {
  track(AnalyticsEvents.LANGUAGE_CHANGED, { locale, previousLocale });
}

export function trackDataSourceViewed(source: string) {
  track(AnalyticsEvents.DATA_SOURCE_VIEWED, { source });
}

export function trackLocationRequested(granted: boolean) {
  track(AnalyticsEvents.LOCATION_REQUESTED, { granted });
}

// Generic track function for custom events
export { track };
