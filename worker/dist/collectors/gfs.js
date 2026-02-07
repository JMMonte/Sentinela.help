/**
 * GFS (Global Forecast System) Collector
 *
 * Fetches weather data from NOAA GFS at 0.25° resolution.
 * Handles multiple parameters: wind, temperature, humidity, precipitation, clouds, CAPE, UV index.
 */
import { MultiKeyCollector } from "./base-collector.js";
import { COLLECTOR_CONFIGS } from "../config.js";
import { fetchWithRetry } from "../utils/fetch.js";
import { readData } from "grib-js";
// GRIB2 parameter definitions
const GFS_PARAMS = {
    temperature: { param: "TMP", level: "2_m_above_ground", category: 0, number: 0 },
    humidity: { param: "RH", level: "2_m_above_ground", category: 1, number: 1 },
    // Using PRATE (precipitation rate) instead of APCP (accumulated)
    // APCP is only available in forecast files (f003+), PRATE is in analysis (f000)
    precipitation: { param: "PRATE", level: "surface", category: 1, number: 7 },
    cloudCover: { param: "TCDC", level: "entire_atmosphere", category: 6, number: 1 },
    cape: { param: "CAPE", level: "surface", category: 7, number: 6 },
    ozone: { param: "TOZNE", level: "entire_atmosphere_(considered_as_a_single_layer)", category: 14, number: 0 },
    windU: { param: "UGRD", level: "10_m_above_ground", category: 2, number: 2 },
    windV: { param: "VGRD", level: "10_m_above_ground", category: 2, number: 3 },
};
/**
 * Build a NOMADS GFS filter URL.
 * @param forecastHour - Forecast hour (default 0 for analysis, 3 for first forecast)
 */
function buildGfsUrl(variables, forecastHour = 0) {
    const now = new Date();
    const utcHour = now.getUTCHours();
    // GFS runs at 00, 06, 12, 18 UTC; data is available ~4-5h after run time
    const runHour = Math.floor((utcHour - 5) / 6) * 6;
    const runHourStr = String(Math.max(0, runHour)).padStart(2, "0");
    const dateStr = now.getUTCFullYear().toString() +
        String(now.getUTCMonth() + 1).padStart(2, "0") +
        String(now.getUTCDate()).padStart(2, "0");
    const forecastStr = String(forecastHour).padStart(3, "0");
    const varParams = variables.map((v) => `var_${v.param}=on`).join("&");
    const levelParams = [...new Set(variables.map((v) => `lev_${v.level}=on`))].join("&");
    return `https://nomads.ncep.noaa.gov/cgi-bin/filter_gfs_0p25.pl?dir=%2Fgfs.${dateStr}%2F${runHourStr}%2Fatmos&file=gfs.t${runHourStr}z.pgrb2.0p25.f${forecastStr}&${levelParams}&${varParams}`;
}
/**
 * Parse GRIB2 buffer using grib-js.
 */
function parseGribData(buffer) {
    return new Promise((resolve, reject) => {
        readData(buffer, (err, messages) => {
            if (err)
                reject(err);
            else
                resolve(messages);
        });
    });
}
/**
 * Extract a specific field from GRIB messages.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractGfsField(messages, category, parameter) {
    const allFields = messages.flatMap((m) => m.fields);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const getCategory = (f) => f?.product?.details?.category?.value;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const getParameter = (f) => f?.product?.details?.parameter?.value;
    return allFields.find((f) => getCategory(f) === category && getParameter(f) === parameter) || null;
}
/**
 * Build standardized grid data from a GRIB field.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildGridData(field, name, unit, transform) {
    const gridDef = field.grid?.definition || field.grid;
    const header = {
        nx: gridDef.ni,
        ny: gridDef.nj,
        lo1: gridDef.lo1,
        la1: gridDef.la1,
        dx: gridDef.di,
        dy: gridDef.dj,
    };
    const data = transform ? field.data.map((v) => transform(v)) : field.data;
    return { header, data, unit, name };
}
/**
 * Convert Kelvin to Celsius.
 */
function kelvinToCelsius(k) {
    return k - 273.15;
}
/**
 * Calculate solar zenith angle for UV index calculation.
 */
