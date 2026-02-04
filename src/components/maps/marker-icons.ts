import L from "leaflet";

/** Yellow pin for reports without images */
export function createYellowPinIcon(): L.DivIcon {
  return L.divIcon({
    className: "sentinela-marker-yellow",
    html: `<div class="sentinela-pin sentinela-pin--yellow"></div>`,
    iconSize: L.point(20, 20),
    iconAnchor: L.point(10, 10),
  });
}

/** Circular image thumbnail marker */
export function createImageMarkerIcon(imageUrl: string): L.DivIcon {
  return L.divIcon({
    className: "sentinela-marker-image",
    html: `<div class="sentinela-pin sentinela-pin--image" style="background-image: url('${imageUrl}')"></div>`,
    iconSize: L.point(36, 36),
    iconAnchor: L.point(18, 18),
  });
}

/** Green pin with checkmark for solved reports without images */
export function createSolvedPinIcon(): L.DivIcon {
  return L.divIcon({
    className: "sentinela-marker-solved",
    html: `<div class="sentinela-pin sentinela-pin--solved"></div>`,
    iconSize: L.point(24, 24),
    iconAnchor: L.point(12, 12),
  });
}

/** Circular image thumbnail marker with solved indicator */
export function createSolvedImageMarkerIcon(imageUrl: string): L.DivIcon {
  return L.divIcon({
    className: "sentinela-marker-image-solved",
    html: `<div class="sentinela-pin sentinela-pin--image-solved" style="background-image: url('${imageUrl}')"></div>`,
    iconSize: L.point(36, 36),
    iconAnchor: L.point(18, 18),
  });
}

/** Red pin with exclamation for escalated reports without images */
export function createEscalatedPinIcon(): L.DivIcon {
  return L.divIcon({
    className: "sentinela-marker-escalated",
    html: `<div class="sentinela-pin sentinela-pin--escalated"></div>`,
    iconSize: L.point(24, 24),
    iconAnchor: L.point(12, 12),
  });
}

/** Circular image thumbnail marker with escalated indicator */
export function createEscalatedImageMarkerIcon(imageUrl: string): L.DivIcon {
  return L.divIcon({
    className: "sentinela-marker-image-escalated",
    html: `<div class="sentinela-pin sentinela-pin--image-escalated" style="background-image: url('${imageUrl}')"></div>`,
    iconSize: L.point(36, 36),
    iconAnchor: L.point(18, 18),
  });
}

/** Cluster icon - theme-aware (black in light mode, white in dark mode) */
export function createClusterIcon(cluster: L.MarkerCluster): L.DivIcon {
  const count = cluster.getChildCount();
  const size = count < 10 ? 32 : count < 50 ? 40 : 48;
  const sizeClass =
    count < 10 ? "sentinela-cluster--sm" : count < 50 ? "sentinela-cluster--md" : "sentinela-cluster--lg";

  return L.divIcon({
    className: `sentinela-cluster ${sizeClass}`,
    html: `<div class="sentinela-cluster__inner"><span>${count}</span></div>`,
    iconSize: L.point(size, size),
    iconAnchor: L.point(size / 2, size / 2),
  });
}

// Singleton for yellow pin (reused for all reports without images)
export const YELLOW_PIN_ICON = createYellowPinIcon();

// Singleton for solved pin (reused for all solved reports without images)
export const SOLVED_PIN_ICON = createSolvedPinIcon();

// Singleton for escalated pin (reused for all escalated reports without images)
export const ESCALATED_PIN_ICON = createEscalatedPinIcon();
