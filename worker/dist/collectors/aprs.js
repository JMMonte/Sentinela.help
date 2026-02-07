/**
 * APRS-IS (Automatic Packet Reporting System - Internet Service) Collector
 *
 * Connects directly to APRS-IS servers to receive real-time amateur radio
 * position reports with geographic filtering.
 *
 * Protocol: TCP connection to port 14580 with server-side filtering
 * Reference: https://www.aprs-is.net/javAPRSFilter.aspx
 */
import * as net from "net";
import { WebSocketCollector } from "./base-collector.js";
import { COLLECTOR_CONFIGS } from "../config.js";
import { storeData, updateCollectorMeta } from "../redis.js";
import { createLogger } from "../logger.js";
// APRS-IS servers (rotating pool)
const APRS_SERVERS = [
    { host: "rotate.aprs2.net", port: 14580 },
    { host: "euro.aprs2.net", port: 14580 },
    { host: "asia.aprs2.net", port: 14580 },
];
// Global filter - receive data from everywhere
// Using range filter centered on Atlantic (covers Europe, Africa, Americas)
// Format: r/lat/lon/range_km
const APRS_FILTER = "r/30/0/10000"; // 10,000km radius from lat 30, lon 0
// Read-only login (no callsign needed for receive-only)
const APRS_LOGIN = `user N0CALL pass -1 vers KaosWorker 1.0 filter ${APRS_FILTER}`;
export class AprsCollector extends WebSocketCollector {
    socket = null;
    stations = new Map();
    persistInterval = null;
    cleanupInterval = null;
    reconnectTimeout = null;
    isConnecting = false;
    shouldReconnect = true;
    buffer = "";
    constructor() {
        super({
            name: COLLECTOR_CONFIGS.aprs.name,
            redisKey: COLLECTOR_CONFIGS.aprs.redisKey,
            ttlSeconds: COLLECTOR_CONFIGS.aprs.ttlSeconds,
            persistIntervalMs: 30000, // Persist every 30 seconds
        });
        this.logger = createLogger("aprs");
    }
    async start() {
        this.shouldReconnect = true;
        this.connect();
        // Persist to Redis every 30 seconds
        this.persistInterval = setInterval(() => {
            this.persistToRedis().catch((error) => {
                this.logger.error("Failed to persist APRS data", error);
            });
        }, this.config.persistIntervalMs);
        // Clean old stations every 5 minutes
        this.cleanupInterval = setInterval(() => {
            this.cleanOldStations();
        }, 5 * 60 * 1000);
        this.logger.info("APRS-IS collector started");
    }
    stop() {
        this.shouldReconnect = false;
        if (this.socket) {
            this.socket.destroy();
            this.socket = null;
        }
        if (this.persistInterval) {
            clearInterval(this.persistInterval);
            this.persistInterval = null;
        }
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }
        this.logger.info("APRS-IS collector stopped");
    }
    connect() {
        if (this.isConnecting || this.socket)
            return;
        this.isConnecting = true;
        const server = APRS_SERVERS[Math.floor(Math.random() * APRS_SERVERS.length)];
        this.logger.debug(`Connecting to ${server.host}:${server.port}`);
        try {
            this.socket = net.createConnection(server.port, server.host);
            this.socket.setEncoding("utf8");
            this.socket.on("connect", () => {
                this.isConnecting = false;
                this.logger.info(`Connected to ${server.host}:${server.port}`);
                // Send login with filter
                this.socket?.write(APRS_LOGIN + "\r\n");
                this.logger.debug("Sent APRS-IS login with filter");
                updateCollectorMeta(this.config.name, "ok", 0).catch(() => { });
            });
            this.socket.on("data", (data) => {
                this.buffer += data;
                this.processBuffer();
            });
            this.socket.on("close", () => {
                this.isConnecting = false;
                this.socket = null;
                this.logger.warn("APRS-IS connection closed");
                if (this.shouldReconnect) {
                    this.scheduleReconnect();
                }
            });
            this.socket.on("error", (error) => {
                this.isConnecting = false;
                this.logger.error("APRS-IS connection error", error);
                updateCollectorMeta(this.config.name, "degraded", 1).catch(() => { });
            });
            this.socket.on("timeout", () => {
                this.logger.warn("APRS-IS connection timeout");
                this.socket?.destroy();
            });
            // Set socket timeout (5 minutes)
            this.socket.setTimeout(5 * 60 * 1000);
        }
        catch (error) {
            this.isConnecting = false;
            this.logger.error("Failed to create APRS-IS connection", error);
            this.scheduleReconnect();
        }
    }
    scheduleReconnect() {
        if (!this.shouldReconnect)
            return;
        this.logger.debug("Scheduling reconnect in 10 seconds");
        this.reconnectTimeout = setTimeout(() => {
            this.connect();
        }, 10000);
    }
    processBuffer() {
        // Process complete lines from buffer
        let newlineIdx;
        while ((newlineIdx = this.buffer.indexOf("\n")) !== -1) {
            const line = this.buffer.slice(0, newlineIdx).trim();
            this.buffer = this.buffer.slice(newlineIdx + 1);
            if (line.length > 0) {
                this.parseLine(line);
            }
        }
    }
    parseLine(line) {
        // Skip server messages (start with #)
        if (line.startsWith("#")) {
            if (line.includes("logresp")) {
                this.logger.debug("APRS-IS login response: " + line);
            }
            return;
        }
        // Parse APRS packet
        const station = this.parseAprsPacket(line);
        if (station) {
            this.stations.set(station.callsign, station);
        }
    }
    /**
     * Parse an APRS packet into a station object.
     * APRS packet format: CALLSIGN>DEST,PATH:DATA
     */
    parseAprsPacket(packet) {
        try {
            // Split into header and data
            const colonIdx = packet.indexOf(":");
            if (colonIdx === -1)
                return null;
            const header = packet.slice(0, colonIdx);
            const data = packet.slice(colonIdx + 1);
            // Parse header: CALLSIGN>DEST,PATH1,PATH2,...
            const arrowIdx = header.indexOf(">");
            if (arrowIdx === -1)
                return null;
            const callsign = header.slice(0, arrowIdx).trim();
            if (!callsign || callsign.length > 9)
                return null;
            const pathPart = header.slice(arrowIdx + 1);
            const pathParts = pathPart.split(",");
            const path = pathParts.slice(1).join(",") || null;
            // Parse position from data
            const position = this.parsePosition(data);
            if (!position)
                return null;
            return {
                callsign,
                latitude: position.latitude,
                longitude: position.longitude,
                symbol: position.symbol,
                symbolTable: position.symbolTable,
                comment: position.comment,
                lastHeard: Date.now(),
                speed: position.speed,
                course: position.course,
                altitude: position.altitude,
                path,
            };
        }
        catch {
            return null;
        }
    }
    /**
     * Parse position data from APRS packet.
     * Supports uncompressed and compressed formats.
     */
    parsePosition(data) {
        if (data.length < 10)
            return null;
        const dataType = data[0];
        // Position without timestamp: ! or =
        // Position with timestamp: / or @
        // Mic-E: ` or '
        if ("!=/@`'".includes(dataType)) {
            if (dataType === "`" || dataType === "'") {
                // Mic-E format - skip for now (complex encoding)
                return null;
            }
            let posData = data.slice(1);
            let hasTimestamp = dataType === "/" || dataType === "@";
            // Skip timestamp if present (7 chars: DDHHMMz or HHMMSSh)
            if (hasTimestamp && posData.length > 7) {
                posData = posData.slice(7);
            }
            // Check for compressed format (starts with symbol table, then 4 compressed chars)
            if (posData.length >= 13 && !/^\d/.test(posData[1])) {
                return this.parseCompressedPosition(posData);
            }
            // Uncompressed format: DDMM.MMN/DDDMM.MME$ (19 chars minimum)
            return this.parseUncompressedPosition(posData);
        }
        return null;
    }
    /**
     * Parse uncompressed APRS position.
     * Format: DDMM.MMN/DDDMM.MME$ where $ is symbol code
     */
    parseUncompressedPosition(data) {
        // Need at least: 8 (lat) + 1 (table) + 9 (lon) + 1 (symbol) = 19 chars
        if (data.length < 19)
            return null;
        try {
            // Latitude: DDMM.MMN (8 chars)
            const latDeg = parseInt(data.slice(0, 2), 10);
            const latMin = parseFloat(data.slice(2, 7));
            const latDir = data[7];
            if (isNaN(latDeg) || isNaN(latMin))
                return null;
            if (latDir !== "N" && latDir !== "S")
                return null;
            let latitude = latDeg + latMin / 60;
            if (latDir === "S")
                latitude = -latitude;
            // Symbol table (1 char)
            const symbolTable = data[8];
            // Longitude: DDDMM.MME (9 chars)
            const lonDeg = parseInt(data.slice(9, 12), 10);
            const lonMin = parseFloat(data.slice(12, 17));
            const lonDir = data[17];
            if (isNaN(lonDeg) || isNaN(lonMin))
                return null;
            if (lonDir !== "E" && lonDir !== "W")
                return null;
            let longitude = lonDeg + lonMin / 60;
            if (lonDir === "W")
                longitude = -longitude;
            // Symbol code (1 char)
            const symbol = data[18];
            // Validate coordinates
            if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180)
                return null;
            // Rest is comment/extension data
            const rest = data.slice(19);
            let comment = rest.trim() || null;
            let speed = null;
            let course = null;
            let altitude = null;
            // Parse course/speed extension (CSE/SPD format: 000/000)
            const cseMatch = rest.match(/^(\d{3})\/(\d{3})/);
            if (cseMatch) {
                course = parseInt(cseMatch[1], 10);
                speed = parseInt(cseMatch[2], 10) * 1.852; // knots to km/h
                comment = rest.slice(7).trim() || null;
            }
            // Parse altitude from comment (/A=NNNNNN)
            const altMatch = rest.match(/\/A=(-?\d+)/);
            if (altMatch) {
                altitude = parseInt(altMatch[1], 10) * 0.3048; // feet to meters
            }
            return { latitude, longitude, symbol, symbolTable, comment, speed, course, altitude };
        }
        catch {
            return null;
        }
    }
    /**
     * Parse compressed APRS position.
     * Format: /YYYYXXXX$cs where YYYY=lat, XXXX=lon (base91), $=symbol, cs=compressed speed/course
     */
    parseCompressedPosition(data) {
        if (data.length < 13)
            return null;
        try {
            const symbolTable = data[0];
            const latChars = data.slice(1, 5);
            const lonChars = data.slice(5, 9);
            const symbol = data[9];
            const csT = data.slice(10, 13); // compressed course/speed/type
            // Decode base91 latitude
            let latVal = 0;
            for (let i = 0; i < 4; i++) {
                latVal = latVal * 91 + (latChars.charCodeAt(i) - 33);
            }
            const latitude = 90 - latVal / 380926;
            // Decode base91 longitude
            let lonVal = 0;
            for (let i = 0; i < 4; i++) {
                lonVal = lonVal * 91 + (lonChars.charCodeAt(i) - 33);
            }
            const longitude = -180 + lonVal / 190463;
            // Validate
            if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180)
                return null;
            let speed = null;
            let course = null;
            let altitude = null;
            // Parse compressed course/speed if present
            if (csT.length >= 2) {
                const c = csT.charCodeAt(0) - 33;
                const s = csT.charCodeAt(1) - 33;
                const t = csT.length > 2 ? csT.charCodeAt(2) - 33 : 0;
                // Check compression type in 't'
                const compressionType = (t >> 3) & 0x03;
                if (compressionType === 0 && c >= 0 && c < 90) {
                    // Course/speed
                    course = c * 4;
                    speed = Math.pow(1.08, s) - 1; // knots
                    speed = speed * 1.852; // to km/h
                }
                else if (compressionType === 2) {
                    // Altitude
                    altitude = Math.pow(1.002, c * 91 + s); // feet
                    altitude = altitude * 0.3048; // to meters
                }
            }
            const comment = data.length > 13 ? data.slice(13).trim() || null : null;
            return { latitude, longitude, symbol, symbolTable, comment, speed, course, altitude };
        }
        catch {
            return null;
        }
    }
    async persistToRedis() {
        const stationsArray = Array.from(this.stations.values())
            .sort((a, b) => b.lastHeard - a.lastHeard)
            .slice(0, 5000); // Limit to 5000 most recent stations
        await storeData(this.config.redisKey, stationsArray, this.config.ttlSeconds);
        this.logger.debug(`Persisted ${stationsArray.length} APRS stations to Redis`);
    }
    cleanOldStations() {
        const oneHourAgo = Date.now() - 60 * 60 * 1000;
        let removed = 0;
        for (const [callsign, station] of this.stations) {
            if (station.lastHeard < oneHourAgo) {
                this.stations.delete(callsign);
                removed++;
            }
        }
        if (removed > 0) {
            this.logger.debug(`Cleaned ${removed} old APRS stations`);
        }
    }
}
//# sourceMappingURL=aprs.js.map