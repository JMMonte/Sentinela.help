/**
 * Waves Collector
 *
 * Fetches ocean wave data from PacIOOS WAVEWATCH III ERDDAP.
 * Returns significant wave height at 0.5° resolution.
 */

import { BaseCollector } from "./base-collector.js";
import { COLLECTOR_CONFIGS } from "../config.js";
import { fetchWithRetry } from "../utils/fetch.js";

type ErddapResponse = {
  table: {
    columnNames: string[];
    columnTypes: string[];
    columnUnits: string[];
    rows: (number | string | null)[][];
  };
};

type WaveGridData = {
  header: {
    nx: number;
    ny: number;
    lo1: number;
    la1: number;
    dx: number;
    dy: number;
  };
  heightData: number[];
  periodData: number[];
  directionData: number[];
  time: string;
  unit: string;
  name: string;
};

// PacIOOS WAVEWATCH III ERDDAP endpoint
// Global coverage at 0.5 degree resolution
const ERDDAP_BASE = "https://pae-paha.pacioos.hawaii.edu/erddap/griddap/ww3_global.json";
// Query for latest data: wave height only
const ERDDAP_QUERY = "?Thgt[(last)][(0)][(-77.5):(77.5)][(0):(359.5)]";

export class WavesCollector extends BaseCollector {
  constructor() {
    super({
      name: COLLECTOR_CONFIGS.waves.name,
      redisKey: COLLECTOR_CONFIGS.waves.redisKey,
      ttlSeconds: COLLECTOR_CONFIGS.waves.ttlSeconds,
    });
  }

  protected async collect(): Promise<WaveGridData> {
    const url = `${ERDDAP_BASE}${ERDDAP_QUERY}`;
    this.logger.debug("Fetching waves from PacIOOS ERDDAP");

    const response = await fetchWithRetry(
      url,
      { headers: { Accept: "application/json" } },
      { timeoutMs: 120000, retries: 2 }
    );

    const data = (await response.json()) as ErddapResponse;
    const { columnNames, rows } = data.table;

    // Find column indices
    const timeIdx = columnNames.indexOf("time");
    const latIdx = columnNames.indexOf("latitude");
    const lonIdx = columnNames.indexOf("longitude");
    const heightIdx = columnNames.indexOf("Thgt");

    if (timeIdx === -1 || latIdx === -1 || lonIdx === -1 || heightIdx === -1) {
      this.logger.error("Column names received:", { columnNames });
      throw new Error("Invalid ERDDAP response format");
    }

    // Extract unique latitudes and longitudes
    const lats = new Set<number>();
    const lons = new Set<number>();

    for (const row of rows) {
      const lat = row[latIdx] as number;
      const lon = row[lonIdx] as number;
      if (lat != null && lon != null) {
        lats.add(lat);
        lons.add(lon);
      }
    }

    const sortedLats = Array.from(lats).sort((a, b) => b - a); // North to South
    const sortedLons = Array.from(lons).sort((a, b) => a - b); // West to East

    const ny = sortedLats.length;
    const nx = sortedLons.length;

    if (ny === 0 || nx === 0) {
      throw new Error("No valid data points in ERDDAP response");
    }

    const dy = ny > 1 ? Math.abs(sortedLats[0] - sortedLats[1]) : 0.5;
    const dx = nx > 1 ? Math.abs(sortedLons[1] - sortedLons[0]) : 0.5;

    // Create index maps
    const latIndexMap = new Map<number, number>();
    const lonIndexMap = new Map<number, number>();
    sortedLats.forEach((lat, idx) => latIndexMap.set(lat, idx));
    sortedLons.forEach((lon, idx) => lonIndexMap.set(lon, idx));

    // Initialize data arrays
    const heightData = new Array<number>(ny * nx).fill(NaN);
    const periodData = new Array<number>(ny * nx).fill(NaN);
    const directionData = new Array<number>(ny * nx).fill(NaN);

    let timeStr = "";

    // Fill the grid
    for (const row of rows) {
      const lat = row[latIdx] as number;
      const lon = row[lonIdx] as number;
      const height = row[heightIdx] as number | null;

      if (lat == null || lon == null) continue;

      const yi = latIndexMap.get(lat);
      const xi = lonIndexMap.get(lon);

      if (yi === undefined || xi === undefined) continue;

      const idx = yi * nx + xi;

      if (height != null && !isNaN(height)) {
        heightData[idx] = height;
      }

      if (!timeStr && row[timeIdx]) {
        timeStr = String(row[timeIdx]);
      }
    }

    this.logger.debug(`Parsed wave grid: ${nx}x${ny}, ${rows.length} data points`);

    return {
      header: {
        nx,
        ny,
        lo1: sortedLons[0],
        la1: sortedLats[0],
        dx,
        dy,
      },
      heightData,
      periodData,
      directionData,
      time: timeStr,
      unit: "m",
      name: "Significant Wave Height",
    };
  }
}
