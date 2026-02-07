/**
 * KiwiSDR WebSDR Station Network API client.
 */

export type KiwiStation = {
  name: string;
  url: string;
  latitude: number;
  longitude: number;
  users: number;
  usersMax: number;
  antenna: string | null;
  location: string | null;
  snr: number | null;
  offline: boolean;
};

export async function fetchKiwiStations(): Promise<KiwiStation[]> {
  const res = await fetch("/api/kiwisdr");
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Failed to fetch KiwiSDR stations: ${res.status}`);
  }
  return res.json() as Promise<KiwiStation[]>;
}

/**
 * Get color for KiwiSDR station based on availability.
 */
export function getKiwiColor(station: KiwiStation): string {
  if (station.offline) return "#6b7280"; // Gray - offline
  const usagePercent = station.users / station.usersMax;
  if (usagePercent < 0.5) return "#22c55e"; // Green - available
  if (usagePercent < 0.9) return "#eab308"; // Yellow - busy
  return "#ef4444"; // Red - full
}

/**
 * Get status label for KiwiSDR station.
 */
export function getKiwiStatus(station: KiwiStation): string {
  if (station.offline) return "Offline";
  if (station.users >= station.usersMax) return "Full";
  if (station.users > 0) return `${station.users}/${station.usersMax} users`;
  return "Available";
}

/**
 * Format frequency range for display.
 */
export function formatFrequencyRange(): string {
  return "0-30 MHz"; // KiwiSDRs cover 0-30 MHz
}
