/**
 * NOAA Space Weather Prediction Center Collector
 *
 * Fetches space weather data including Kp index, solar flux, and X-ray flux.
 */
import { BaseCollector } from "./base-collector.js";
import { COLLECTOR_CONFIGS } from "../config.js";
import { fetchWithRetry } from "../utils/fetch.js";
function getKpDescription(kp) {
    if (kp < 4)
        return "Quiet";
    if (kp === 4)
        return "Unsettled";
    if (kp === 5)
        return "Minor Storm (G1)";
    if (kp === 6)
        return "Moderate Storm (G2)";
    if (kp === 7)
        return "Strong Storm (G3)";
    if (kp === 8)
        return "Severe Storm (G4)";
    return "Extreme Storm (G5)";
}
export class SpaceWeatherCollector extends BaseCollector {
    constructor() {
        super({
            name: COLLECTOR_CONFIGS.spaceWeather.name,
            redisKey: COLLECTOR_CONFIGS.spaceWeather.redisKey,
            ttlSeconds: COLLECTOR_CONFIGS.spaceWeather.ttlSeconds,
        });
    }
    async collect() {
        this.logger.debug("Fetching space weather data from NOAA SWPC");
        // Fetch multiple endpoints in parallel
        const [kpResult, fluxResult, xrayResult] = await Promise.allSettled([
            fetchWithRetry("https://services.swpc.noaa.gov/json/planetary_k_index_1m.json", {}, { timeoutMs: 30000, retries: 2 }).then((r) => r.json()),
            fetchWithRetry("https://services.swpc.noaa.gov/json/f107_cm_flux.json", {}, { timeoutMs: 30000, retries: 2 }).then((r) => r.json()),
            fetchWithRetry("https://services.swpc.noaa.gov/json/goes/primary/xrays-6-hour.json", {}, { timeoutMs: 30000, retries: 2 }).then((r) => r.json()),
        ]);
        // Parse Kp index
        let kpIndex = 0;
        if (kpResult.status === "fulfilled" && kpResult.value.length > 0) {
            const latest = kpResult.value[kpResult.value.length - 1];
            kpIndex = parseFloat(latest.kp) || 0;
        }
        // Parse solar flux
        let solarFlux = null;
        if (fluxResult.status === "fulfilled" && fluxResult.value.length > 0) {
            solarFlux = fluxResult.value[fluxResult.value.length - 1].flux;
        }
        // Parse X-ray flux
        let xrayFlux = null;
        if (xrayResult.status === "fulfilled" && xrayResult.value.length > 0) {
            const latest = xrayResult.value[xrayResult.value.length - 1];
            xrayFlux = latest.current_class || null;
        }
        return {
            kpIndex,
            kpDescription: getKpDescription(kpIndex),
            solarFlux,
            xrayFlux,
            timestamp: new Date().toISOString(),
        };
    }
}
//# sourceMappingURL=space-weather.js.map