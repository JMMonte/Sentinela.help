/**
 * Portuguese Civil Protection (ProCiv) / Fogos.pt Collector
 *
 * Fetches active and recent fire/emergency incidents from Portugal.
 */
import { BaseCollector } from "./base-collector.js";
import { COLLECTOR_CONFIGS } from "../config.js";
import { fetchWithRetry } from "../utils/fetch.js";
const FOGOS_ACTIVE_URL = "https://api.fogos.pt/v2/incidents/active";
const FOGOS_SEARCH_URL = "https://api.fogos.pt/v2/incidents/search";
export class ProcivCollector extends BaseCollector {
    constructor() {
        super({
            name: COLLECTOR_CONFIGS.prociv.name,
            redisKey: COLLECTOR_CONFIGS.prociv.redisKey,
            ttlSeconds: COLLECTOR_CONFIGS.prociv.ttlSeconds,
        });
    }
    async collect() {
        this.logger.debug("Fetching ProCiv/Fogos.pt incidents");
        // Calculate date for search query (last 24 hours)
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const after = `${since.getFullYear()}-${String(since.getMonth() + 1).padStart(2, "0")}-${String(since.getDate()).padStart(2, "0")}`;
        // Fetch active and recent incidents in parallel
        const [activeResult, searchResult] = await Promise.allSettled([
            this.fetchEndpoint(FOGOS_ACTIVE_URL),
            this.fetchEndpoint(`${FOGOS_SEARCH_URL}?after=${after}&limit=100`),
        ]);
        // Merge and deduplicate (active takes priority)
        const byId = new Map();
        const cutoff = Date.now() - 24 * 60 * 60 * 1000;
        // Add search results first
        if (searchResult.status === "fulfilled" && searchResult.value.success) {
            for (const incident of searchResult.value.data) {
                if (incident.dateTime.sec * 1000 >= cutoff) {
                    byId.set(incident.id, incident);
                }
            }
        }
        // Add/override with active incidents
        if (activeResult.status === "fulfilled" && activeResult.value.success) {
            for (const incident of activeResult.value.data) {
                byId.set(incident.id, incident);
            }
        }
        const merged = Array.from(byId.values());
        this.logger.debug("ProCiv incidents fetched", {
            active: activeResult.status === "fulfilled" ? activeResult.value.data.length : 0,
            search: searchResult.status === "fulfilled" ? searchResult.value.data.length : 0,
            merged: merged.length,
        });
        return {
            success: true,
            data: merged,
            fetchedAt: new Date().toISOString(),
        };
    }
    async fetchEndpoint(url) {
        try {
            const response = await fetchWithRetry(url, {}, { timeoutMs: 15000, retries: 2 });
            return (await response.json());
        }
        catch {
            return { success: false, data: [] };
        }
    }
}
//# sourceMappingURL=prociv.js.map