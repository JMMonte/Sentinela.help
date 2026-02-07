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
export class TecCollector extends BaseCollector {
    constructor() {
        super({
            name: COLLECTOR_CONFIGS.tec.name,
            redisKey: COLLECTOR_CONFIGS.tec.redisKey,
            ttlSeconds: COLLECTOR_CONFIGS.tec.ttlSeconds,
        });
    }
    async collect() {
        this.logger.debug("Fetching TEC data from NOAA SWPC GloTEC");
        try {
            // Step 1: Get the list of available GloTEC files
            const listResponse = await fetchWithRetry(GLOTEC_LIST_URL, {}, { timeoutMs: 30000, retries: 2 });
            const list = (await listResponse.json());
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
            const dataResponse = await fetchWithRetry(dataUrl, {}, { timeoutMs: 30000, retries: 2 });
            const geojson = (await dataResponse.json());
            return this.parseGloTecGeoJSON(geojson, latest.time_tag);
        }
        catch (error) {
            this.logger.warn("Failed to fetch TEC data", {
                error: error instanceof Error ? error.message : String(error),
            });
            return this.createDefaultTecData();
        }
    }
    parseGloTecGeoJSON(geojson, timestamp) {
        if (!geojson.features || geojson.features.length === 0) {
            return this.createDefaultTecData();
        }
        // Collect unique latitudes and longitudes
        const latSet = new Set();
        const lonSet = new Set();
        const tecMap = new Map();
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
        const grid = [];
        for (const lat of latitudes) {
            const row = [];
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
    createDefaultTecData() {
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
//# sourceMappingURL=tec.js.map