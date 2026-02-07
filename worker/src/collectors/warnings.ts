/**
 * IPMA Weather Warnings Collector
 *
 * Fetches weather warnings from Portuguese weather service (IPMA).
 */

import { BaseCollector } from "./base-collector.js";
import { COLLECTOR_CONFIGS } from "../config.js";
import { fetchWithRetry } from "../utils/fetch.js";

const WARNINGS_URL = "https://api.ipma.pt/open-data/forecast/warnings/warnings_www.json";

export class WarningsCollector extends BaseCollector {
  constructor() {
    super({
      name: COLLECTOR_CONFIGS.warnings.name,
      redisKey: COLLECTOR_CONFIGS.warnings.redisKey,
      ttlSeconds: COLLECTOR_CONFIGS.warnings.ttlSeconds,
    });
  }

  protected async collect(): Promise<unknown> {
    this.logger.debug("Fetching IPMA weather warnings");

    const response = await fetchWithRetry(
      WARNINGS_URL,
      {},
      { timeoutMs: 15000, retries: 2 }
    );

    const data = await response.json();

    this.logger.debug("IPMA warnings fetched");

    return data;
  }
}
