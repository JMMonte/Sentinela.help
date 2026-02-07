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

// Full station type (used internally during parsing)
type KiwiStationFull = {
  name: string;
  url: string;
  latitude: number;
  longitude: number;
  users: number;
  usersMax: number;
  antenna: string | null;
  location: string | null;
  snr: number | null;
  offline: boolean;
};

// Compact station type for Redis storage (~60% smaller)
export type KiwiStation = {
  n: string;        // name
  u: string;        // url
  la: number;       // latitude (3 decimals)
  lo: number;       // longitude (3 decimals)
  us: number;       // users
  mx: number;       // usersMax
  an?: string;      // antenna (omitted if null)
  lc?: string;      // location (omitted if null)
  sn?: number;      // snr (omitted if null)
  of: boolean;      // offline
};

export class KiwiSdrCollector extends BaseCollector {
  constructor() {
    super({
      name: COLLECTOR_CONFIGS.kiwisdr.name,
      redisKey: COLLECTOR_CONFIGS.kiwisdr.redisKey,
      ttlSeconds: COLLECTOR_CONFIGS.kiwisdr.ttlSeconds,
    });
  }

  protected async collect(): Promise<KiwiStation[]> {
    this.logger.debug("Fetching KiwiSDR station list from HTML");

    const response = await fetchWithRetry(
      KIWISDR_URL,
      {
        headers: {
          Accept: "text/html",
          "User-Agent": "Kaos-Worker/1.0",
        },
      },
      { timeoutMs: 60000, retries: 2 }
    );

    const html = await response.text();
    const fullStations = this.parseHtmlStations(html);

    // Convert to compact format for storage
    const stations = fullStations.map((s): KiwiStation => {
      const compact: KiwiStation = {
        n: s.name,
        u: s.url,
        la: Math.round(s.latitude * 1000) / 1000,
        lo: Math.round(s.longitude * 1000) / 1000,
        us: s.users,
        mx: s.usersMax,
        of: s.offline,
      };
      // Only include optional fields if they have values
      if (s.antenna) compact.an = s.antenna;
      if (s.location) compact.lc = s.location;
      if (s.snr !== null) compact.sn = s.snr;
      return compact;
    });

    this.logger.debug("KiwiSDR stations parsed", {
      total: stations.length,
    });

    return stations;
  }

  /**
   * Parse station data from HTML with embedded comments.
   * Each station is in a div.cl-entry with data in HTML comments.
   */
  private parseHtmlStations(html: string): KiwiStationFull[] {
    const stations: KiwiStationFull[] = [];

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
  private parseStationEntry(html: string): KiwiStationFull | null {
    // Extract comment values using regex
    const getComment = (key: string): string | null => {
      const regex = new RegExp(`<!-- ${key}=([^>]+) -->`);
      const match = html.match(regex);
      return match ? match[1].trim() : null;
    };

    // Parse GPS coordinates from "(lat, lon)" format
    const gps = getComment("gps");
    if (!gps) return null;

    const gpsMatch = gps.match(/\(([^,]+),\s*([^)]+)\)/);
    if (!gpsMatch) return null;

    const lat = parseFloat(gpsMatch[1]);
    const lon = parseFloat(gpsMatch[2]);
    if (isNaN(lat) || isNaN(lon)) return null;

    // Extract the URL from the href
    const urlMatch = html.match(/<a href='([^']+)' target='_blank'>/);
    const url = urlMatch ? urlMatch[1] : null;
    if (!url) return null;

    // Get other properties
    const name = getComment("name") || url;
    const users = parseInt(getComment("users") || "0", 10);
    const usersMax = parseInt(getComment("users_max") || "4", 10);
    const antenna = getComment("antenna");
    const location = getComment("loc");
    const offline = getComment("offline") === "yes";

    // Parse SNR (format: "45,45" for all/hf)
    const snrStr = getComment("snr");
    let snr: number | null = null;
    if (snrStr) {
      const snrParts = snrStr.split(",");
      snr = parseInt(snrParts[0], 10);
      if (isNaN(snr)) snr = null;
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
