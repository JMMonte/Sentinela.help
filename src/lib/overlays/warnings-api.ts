/**
 * IPMA Weather Warnings API integration.
 *
 * Fetches active weather warnings from IPMA's public API and groups
 * them by district (idAreaAviso), presenting the highest severity
 * per district for map display.
 *
 * Endpoint: https://api.ipma.pt/open-data/forecast/warnings/warnings_www.json
 */

const WARNINGS_URL =
  "https://api.ipma.pt/open-data/forecast/warnings/warnings_www.json";

// --- Raw API types ---

export type AwarenessLevel = "green" | "yellow" | "orange" | "red";

type RawWarning = {
  text: string;
  awarenessTypeName: string;
  idAreaAviso: string;
  startTime: string;
  endTime: string;
  awarenessLevelID: AwarenessLevel;
};

// --- Processed types ---

export type WarningEntry = {
  awarenessType: string;
  level: AwarenessLevel;
  text: string;
  startTime: Date;
  endTime: Date;
};

export type DistrictWarnings = {
  districtCode: string;
  districtName: string;
  lat: number;
  lng: number;
  highestLevel: AwarenessLevel;
  warnings: WarningEntry[];
};

// --- District coordinate lookup (21 fixed warning areas) ---

const DISTRICT_INFO: Record<string, { name: string; lat: number; lng: number }> = {
  AVR: { name: "Aveiro", lat: 40.6413, lng: -8.6535 },
  BJA: { name: "Beja", lat: 38.02, lng: -7.87 },
  BRG: { name: "Braga", lat: 41.5475, lng: -8.4227 },
  BGC: { name: "Bragança", lat: 41.8076, lng: -6.7606 },
  CBO: { name: "Castelo Branco", lat: 39.8217, lng: -7.4957 },
  CBR: { name: "Coimbra", lat: 40.2081, lng: -8.4194 },
  EVR: { name: "Évora", lat: 38.5701, lng: -7.9104 },
  FAR: { name: "Faro", lat: 37.0146, lng: -7.9331 },
  GDA: { name: "Guarda", lat: 40.5379, lng: -7.2647 },
  LRA: { name: "Leiria", lat: 39.7473, lng: -8.8069 },
  LSB: { name: "Lisboa", lat: 38.766, lng: -9.1286 },
  PTG: { name: "Portalegre", lat: 39.29, lng: -7.42 },
  PTO: { name: "Porto", lat: 41.158, lng: -8.6294 },
  STM: { name: "Santarém", lat: 39.2, lng: -8.74 },
  STB: { name: "Setúbal", lat: 38.5246, lng: -8.8856 },
  VCT: { name: "Viana do Castelo", lat: 41.6952, lng: -8.8365 },
  VRL: { name: "Vila Real", lat: 41.3053, lng: -7.744 },
  VIS: { name: "Viseu", lat: 40.6585, lng: -7.912 },
  MCS: { name: "Madeira", lat: 32.6485, lng: -16.9084 },
  MPS: { name: "Porto Santo", lat: 33.07, lng: -16.34 },
  AOR: { name: "Açores Oriental", lat: 37.75, lng: -25.67 },
  ACE: { name: "Açores Central", lat: 38.72, lng: -27.22 },
  AOC: { name: "Açores Ocidental", lat: 39.45, lng: -31.13 },
};

const LEVEL_ORDER: Record<AwarenessLevel, number> = {
  green: 0,
  yellow: 1,
  orange: 2,
  red: 3,
};

/**
 * Fetch and process IPMA warnings.
 * Filters out "green" (no warning) and expired entries,
 * then groups remaining by district.
 */
export async function fetchWarnings(): Promise<DistrictWarnings[]> {
  const res = await fetch(WARNINGS_URL);
  if (!res.ok) throw new Error(`Failed to fetch IPMA warnings: ${res.status}`);

  const raw = (await res.json()) as RawWarning[];
  const now = new Date();

  const active = raw.filter((w) => {
    if (w.awarenessLevelID === "green") return false;
    const end = parseIpmaTimestamp(w.endTime);
    return end >= now;
  });

  // Group by idAreaAviso
  const grouped = new Map<string, WarningEntry[]>();
  for (const w of active) {
    const entries = grouped.get(w.idAreaAviso) ?? [];
    entries.push({
      awarenessType: w.awarenessTypeName,
      level: w.awarenessLevelID,
      text: w.text,
      startTime: parseIpmaTimestamp(w.startTime),
      endTime: parseIpmaTimestamp(w.endTime),
    });
    grouped.set(w.idAreaAviso, entries);
  }

  const result: DistrictWarnings[] = [];
  for (const [code, warnings] of grouped) {
    const info = DISTRICT_INFO[code];
    if (!info) continue;

    // Sort: highest severity first, then by startTime
    warnings.sort((a, b) => {
      const levelDiff = LEVEL_ORDER[b.level] - LEVEL_ORDER[a.level];
      if (levelDiff !== 0) return levelDiff;
      return a.startTime.getTime() - b.startTime.getTime();
    });

    result.push({
      districtCode: code,
      districtName: info.name,
      lat: info.lat,
      lng: info.lng,
      highestLevel: warnings[0].level,
      warnings,
    });
  }

  // Sort districts: red first, then orange, then yellow
  result.sort(
    (a, b) => LEVEL_ORDER[b.highestLevel] - LEVEL_ORDER[a.highestLevel],
  );

  return result;
}

/**
 * Parse IPMA timestamp (ISO 8601 without timezone, Portugal local time).
 * Appends "Z" to treat as UTC — acceptable approximation for filtering.
 */
function parseIpmaTimestamp(ts: string): Date {
  return new Date(ts + "Z");
}

// --- Color helpers ---

export function getWarningLevelColor(level: AwarenessLevel): string {
  switch (level) {
    case "red":
      return "#dc2626";
    case "orange":
      return "#ea580c";
    case "yellow":
      return "#eab308";
    case "green":
      return "#22c55e";
  }
}

export function getWarningLevelBg(level: AwarenessLevel): string {
  switch (level) {
    case "red":
      return "#fef2f2";
    case "orange":
      return "#fff7ed";
    case "yellow":
      return "#fefce8";
    case "green":
      return "#f0fdf4";
  }
}

export function getWarningTypeEmoji(awarenessType: string): string {
  const type = awarenessType.toLowerCase();
  if (type.includes("vento")) return "💨";
  if (type.includes("neve")) return "❄️";
  if (type.includes("maritima") || type.includes("agita")) return "🌊";
  if (type.includes("nevoeiro")) return "🌫️";
  if (type.includes("quente")) return "🌡️";
  if (type.includes("frio")) return "🥶";
  if (type.includes("precipita")) return "🌧️";
  if (type.includes("trovoada")) return "⛈️";
  return "⚠️";
}
