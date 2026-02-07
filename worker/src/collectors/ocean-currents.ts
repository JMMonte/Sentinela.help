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

    const srcNLat = latArray.length;
    const srcNLon = lonArray.length;

    if (srcNLat < 2 || srcNLon < 2) {
      throw new Error("Insufficient grid points in ERDDAP data");
    }

    const srcLatStep = Math.abs(latArray[0] - latArray[1]);
    const srcLonStep = Math.abs(lonArray[1] - lonArray[0]);

    // Create lookup for grid position
    const latToIdx = new Map(latArray.map((lat, idx) => [lat, idx]));
    const lonToIdx = new Map(lonArray.map((lon, idx) => [lon, idx]));

    // Initialize source data arrays
    const srcUData = new Array<number | null>(srcNLat * srcNLon).fill(null);
    const srcVData = new Array<number | null>(srcNLat * srcNLon).fill(null);

    // Fill source data arrays
    for (const row of rows) {
      const lat = row[latIdx] as number;
      const lon = row[lonIdx] as number;
      const u = row[ugosIdx];
      const v = row[vgosIdx];

      const latI = latToIdx.get(lat);
      const lonI = lonToIdx.get(lon);

      if (latI !== undefined && lonI !== undefined) {
        const idx = latI * srcNLon + lonI;
        srcUData[idx] = u !== null && !isNaN(Number(u)) ? Number(u) : 0;
        srcVData[idx] = v !== null && !isNaN(Number(v)) ? Number(v) : 0;
      }
    }

    // Downsample to 0.5° to reduce data size (skip every other point)
    const downsampleFactor = 2;
    const dstNLat = Math.ceil(srcNLat / downsampleFactor);
    const dstNLon = Math.ceil(srcNLon / downsampleFactor);
    const dstLatStep = srcLatStep * downsampleFactor;
    const dstLonStep = srcLonStep * downsampleFactor;

    const uData = new Array<number | null>(dstNLat * dstNLon);
    const vData = new Array<number | null>(dstNLat * dstNLon);

    for (let dstLatI = 0; dstLatI < dstNLat; dstLatI++) {
      const srcLatI = dstLatI * downsampleFactor;
      for (let dstLonI = 0; dstLonI < dstNLon; dstLonI++) {
        const srcLonI = dstLonI * downsampleFactor;
        const srcIdx = srcLatI * srcNLon + srcLonI;
        const dstIdx = dstLatI * dstNLon + dstLonI;

        const uVal = srcUData[srcIdx];
        const vVal = srcVData[srcIdx];

        // Round to 3 decimal places to reduce JSON size
        uData[dstIdx] = uVal !== null ? Math.round(uVal * 1000) / 1000 : 0;
        vData[dstIdx] = vVal !== null ? Math.round(vVal * 1000) / 1000 : 0;
      }
    }

    this.logger.debug(
      `Downsampled from ${srcNLon}x${srcNLat} to ${dstNLon}x${dstNLat}`
    );

    return [
      {
        header: {
          parameterCategory: 2,
          parameterNumber: 2,
          parameterNumberName: "Eastward_sea_water_velocity",
          parameterUnit: "m.s-1",
          nx: dstNLon,
          ny: dstNLat,
          lo1: Math.min(...lonArray),
          la1: Math.max(...latArray),
          dx: dstLonStep,
          dy: dstLatStep,
        },
        data: uData,
      },
      {
        header: {
          parameterCategory: 2,
          parameterNumber: 3,
          parameterNumberName: "Northward_sea_water_velocity",
          parameterUnit: "m.s-1",
          nx: dstNLon,
          ny: dstNLat,
          lo1: Math.min(...lonArray),
          la1: Math.max(...latArray),
          dx: dstLonStep,
          dy: dstLatStep,
        },
        data: vData,
      },
    ];
  }
}
