/**
 * Generic Data Source Collector
 *
 * Reads JSON config files from /sources and creates collectors dynamically.
 * No code changes needed - just add a JSON file!
 */
import { BaseCollector } from "./base-collector.js";
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
export declare class GenericSourceCollector extends BaseCollector {
    private sourceConfig;
    constructor(sourceConfig: SourceConfig);
    get intervalMs(): number;
    protected collect(): Promise<unknown[]>;
    private getNestedValue;
}
/**
 * Load all source configs from /sources directory
 */
export declare function loadSourceConfigs(): SourceConfig[];
//# sourceMappingURL=generic-source.d.ts.map