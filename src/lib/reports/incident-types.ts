import {
  Droplets,
  Flame,
  Bomb,
  Activity,
  Mountain,
  CloudLightning,
  Construction,
  CircleAlert,
  type LucideIcon,
} from "lucide-react";

export const incidentTypes = [
  "FLOOD",
  "FIRE",
  "EXPLOSION",
  "EARTHQUAKE",
  "LANDSLIDE",
  "STORM",
  "ROAD_CLOSURE",
  "OTHER",
] as const;

export type IncidentType = (typeof incidentTypes)[number];

export const incidentTypeLabel: Record<IncidentType, string> = {
  FLOOD: "Flood",
  FIRE: "Fire",
  EXPLOSION: "Explosion",
  EARTHQUAKE: "Earthquake",
  LANDSLIDE: "Landslide",
  STORM: "Storm",
  ROAD_CLOSURE: "Road closure",
  OTHER: "Other",
};

export const incidentTypeIcon: Record<IncidentType, LucideIcon> = {
  FLOOD: Droplets,
  FIRE: Flame,
  EXPLOSION: Bomb,
  EARTHQUAKE: Activity,
  LANDSLIDE: Mountain,
  STORM: CloudLightning,
  ROAD_CLOSURE: Construction,
  OTHER: CircleAlert,
};

export const incidentTypeMarkerColor: Record<IncidentType, string> = {
  FLOOD: "#2563eb",
  FIRE: "#dc2626",
  EXPLOSION: "#f97316",
  EARTHQUAKE: "#a16207",
  LANDSLIDE: "#16a34a",
  STORM: "#0ea5e9",
  ROAD_CLOSURE: "#475569",
  OTHER: "#64748b",
};

