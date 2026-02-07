/**
 * Ocean Currents Collector
 *
 * Fetches ocean current data from NOAA CoastWatch ERDDAP.
 * Uses geostrophic velocities from satellite altimetry.
 */

import { BaseCollector } from "./base-collector.js";
import { COLLECTOR_CONFIGS } from "../config.js";
import { fetchWithRetry } from "../utils/fetch.js";

type ErddapResponse = {
  table: {
    columnNames: string[];
    columnTypes: string[];
    columnUnits: string[];
    rows: (string | number | null)[][];
  };
};

type VelocityHeader = {
  parameterCategory: number;
  parameterNumber: number;
  parameterNumberName: string;
  parameterUnit: string;
  nx: number;
  ny: number;
  lo1: number;
  la1: number;
  dx: number;
  dy: number;
};

type VelocityData = {
  header: VelocityHeader;
  data: (number | null)[];
}[];

// ERDDAP endpoint for ocean currents
// ugos = eastward geostrophic velocity (m/s)
// vgos = northward geostrophic velocity (m/s)
const ERDDAP_URL =
  "https://upwell.pfeg.noaa.gov/erddap/griddap/nesdisSSH1day.json?ugos[(last)][(-90):(90)][(-180):(180)],vgos[(last)][(-90):(90)][(-180):(180)]";

export class OceanCurrentsCollector extends BaseCollector {
  constructor() {
    super({
      name: COLLECTOR_CONFIGS.oceanCurrents.name,
      redisKey: COLLECTOR_CONFIGS.oceanCurrents.redisKey,
      ttlSeconds: COLLECTOR_CONFIGS.oceanCurrents.ttlSeconds,
    });
  }

  protected async collect(): Promise<VelocityData> {
    this.logger.debug("Fetching ocean currents from NOAA ERDDAP");

    const response = await fetchWithRetry(
      ERDDAP_URL,
      { headers: { Accept: "application/json" } },
      { timeoutMs: 120000, retries: 2 }
    );

    const data = (await response.json()) as ErddapResponse;

    if (!data.table || !data.table.rows || data.table.rows.length === 0) {
      throw new Error("Empty ERDDAP response");
    }

    this.logger.debug(`Parsed ${data.table.rows.length} data points`);
    return this.parseErddapResponse(data);
  }

  private parseErddapResponse(data: ErddapResponse): VelocityData {
    const { columnNames, rows } = data.table;

    const latIdx = columnNames.indexOf("latitude");
    const lonIdx = columnNames.indexOf("longitude");
    const ugosIdx = columnNames.indexOf("ugos");
    const vgosIdx = columnNames.indexOf("vgos");

    if (latIdx === -1 || lonIdx === -1 || ugosIdx === -1 || vgosIdx === -1) {
      throw new Error("Missing expected columns in ERDDAP response");
    }

    // Extract unique lat/lon to determine grid structure
    const lats = new Set<number>();
    const lons = new Set<number>();

    for (const row of rows) {
      lats.add(row[latIdx] as number);
      lons.add(row[lonIdx] as number);
    }

    const latArray = Array.from(lats).sort((a, b) => b - a); // North to South
    const lonArray = Array.from(lons).sort((a, b) => a - b); // West to East

    const nLat = latArray.length;
    const nLon = lonArray.length;

    if (nLat < 2 || nLon < 2) {
      throw new Error("Insufficient grid points in ERDDAP data");
    }

    const latStep = Math.abs(latArray[0] - latArray[1]);
    const lonStep = Math.abs(lonArray[1] - lonArray[0]);

    // Create lookup for grid position
    const latToIdx = new Map(latArray.map((lat, idx) => [lat, idx]));
    const lonToIdx = new Map(lonArray.map((lon, idx) => [lon, idx]));

    // Initialize data arrays
    const uData = new Array<number | null>(nLat * nLon).fill(null);
    const vData = new Array<number | null>(nLat * nLon).fill(null);

    // Fill data arrays
    for (const row of rows) {
      const lat = row[latIdx] as number;
      const lon = row[lonIdx] as number;
      const u = row[ugosIdx];
      const v = row[vgosIdx];

      const latI = latToIdx.get(lat);
      const lonI = lonToIdx.get(lon);

      if (latI !== undefined && lonI !== undefined) {
        const idx = latI * nLon + lonI;
        uData[idx] = u !== null && !isNaN(Number(u)) ? Number(u) : 0;
        vData[idx] = v !== null && !isNaN(Number(v)) ? Number(v) : 0;
      }
    }

    return [
      {
        header: {
          parameterCategory: 2,
          parameterNumber: 2,
          parameterNumberName: "Eastward_sea_water_velocity",
          parameterUnit: "m.s-1",
          nx: nLon,
          ny: nLat,
          lo1: Math.min(...lonArray),
          la1: Math.max(...latArray),
          dx: lonStep,
          dy: latStep,
        },
        data: uData,
      },
      {
        header: {
          parameterCategory: 2,
          parameterNumber: 3,
          parameterNumberName: "Northward_sea_water_velocity",
          parameterUnit: "m.s-1",
          nx: nLon,
          ny: nLat,
          lo1: Math.min(...lonArray),
          la1: Math.max(...latArray),
          dx: lonStep,
          dy: latStep,
        },
        data: vData,
      },
    ];
  }
}
