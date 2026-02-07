/**
 * GDACS (Global Disaster Alert and Coordination System) Collector
 *
 * Fetches global disaster alerts: earthquakes, floods, cyclones, volcanoes, wildfires, droughts.
 * Data source: https://www.gdacs.org/
 */
import { BaseCollector } from "./base-collector.js";
import { COLLECTOR_CONFIGS } from "../config.js";
import { fetchWithRetry } from "../utils/fetch.js";
const GDACS_API_URL = "https://www.gdacs.org/gdacsapi/api/events/geteventlist/MAP";
/**
 * Extract centroid coordinates from GeoJSON geometry
 */
function getCoordinates(geometry) {
    if (geometry.type === "Point") {
        const coords = geometry.coordinates;
        return [coords[0], coords[1]];
    }
    // For polygons/multipolygons, calculate centroid
    if (geometry.type === "Polygon" || geometry.type === "MultiPolygon") {
        // Flatten to get all coordinates
        const flatten = (arr) => {
            if (Array.isArray(arr) && typeof arr[0] === "number") {
                return [arr];
            }
            return arr.flatMap(flatten);
        };
        const coords = flatten(geometry.coordinates);
        if (coords.length === 0)
            return [0, 0];
        const sum = coords.reduce((acc, c) => [acc[0] + c[0], acc[1] + c[1]], [0, 0]);
        return [sum[0] / coords.length, sum[1] / coords.length];
    }
    return [0, 0];
}
export class GdacsCollector extends BaseCollector {
    constructor() {
        super({
            name: COLLECTOR_CONFIGS.gdacs.name,
            redisKey: COLLECTOR_CONFIGS.gdacs.redisKey,
            ttlSeconds: COLLECTOR_CONFIGS.gdacs.ttlSeconds,
        });
    }
    async collect() {
        this.logger.debug("Fetching GDACS global disaster events");
        const response = await fetchWithRetry(GDACS_API_URL, {
            headers: {
                Accept: "application/json",
                "User-Agent": "Kaos-Worker/1.0",
            },
        }, { timeoutMs: 30_000, retries: 2 });
        const data = (await response.json());
        // Extract cyclone data: track points and forecast cones
        const tcData = new Map();
        const now = new Date();
        for (const f of data.features) {
            if (f.properties.iscurrent !== "true" || f.properties.eventtype !== "TC") {
                continue;
            }
            const eventId = f.properties.eventid;
            const cls = f.properties.Class || "";
            // Initialize cyclone data if not exists
            if (!tcData.has(eventId)) {
                tcData.set(eventId, {
                    trackPoints: [],
                    windSpeed: f.properties.severitydata?.severity || 0,
                });
            }
            const cyclone = tcData.get(eventId);
            // Extract track points from Point_Polygon_Point features
            if (cls.startsWith("Point_Polygon_Point_") && f.geometry.type === "Polygon") {
                const idx = parseInt(cls.split("_").pop() || "0", 10);
                const ring = f.geometry.coordinates;
                // Calculate centroid of the polygon
                const points = ring[0];
                const cx = points.reduce((sum, p) => sum + p[0], 0) / points.length;
                const cy = points.reduce((sum, p) => sum + p[1], 0) / points.length;
                const timeLabel = f.properties.polygonlabel || "";
                // Parse time label like "07/02 06:00 UTC" to determine if forecast
                let isForecast = false;
                if (timeLabel) {
                    const match = timeLabel.match(/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2})/);
                    if (match) {
                        const [, day, month, hour, minute] = match;
                        const pointDate = new Date(now.getFullYear(), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute));
                        // Handle year wrap (Dec -> Jan)
                        if (pointDate.getMonth() < now.getMonth() - 6) {
                            pointDate.setFullYear(now.getFullYear() + 1);
                        }
                        isForecast = pointDate > now;
                    }
                }
                cyclone.trackPoints.push({
                    lng: cx,
                    lat: cy,
                    time: timeLabel,
                    isForecast,
                });
            }
            // Extract forecast cone from Poly_Cones
            if (cls === "Poly_Cones" && f.geometry.type === "Polygon") {
                const ring = f.geometry.coordinates;
                cyclone.forecastCone = ring[0].map((p) => [p[0], p[1]]);
            }
        }
        // Sort track points by index (they should already be in order, but ensure it)
        for (const cyclone of tcData.values()) {
            // Sort by whether it's forecast first, then we'll need to re-sort by time
            // Actually, the Point_Polygon_Point_N index should give us the order
            cyclone.trackPoints.sort((a, b) => {
                // Sort by time string parsing (rough approximation)
                return a.time.localeCompare(b.time);
            });
        }
        // Transform API response to our format
        // GDACS returns multiple features per event (Point centroid + Polygon affected area + LineString tracks)
        // We keep Point features only for markers, and attach track data for TCs
        const seenKeys = new Set();
        const events = data.features
            .filter((f) => {
            if (f.properties.iscurrent !== "true")
                return false;
            // Create a unique key including geometry type to properly deduplicate
            const geoClass = f.properties.Class || f.geometry.type;
            const key = `${f.properties.eventtype}-${f.properties.eventid}-${f.properties.episodeid}-${geoClass}`;
            // Skip if we've seen this exact feature
            if (seenKeys.has(key))
                return false;
            seenKeys.add(key);
            // Only keep Point geometries (centroids) for markers
            return f.geometry.type === "Point";
        })
            .map((f) => {
            const [lng, lat] = getCoordinates(f.geometry);
            const props = f.properties;
            const event = {
                id: `${props.eventtype}-${props.eventid}-${props.episodeid}`,
                eventType: props.eventtype,
                name: props.name || props.eventname || props.description,
                description: props.description,
                alertLevel: props.alertlevel,
                country: props.country,
                countries: props.affectedcountries?.map((c) => c.countryname) || [props.country],
                lat,
                lng,
                fromDate: props.fromdate,
                toDate: props.todate,
                severity: props.severitydata?.severity || 0,
                severityText: props.severitydata?.severitytext || "",
                iconUrl: props.icon,
                reportUrl: props.url?.report || "",
                isCurrent: props.iscurrent === "true",
            };
            // Attach cyclone data for tropical cyclones
            if (props.eventtype === "TC") {
                const cyclone = tcData.get(props.eventid);
                if (cyclone && cyclone.trackPoints.length > 0) {
                    event.cycloneData = cyclone;
                }
            }
            return event;
        });
        this.logger.info(`GDACS: ${events.length} current events`, {
            byType: {
                EQ: events.filter((e) => e.eventType === "EQ").length,
                FL: events.filter((e) => e.eventType === "FL").length,
                TC: events.filter((e) => e.eventType === "TC").length,
                VO: events.filter((e) => e.eventType === "VO").length,
                WF: events.filter((e) => e.eventType === "WF").length,
                DR: events.filter((e) => e.eventType === "DR").length,
            },
        });
        return {
            events,
            fetchedAt: new Date().toISOString(),
        };
    }
}
//# sourceMappingURL=gdacs.js.map