function calculateSolarZenithAngle(lat, lon, date) {
    const dayOfYear = Math.floor((date.getTime() - new Date(date.getUTCFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
    const hour = date.getUTCHours() + date.getUTCMinutes() / 60;
    const declination = 23.45 * Math.sin((2 * Math.PI * (284 + dayOfYear)) / 365);
    const declinationRad = (declination * Math.PI) / 180;
    const solarNoonOffset = lon / 15;
    const hourAngle = (hour - 12 + solarNoonOffset) * 15;
    const hourAngleRad = (hourAngle * Math.PI) / 180;
    const latRad = (lat * Math.PI) / 180;
    const cosZenith = Math.sin(latRad) * Math.sin(declinationRad) +
        Math.cos(latRad) * Math.cos(declinationRad) * Math.cos(hourAngleRad);
    const zenithRad = Math.acos(Math.max(-1, Math.min(1, cosZenith)));
    return (zenithRad * 180) / Math.PI;
}
/**
 * Calculate UV Index from ozone and solar position.
 */
function calculateUvIndex(ozoneDU, solarZenithAngle) {
    if (solarZenithAngle >= 90)
        return 0;
    const cosZenith = Math.cos((solarZenithAngle * Math.PI) / 180);
    const uvClearSky = 12.5 * Math.pow(cosZenith, 2.42) * Math.pow(ozoneDU / 300, -1.23);
    return Math.max(0, uvClearSky);
}
export class GfsCollector extends MultiKeyCollector {
    constructor() {
        super({
            name: COLLECTOR_CONFIGS.gfs.name,
            redisKey: "kaos:gfs:all", // Base key (not used directly)
            ttlSeconds: COLLECTOR_CONFIGS.gfs.ttlSeconds,
        });
    }
    async collect() {
        // Collect all GFS parameters in parallel batches
        // Group parameters by similar levels to reduce NOMADS requests
        await Promise.all([
            this.collectTemperature(),
            this.collectHumidity(),
            this.collectPrecipitation(),
            this.collectCloudCover(),
            this.collectCape(),
            this.collectWind(),
            this.collectUvIndex(),
        ]);
        return null; // Data is stored in individual methods
    }
    async collectTemperature() {
        try {
            const url = buildGfsUrl([{ param: "TMP", level: "2_m_above_ground" }]);
            this.logger.debug("Fetching temperature from GFS");
            const response = await fetchWithRetry(url, {
                headers: { "Accept-Encoding": "gzip" },
            }, { timeoutMs: 60000 });
            const buffer = await response.arrayBuffer();
            const messages = await parseGribData(Buffer.from(buffer));
            const field = extractGfsField(messages, 0, 0);
            if (!field)
                throw new Error("Temperature field not found");
            const data = buildGridData(field, "Temperature", "°C", kelvinToCelsius);
            await this.storeToKey("kaos:gfs:temperature", data);
            this.logger.debug("Temperature data stored");
        }
        catch (error) {
            this.logger.error("Failed to collect temperature", error);
        }
    }
    async collectHumidity() {
        try {
            const url = buildGfsUrl([{ param: "RH", level: "2_m_above_ground" }]);
            this.logger.debug("Fetching humidity from GFS");
            const response = await fetchWithRetry(url, {
                headers: { "Accept-Encoding": "gzip" },
            }, { timeoutMs: 60000 });
            const buffer = await response.arrayBuffer();
            const messages = await parseGribData(Buffer.from(buffer));
            const field = extractGfsField(messages, 1, 1);
            if (!field)
                throw new Error("Humidity field not found");
            const data = buildGridData(field, "Relative Humidity", "%");
            await this.storeToKey("kaos:gfs:humidity", data);
            this.logger.debug("Humidity data stored");
        }
        catch (error) {
            this.logger.error("Failed to collect humidity", error);
        }
    }
    async collectPrecipitation() {
        try {
            // Use PRATE (precipitation rate) from f001 forecast
            // APCP doesn't decode properly with grib-js, but PRATE from f001 works
            const url = buildGfsUrl([{ param: "PRATE", level: "surface" }], 1);
            this.logger.debug("Fetching precipitation from GFS f001 (PRATE)");
            const response = await fetchWithRetry(url, {
                headers: { "Accept-Encoding": "gzip" },
            }, { timeoutMs: 60000 });
            const buffer = await response.arrayBuffer();
            const messages = await parseGribData(Buffer.from(buffer));
            // PRATE returns two messages - first empty, second with data
            const allFields = messages.flatMap((m) => m.fields);
            const field = allFields.find((f) => f?.data && f.data.length > 0);
            if (!field || !field.data) {
                this.logger.warn("No precipitation field with data found");
                return;
            }
            this.logger.debug("Precipitation field found", { dataLength: field.data.length });
            // Convert PRATE (kg/m²/s) to mm/h
            // 1 kg/m²/s = 1 mm/s = 3600 mm/h
            const convertedData = field.data.map((v) => v * 3600);
            field.data = convertedData;
            const data = buildGridData(field, "Precipitation", "mm/h");
            await this.storeToKey("kaos:gfs:precipitation", data);
            this.logger.debug("Precipitation data stored");
        }
        catch (error) {
            this.logger.error("Failed to collect precipitation", error);
        }
    }
    async collectCloudCover() {
        try {
            const url = buildGfsUrl([{ param: "TCDC", level: "entire_atmosphere" }]);
            this.logger.debug("Fetching cloud cover from GFS");
            const response = await fetchWithRetry(url, {
                headers: { "Accept-Encoding": "gzip" },
            }, { timeoutMs: 60000 });
            const buffer = await response.arrayBuffer();
            const messages = await parseGribData(Buffer.from(buffer));
            const field = extractGfsField(messages, 6, 1);
            if (!field)
                throw new Error("Cloud cover field not found");
            const data = buildGridData(field, "Cloud Cover", "%");
            await this.storeToKey("kaos:gfs:cloud-cover", data);
            this.logger.debug("Cloud cover data stored");
        }
        catch (error) {
            this.logger.error("Failed to collect cloud cover", error);
        }
    }
    async collectCape() {
        try {
            const url = buildGfsUrl([{ param: "CAPE", level: "surface" }]);
            this.logger.debug("Fetching CAPE from GFS");
            const response = await fetchWithRetry(url, {
                headers: { "Accept-Encoding": "gzip" },
            }, { timeoutMs: 60000 });
            const buffer = await response.arrayBuffer();
            const messages = await parseGribData(Buffer.from(buffer));
            const field = extractGfsField(messages, 7, 6);
            if (!field)
                throw new Error("CAPE field not found");
            const data = buildGridData(field, "CAPE", "J/kg");
            await this.storeToKey("kaos:gfs:cape", data);
            this.logger.debug("CAPE data stored");
        }
        catch (error) {
            this.logger.error("Failed to collect CAPE", error);
        }
    }
    async collectWind() {
        try {
            const url = buildGfsUrl([
                { param: "UGRD", level: "10_m_above_ground" },
                { param: "VGRD", level: "10_m_above_ground" },
            ]);
            this.logger.debug("Fetching wind from GFS");
            const response = await fetchWithRetry(url, {
                headers: { "Accept-Encoding": "gzip" },
            }, { timeoutMs: 60000 });
            const buffer = await response.arrayBuffer();
            const messages = await parseGribData(Buffer.from(buffer));
            const uField = extractGfsField(messages, 2, 2);
            const vField = extractGfsField(messages, 2, 3);
            if (!uField || !vField)
                throw new Error("Wind U/V fields not found");
            const gridDef = uField.grid?.definition || uField.grid;
            const velocityData = [
                {
                    header: {
                        parameterCategory: 2,
                        parameterNumber: 2,
                        parameterNumberName: "U-component_of_wind",
                        parameterUnit: "m.s-1",
                        nx: gridDef.ni,
                        ny: gridDef.nj,
                        lo1: gridDef.lo1,
                        la1: gridDef.la1,
                        dx: gridDef.di,
                        dy: gridDef.dj,
                    },
                    data: uField.data,
                },
                {
                    header: {
                        parameterCategory: 2,
                        parameterNumber: 3,
                        parameterNumberName: "V-component_of_wind",
                        parameterUnit: "m.s-1",
                        nx: gridDef.ni,
                        ny: gridDef.nj,
                        lo1: gridDef.lo1,
                        la1: gridDef.la1,
                        dx: gridDef.di,
                        dy: gridDef.dj,
                    },
                    data: vField.data,
                },
            ];
            await this.storeToKey("kaos:gfs:wind", velocityData);
            this.logger.debug("Wind data stored");
        }
        catch (error) {
            this.logger.error("Failed to collect wind", error);
        }
    }
    async collectUvIndex() {
        try {
            const url = buildGfsUrl([
                { param: "TOZNE", level: "entire_atmosphere_(considered_as_a_single_layer)" },
            ]);
            this.logger.debug("Fetching ozone for UV index from GFS");
            const response = await fetchWithRetry(url, {
                headers: { "Accept-Encoding": "gzip" },
            }, { timeoutMs: 60000 });
            const buffer = await response.arrayBuffer();
            const messages = await parseGribData(Buffer.from(buffer));
            const ozoneField = extractGfsField(messages, 14, 0);
            if (!ozoneField)
                throw new Error("Ozone field not found");
            const { header, data: ozoneData } = buildGridData(ozoneField, "Ozone", "DU");
            // Calculate UV Index for each grid point
            const now = new Date();
            const nx = header.nx;
            const ny = header.ny;
            const uvData = new Array(ozoneData.length);
            for (let yi = 0; yi < ny; yi++) {
                const lat = header.la1 - yi * header.dy;
                for (let xi = 0; xi < nx; xi++) {
                    const lon = header.lo1 + xi * header.dx;
                    const normalizedLon = lon > 180 ? lon - 360 : lon;
                    const idx = yi * nx + xi;
                    const ozone = ozoneData[idx];
                    if (isNaN(ozone) || ozone <= 0) {
                        uvData[idx] = NaN;
                        continue;
                    }
                    const solarZenith = calculateSolarZenithAngle(lat, normalizedLon, now);
                    uvData[idx] = calculateUvIndex(ozone, solarZenith);
                }
            }
            const uvGridData = {
                header,
                data: uvData,
                unit: "UV Index",
                name: "UV Index",
            };
            await this.storeToKey("kaos:gfs:uv-index", uvGridData);
            this.logger.debug("UV index data stored");
        }
        catch (error) {
            this.logger.error("Failed to collect UV index", error);
        }
    }
}
//# sourceMappingURL=gfs.js.map