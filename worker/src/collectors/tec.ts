/**
 * NOAA Total Electron Content (TEC) Collector
 *
 * TEC data indicates ionospheric electron density,
 * which affects GPS accuracy and radio propagation.
 *
 * Uses the new GloTEC (Global TEC) product from NOAA SWPC
 * which provides global coverage via GeoJSON format.
 */

import { BaseCollector } from "./base-collector.js";
import { COLLECTOR_CONFIGS } from "../config.js";
import { fetchWithRetry } from "../utils/fetch.js";

// GloTEC endpoints (replaced old US-TEC which was discontinued)
const GLOTEC_LIST_URL = "https://services.swpc.noaa.gov/products/glotec/geojson_2d_urt.json";
const GLOTEC_BASE_URL = "https://services.swpc.noaa.gov";

type GloTecListEntry = {
  url: string;
  time_tag: string;
};

type GloTecFeature = {
  type: "Feature";
  geometry: {
    type: "Point";
    coordinates: [number, number]; // [lon, lat]
  };
  properties: {
    tec: number;
    anomaly: number;
    hmF2: number;
    NmF2: number;
    quality_flag: number;
  };
};

type GloTecGeoJSON = {
  type: "FeatureCollection";
  features: GloTecFeature[];
};

export type TecData = {
  grid: number[][];
  latMin: number;
  latMax: number;
  lonMin: number;
  lonMax: number;
  latStep: number;
  lonStep: number;
  timestamp: string;
  unit: string;
};

export class TecCollector extends BaseCollector {
  constructor() {
    super({
      name: COLLECTOR_CONFIGS.tec.name,
      redisKey: COLLECTOR_CONFIGS.tec.redisKey,
      ttlSeconds: COLLECTOR_CONFIGS.tec.ttlSeconds,
    });
  }

  protected async collect(): Promise<TecData> {
    this.logger.debug("Fetching TEC data from NOAA SWPC GloTEC");

    try {
      // Step 1: Get the list of available GloTEC files
      const listResponse = await fetchWithRetry(
        GLOTEC_LIST_URL,
        {},
        { timeoutMs: 30000, retries: 2 }
      );

      const list = (await listResponse.json()) as GloTecListEntry[];

      if (!list || list.length === 0) {
        this.logger.warn("No GloTEC files available");
        return this.createDefaultTecData();
      }

      // Get the most recent file (last in the list)
      const latest = list[list.length - 1];
      const dataUrl = `${GLOTEC_BASE_URL}${latest.url}`;

      this.logger.debug("Fetching latest GloTEC data", {
        timeTag: latest.time_tag,
      });

      // Step 2: Fetch the GeoJSON data
      const dataResponse = await fetchWithRetry(
        dataUrl,
        {},
        { timeoutMs: 30000, retries: 2 }
      );

      const geojson = (await dataResponse.json()) as GloTecGeoJSON;

      return this.parseGloTecGeoJSON(geojson, latest.time_tag);
    } catch (error) {
      this.logger.warn("Failed to fetch TEC data", {
        error: error instanceof Error ? error.message : String(error),
      });
      return this.createDefaultTecData();
    }
  }

  private parseGloTecGeoJSON(geojson: GloTecGeoJSON, timestamp: string): TecData {
    if (!geojson.features || geojson.features.length === 0) {
      return this.createDefaultTecData();
    }

    // Collect unique latitudes and longitudes
    const latSet = new Set<number>();
    const lonSet = new Set<number>();
    const tecMap = new Map<string, number>();

    for (const feature of geojson.features) {
      const [lon, lat] = feature.geometry.coordinates;
      const tec = feature.properties.tec;

      if (!isNaN(lat) && !isNaN(lon) && !isNaN(tec)) {
        latSet.add(lat);
        lonSet.add(lon);
        tecMap.set(`${lat},${lon}`, tec);
      }
    }

    const latitudes = Array.from(latSet).sort((a, b) => b - a); // descending (north to south)
    const longitudes = Array.from(lonSet).sort((a, b) => a - b); // ascending (west to east)

    if (latitudes.length === 0 || longitudes.length === 0) {
      return this.createDefaultTecData();
    }

    // Build grid (rows = latitudes, cols = longitudes)
    const grid: number[][] = [];
    for (const lat of latitudes) {
      const row: number[] = [];
      for (const lon of longitudes) {
        const key = `${lat},${lon}`;
        row.push(tecMap.get(key) ?? 0);
      }
      grid.push(row);
    }

    // Calculate step sizes
    const latStep = latitudes.length > 1 ? Math.abs(latitudes[0] - latitudes[1]) : 2.5;
    const lonStep = longitudes.length > 1 ? Math.abs(longitudes[1] - longitudes[0]) : 5;

    this.logger.debug("Parsed GloTEC data", {
      points: geojson.features.length,
      gridSize: `${latitudes.length}x${longitudes.length}`,
    });

    return {
      grid,
      latMin: Math.min(...latitudes),
      latMax: Math.max(...latitudes),
      lonMin: Math.min(...longitudes),
      lonMax: Math.max(...longitudes),
      latStep,
      lonStep,
      timestamp,
      unit: "TECU",
    };
  }

  private createDefaultTecData(): TecData {
    return {
      grid: [],
      latMin: -90,
      latMax: 90,
      lonMin: -180,
      lonMax: 180,
      latStep: 5,
      lonStep: 5,
      timestamp: new Date().toISOString(),
      unit: "TECU",
    };
  }
}
