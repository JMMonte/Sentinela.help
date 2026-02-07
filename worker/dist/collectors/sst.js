/**
 * Sea Surface Temperature (SST) Collector
 *
 * Fetches SST data from NOAA OISST via Coastwatch ERDDAP.
 * 0.25° global resolution, updated daily.
 */
import { BaseCollector } from "./base-collector.js";
import { COLLECTOR_CONFIGS } from "../config.js";
import { fetchWithRetry } from "../utils/fetch.js";
// NOAA OISST v2.1 - 0.25° resolution, global, daily updates
const ERDDAP_URL = "https://coastwatch.pfeg.noaa.gov/erddap/griddap/ncdcOisst21Agg.json?sst[(last)][(0)][(-89.875):(89.875)][(0.125):(359.875)]";
export class SstCollector extends BaseCollector {
    constructor() {
        super({
            name: COLLECTOR_CONFIGS.sst.name,
            redisKey: COLLECTOR_CONFIGS.sst.redisKey,
            ttlSeconds: COLLECTOR_CONFIGS.sst.ttlSeconds,
        });
    }
    async collect() {
        this.logger.debug("Fetching SST from Coastwatch ERDDAP");
        const response = await fetchWithRetry(ERDDAP_URL, { headers: { Accept: "application/json" } }, { timeoutMs: 120000, retries: 2 });
        const json = (await response.json());
        const { columnNames, rows } = json.table;
        const latIdx = columnNames.indexOf("latitude");
        const lonIdx = columnNames.indexOf("longitude");
        const sstIdx = columnNames.indexOf("sst");
        if (latIdx === -1 || lonIdx === -1 || sstIdx === -1) {
            throw new Error("Missing expected columns in ERDDAP response");
        }
        // Collect unique lats and lons
        const lats = new Set();
        const lons = new Set();
        for (const row of rows) {
            const lat = row[latIdx];
            const lon = row[lonIdx];
            if (lat != null && lon != null) {
                lats.add(lat);
                lons.add(lon);
            }
        }
        const sortedLats = Array.from(lats).sort((a, b) => b - a); // Descending (north to south)
        const sortedLons = Array.from(lons).sort((a, b) => a - b); // Ascending (west to east)
        const ny = sortedLats.length;
        const nx = sortedLons.length;
        if (ny === 0 || nx === 0) {
            throw new Error("No valid data points in ERDDAP response");
        }
        const dy = ny > 1 ? Math.abs(sortedLats[0] - sortedLats[1]) : 0.25;
        const dx = nx > 1 ? Math.abs(sortedLons[1] - sortedLons[0]) : 0.25;
        // Create lookup maps
        const latToIdx = new Map();
        const lonToIdx = new Map();
        sortedLats.forEach((lat, idx) => latToIdx.set(lat, idx));
        sortedLons.forEach((lon, idx) => lonToIdx.set(lon, idx));
        // Initialize data array with NaN
        const data = new Array(ny * nx).fill(NaN);
        // Fill in SST values
        for (const row of rows) {
            const lat = row[latIdx];
            const lon = row[lonIdx];
            const sst = row[sstIdx];
            const y = latToIdx.get(lat);
            const x = lonToIdx.get(lon);
            if (y !== undefined && x !== undefined && sst !== null) {
                data[y * nx + x] = sst;
            }
        }
        this.logger.debug(`Parsed SST grid: ${nx}x${ny}, ${rows.length} data points`);
        return {
            header: {
                nx,
                ny,
                lo1: sortedLons[0],
                la1: sortedLats[0],
                dx,
                dy,
            },
            data,
            unit: "°C",
            name: "Sea Surface Temperature",
        };
    }
}
//# sourceMappingURL=sst.js.map