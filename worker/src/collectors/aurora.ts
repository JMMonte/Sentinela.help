/**
 * NOAA Aurora Forecast Collector
 *
 * Fetches aurora probability data from NOAA SWPC OVATION model.
 */

import { BaseCollector } from "./base-collector.js";
import { COLLECTOR_CONFIGS } from "../config.js";
import { fetchWithRetry } from "../utils/fetch.js";

const AURORA_URL = "https://services.swpc.noaa.gov/json/ovation_aurora_latest.json";

export type AuroraData = {
  "Observation Time": string;
  "Forecast Time": string;
  coordinates: [number, number, number][]; // [lon, lat, probability]
};

export class AuroraCollector extends BaseCollector {
  constructor() {
    super({
      name: COLLECTOR_CONFIGS.aurora.name,
      redisKey: COLLECTOR_CONFIGS.aurora.redisKey,
      ttlSeconds: COLLECTOR_CONFIGS.aurora.ttlSeconds,
    });
  }

  protected async collect(): Promise<AuroraData> {
    this.logger.debug("Fetching aurora forecast from NOAA SWPC");

    const response = await fetchWithRetry(
      AURORA_URL,
      {},
      { timeoutMs: 20000, retries: 2 }
    );

    const data = (await response.json()) as AuroraData;

    this.logger.debug("Aurora data fetched", {
      observationTime: data["Observation Time"],
      coordinateCount: data.coordinates?.length ?? 0,
    });

    return data;
  }
}
