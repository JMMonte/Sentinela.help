/**
 * Generic Data Source Collector
 *
 * Reads JSON config files from /sources and creates collectors dynamically.
 * No code changes needed - just add a JSON file!
 */

import { BaseCollector } from "./base-collector.js";
import { readdirSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface SourceConfig {
  name: string;
  description?: string;
  enabled?: boolean;
  fetch: {
    url: string;
    method?: string;
    headers?: Record<string, string>;
    timeout?: number;
  };
  schedule: {
    intervalMs: number;
    ttlSeconds: number;
  };
  redis: {
    key: string;
  };
  transform?: {
    dataPath?: string;
    fields?: Record<string, string>;
    filter?: Record<string, unknown>;
  };
  auth?: {
    type: "bearer" | "basic" | "apikey";
    envVar: string;
    header?: string;
  };
}

export class GenericSourceCollector extends BaseCollector {
  private sourceConfig: SourceConfig;

  constructor(sourceConfig: SourceConfig) {
    super({
      name: sourceConfig.name,
      redisKey: sourceConfig.redis.key,
      ttlSeconds: sourceConfig.schedule.ttlSeconds,
    });
    this.sourceConfig = sourceConfig;
  }

  get intervalMs(): number {
    return this.sourceConfig.schedule.intervalMs;
  }

  protected async collect(): Promise<unknown[]> {
    const { fetch: fetchConfig, transform, auth } = this.sourceConfig;

    // Build headers
    const headers: Record<string, string> = {
      Accept: "application/json",
      ...fetchConfig.headers,
    };

    // Add auth if configured
    if (auth) {
      const token = process.env[auth.envVar];
      if (!token) {
        this.logger.warn(`Missing env var: ${auth.envVar}`);
      } else {
        switch (auth.type) {
          case "bearer":
            headers["Authorization"] = `Bearer ${token}`;
            break;
          case "apikey":
            headers[auth.header || "X-API-Key"] = token;
            break;
          case "basic":
            headers["Authorization"] = `Basic ${Buffer.from(token).toString("base64")}`;
            break;
        }
      }
    }

    // Fetch data
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      fetchConfig.timeout || 30000
    );

    const response = await fetch(fetchConfig.url, {
      method: fetchConfig.method || "GET",
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    let rawData: unknown = await response.json();

    // Extract data from path (e.g., "results" or "data.items")
    if (transform?.dataPath) {
      const parts = transform.dataPath.split(".");
      for (const part of parts) {
        rawData = (rawData as Record<string, unknown>)?.[part];
      }
    }

    let items: Record<string, unknown>[] = Array.isArray(rawData)
      ? (rawData as Record<string, unknown>[])
      : [rawData as Record<string, unknown>];

    // Apply field mapping
    if (transform?.fields) {
      items = items.map((item) => {
        const mapped: Record<string, unknown> = {};
        for (const [outField, inField] of Object.entries(transform.fields!)) {
          mapped[outField] = this.getNestedValue(item, inField);
        }
        return mapped;
      });
    }

    // Apply filter
    if (transform?.filter) {
      items = items.filter((item) => {
        for (const [key, value] of Object.entries(transform.filter!)) {
          if (item[key] !== value) return false;
        }
        return true;
      });
    }

    this.logger.info(`Collected ${items.length} items from ${this.sourceConfig.name}`);
    return items;
  }

  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    const parts = path.split(".");
    let value: unknown = obj;
    for (const part of parts) {
      value = (value as Record<string, unknown>)?.[part];
    }
    return value;
  }
}

/**
 * Load all source configs from /sources directory
 */
export function loadSourceConfigs(): SourceConfig[] {
  const sourcesDir = join(__dirname, "..", "sources");
  const configs: SourceConfig[] = [];

  try {
    const files = readdirSync(sourcesDir).filter(
      (f) => f.endsWith(".json") && f !== "schema.json"
    );

    for (const file of files) {
      try {
        const content = readFileSync(join(sourcesDir, file), "utf-8");
        const config = JSON.parse(content) as SourceConfig;

        // Skip disabled sources
        if (config.enabled === false) {
          continue;
        }

        configs.push(config);
      } catch (err) {
        console.error(`Failed to load source config: ${file}`, err);
      }
    }
  } catch {
    // Sources directory doesn't exist yet
  }

  return configs;
}
