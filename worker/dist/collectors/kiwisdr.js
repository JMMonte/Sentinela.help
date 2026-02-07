/**
 * KiwiSDR WebSDR Station Collector
 *
 * Fetches public KiwiSDR station locations and status.
 * The API now returns HTML with embedded data in comments,
 * so we parse the HTML page from kiwisdr.com/.public/
 */
import { BaseCollector } from "./base-collector.js";
import { COLLECTOR_CONFIGS } from "../config.js";
import { fetchWithRetry } from "../utils/fetch.js";
// The new endpoint returns HTML with embedded station data in comments
const KIWISDR_URL = "http://kiwisdr.com/.public/";
export class KiwiSdrCollector extends BaseCollector {
    constructor() {
        super({
            name: COLLECTOR_CONFIGS.kiwisdr.name,
            redisKey: COLLECTOR_CONFIGS.kiwisdr.redisKey,
            ttlSeconds: COLLECTOR_CONFIGS.kiwisdr.ttlSeconds,
        });
    }
    async collect() {
        this.logger.debug("Fetching KiwiSDR station list from HTML");
        const response = await fetchWithRetry(KIWISDR_URL, {
            headers: {
                Accept: "text/html",
                "User-Agent": "Kaos-Worker/1.0",
            },
        }, { timeoutMs: 60000, retries: 2 });
        const html = await response.text();
        const stations = this.parseHtmlStations(html);
        this.logger.debug("KiwiSDR stations parsed", {
            total: stations.length,
        });
        return stations;
    }
    /**
     * Parse station data from HTML with embedded comments.
     * Each station is in a div.cl-entry with data in HTML comments.
     */
    parseHtmlStations(html) {
        const stations = [];
        // Match each cl-entry div block
        const entryRegex = /<div class='cl-entry[^']*'>([\s\S]*?)<\/div>\s*<\/div>/g;
        let match;
        while ((match = entryRegex.exec(html)) !== null) {
            const entryHtml = match[1];
            const station = this.parseStationEntry(entryHtml);
            if (station) {
                stations.push(station);
            }
        }
        return stations;
    }
    /**
     * Parse a single station entry from its HTML block.
     */
    parseStationEntry(html) {
        // Extract comment values using regex
        const getComment = (key) => {
            const regex = new RegExp(`<!-- ${key}=([^>]+) -->`);
            const match = html.match(regex);
            return match ? match[1].trim() : null;
        };
        // Parse GPS coordinates from "(lat, lon)" format
        const gps = getComment("gps");
        if (!gps)
            return null;
        const gpsMatch = gps.match(/\(([^,]+),\s*([^)]+)\)/);
        if (!gpsMatch)
            return null;
        const lat = parseFloat(gpsMatch[1]);
        const lon = parseFloat(gpsMatch[2]);
        if (isNaN(lat) || isNaN(lon))
            return null;
        // Extract the URL from the href
        const urlMatch = html.match(/<a href='([^']+)' target='_blank'>/);
        const url = urlMatch ? urlMatch[1] : null;
        if (!url)
            return null;
        // Get other properties
        const name = getComment("name") || url;
        const users = parseInt(getComment("users") || "0", 10);
        const usersMax = parseInt(getComment("users_max") || "4", 10);
        const antenna = getComment("antenna");
        const location = getComment("loc");
        const offline = getComment("offline") === "yes";
        // Parse SNR (format: "45,45" for all/hf)
        const snrStr = getComment("snr");
        let snr = null;
        if (snrStr) {
            const snrParts = snrStr.split(",");
            snr = parseInt(snrParts[0], 10);
            if (isNaN(snr))
                snr = null;
        }
        return {
            name: name.length > 200 ? name.substring(0, 200) + "..." : name,
            url: url.startsWith("http") ? url : `http://${url}`,
            latitude: lat,
            longitude: lon,
            users,
            usersMax,
            antenna,
            location,
            snr,
            offline,
        };
    }
}
//# sourceMappingURL=kiwisdr.js.map