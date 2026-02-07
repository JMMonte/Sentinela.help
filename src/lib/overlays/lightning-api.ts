/**
 * Blitzortung Lightning Detection Network API client.
 */

export type LightningStrike = {
  latitude: number;
  longitude: number;
  time: number; // unix timestamp in milliseconds
};

export async function fetchLightning(): Promise<LightningStrike[]> {
  const res = await fetch("/api/lightning");
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Failed to fetch lightning: ${res.status}`);
  }
  return res.json() as Promise<LightningStrike[]>;
}

/**
 * Get color for lightning strike based on age.
 * Newer strikes are brighter.
 */
export function getLightningColor(ageMs: number): string {
  if (ageMs < 60000) return "#ffffff"; // White - very recent (< 1 min)
  if (ageMs < 300000) return "#ffff00"; // Yellow - recent (< 5 min)
  if (ageMs < 900000) return "#ffa500"; // Orange - moderate (< 15 min)
  return "#ff6600"; // Dark orange - older (< 30 min)
}

/**
 * Get opacity for lightning strike based on age.
 * Newer strikes are more opaque.
 */
export function getLightningOpacity(ageMs: number): number {
  if (ageMs < 60000) return 1.0;
  if (ageMs < 300000) return 0.8;
  if (ageMs < 900000) return 0.6;
  return 0.4;
}

/**
 * Get radius for lightning strike based on age.
 * Newer strikes are larger (pulsing effect).
 */
export function getLightningRadius(ageMs: number): number {
  if (ageMs < 60000) return 6;
  if (ageMs < 300000) return 5;
  if (ageMs < 900000) return 4;
  return 3;
}

/**
 * Format lightning time for display.
 */
export function formatLightningTime(time: number): string {
  const ageMs = Date.now() - time;
  if (ageMs < 60000) return "Just now";
  if (ageMs < 120000) return "1 min ago";
  const mins = Math.floor(ageMs / 60000);
  return `${mins} min ago`;
}
