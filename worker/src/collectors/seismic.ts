/**
 * USGS Earthquake Data Collector
 *
 * Fetches earthquake data from USGS GeoJSON feeds.
 */

import { MultiKeyCollector } from "./base-collector.js";
import { COLLECTOR_CONFIGS } from "../config.js";
import { fetchWithRetry } from "../utils/fetch.js";

const USGS_FEEDS: Record<string, string> = {
  day: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson",
  week: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.geojson",
  month: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_month.geojson",
};

export class SeismicCollector extends MultiKeyCollector {
  constructor() {
    super({
      name: COLLECTOR_CONFIGS.seismic.name,
      redisKey: "kaos:seismic:day", // Primary key (we'll store multiple)
      ttlSeconds: COLLECTOR_CONFIGS.seismic.ttlSeconds,
    });
  }

  // Override run() since we handle our own multi-key storage
  async run(): Promise<void> {
    try {
      await this.collect();
    } catch (error) {
      this.logger.error("Collection failed", error);
      throw error;
    }
  }

  protected async collect(): Promise<void> {
    this.logger.debug("Fetching earthquake data from USGS");

    // Fetch all feeds in parallel
    const results = await Promise.allSettled(
      Object.entries(USGS_FEEDS).map(async ([feedKey, url]) => {
        const response = await fetchWithRetry(url, {}, {
          timeoutMs: 15000,
          retries: 2,
        });
        const data = await response.json() as { features?: unknown[] };
        return { feedKey, data };
      })
    );

    // Store successful results
    for (const result of results) {
      if (result.status === "fulfilled") {
        const { feedKey, data } = result.value;
        await this.storeToKey(
          `kaos:seismic:${feedKey}`,
          data,
          this.config.ttlSeconds
        );
        this.logger.debug(`Stored seismic:${feedKey}`, {
          features: data.features?.length ?? 0,
        });
      } else {
        this.logger.warn(`Failed to fetch seismic feed`, {
          error: result.reason?.message,
        });
      }
    }

    // Verify at least one feed succeeded
    const successCount = results.filter((r) => r.status === "fulfilled").length;
    if (successCount === 0) {
      throw new Error("All USGS feeds failed");
    }

    this.logger.info(`Fetched ${successCount}/${Object.keys(USGS_FEEDS).length} seismic feeds`);
  }
}
