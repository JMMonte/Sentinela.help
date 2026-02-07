/**
 * Sea Surface Temperature (SST) Collector
 *
 * Fetches SST data from NOAA OISST via Coastwatch ERDDAP.
 * 0.25° global resolution, updated daily.
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

type SstGridData = {
  header: {
    nx: number;
    ny: number;
    lo1: number;
    la1: number;
    dx: number;
    dy: number;
  };
  data: number[];
  unit: string;
  name: string;
};

// NOAA OISST v2.1 - 0.25° resolution, global, daily updates
const ERDDAP_URL =
  "https://coastwatch.pfeg.noaa.gov/erddap/griddap/ncdcOisst21Agg.json?sst[(last)][(0)][(-89.875):(89.875)][(0.125):(359.875)]";

export class SstCollector extends BaseCollector {
  constructor() {
    super({
      name: COLLECTOR_CONFIGS.sst.name,
      redisKey: COLLECTOR_CONFIGS.sst.redisKey,
      ttlSeconds: COLLECTOR_CONFIGS.sst.ttlSeconds,
    });
  }

  protected async collect(): Promise<SstGridData> {
    this.logger.debug("Fetching SST from Coastwatch ERDDAP");

    const response = await fetchWithRetry(
      ERDDAP_URL,
      { headers: { Accept: "application/json" } },
      { timeoutMs: 120000, retries: 2 }
    );

    const json = (await response.json()) as ErddapResponse;
    const { columnNames, rows } = json.table;

    const latIdx = columnNames.indexOf("latitude");
    const lonIdx = columnNames.indexOf("longitude");
    const sstIdx = columnNames.indexOf("sst");

    if (latIdx === -1 || lonIdx === -1 || sstIdx === -1) {
      throw new Error("Missing expected columns in ERDDAP response");
    }

    // Collect unique lats and lons
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

    const sortedLats = Array.from(lats).sort((a, b) => b - a); // Descending (north to south)
    const sortedLons = Array.from(lons).sort((a, b) => a - b); // Ascending (west to east)

    const ny = sortedLats.length;
    const nx = sortedLons.length;

    if (ny === 0 || nx === 0) {
      throw new Error("No valid data points in ERDDAP response");
    }

    const dy = ny > 1 ? Math.abs(sortedLats[0] - sortedLats[1]) : 0.25;
    const dx = nx > 1 ? Math.abs(sortedLons[1] - sortedLons[0]) : 0.25;

    // Create lookup maps
    const latToIdx = new Map<number, number>();
    const lonToIdx = new Map<number, number>();

    sortedLats.forEach((lat, idx) => latToIdx.set(lat, idx));
    sortedLons.forEach((lon, idx) => lonToIdx.set(lon, idx));

    // Initialize data array with NaN
    const data = new Array<number>(ny * nx).fill(NaN);

    // Fill in SST values
    for (const row of rows) {
      const lat = row[latIdx] as number;
      const lon = row[lonIdx] as number;
      const sst = row[sstIdx] as number | null;

      const y = latToIdx.get(lat);
      const x = lonToIdx.get(lon);

      if (y !== undefined && x !== undefined && sst !== null) {
        data[y * nx + x] = sst;
      }
    }

    this.logger.debug(`Parsed SST grid: ${nx}x${ny}, ${rows.length} data points`);

    return {
      header: {
        nx,
        ny,
        lo1: sortedLons[0],
        la1: sortedLats[0],
        dx,
        dy,
      },
      data,
      unit: "°C",
      name: "Sea Surface Temperature",
    };
  }
}
