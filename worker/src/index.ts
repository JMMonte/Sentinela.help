/**
 * Kaos Worker - Background Data Collection Service
 *
 * This worker continuously collects data from external APIs
 * and stores it in Upstash Redis for the main application to consume.
 */

import "dotenv/config";
import { loadConfig, COLLECTOR_CONFIGS } from "./config.js";
import { initRedis } from "./redis.js";
import { Scheduler } from "./scheduler.js";
import { startHealthServer, stopHealthServer } from "./health.js";
import { setLogLevel, createLogger } from "./logger.js";

// Import collectors
import { SeismicCollector } from "./collectors/seismic.js";
import { SpaceWeatherCollector } from "./collectors/space-weather.js";
// AuroraCollector migrated to JSON: src/sources/aurora.json
import { TecCollector } from "./collectors/tec.js";
import { KiwiSdrCollector } from "./collectors/kiwisdr.js";
import { ProcivCollector } from "./collectors/prociv.js";
import { GdacsCollector } from "./collectors/gdacs.js";
// WarningsCollector migrated to JSON: src/sources/warnings.json
import { LightningCollector } from "./collectors/lightning.js";
import { AprsCollector } from "./collectors/aprs.js";
import { GfsCollector } from "./collectors/gfs.js";
import { OceanCurrentsCollector } from "./collectors/ocean-currents.js";
import { WavesCollector } from "./collectors/waves.js";
import { SstCollector } from "./collectors/sst.js";
import { AircraftCollector } from "./collectors/aircraft.js";
import { GenericSourceCollector, loadSourceConfigs } from "./collectors/generic-source.js";

const logger = createLogger("main");

async function main(): Promise<void> {
  logger.info("Starting Kaos Worker...");

  // Load configuration
  const config = loadConfig();
  setLogLevel(config.WORKER_LOG_LEVEL);

  // Initialize Redis
  initRedis(config);

  // Create scheduler
  const scheduler = new Scheduler();

  // Register collectors based on config
  if (!config.DISABLE_SEISMIC) {
    scheduler.register(new SeismicCollector(), COLLECTOR_CONFIGS.seismic.intervalMs);
  }

  if (!config.DISABLE_SPACE_WEATHER) {
    scheduler.register(new SpaceWeatherCollector(), COLLECTOR_CONFIGS.spaceWeather.intervalMs);
  }

  // Aurora: migrated to JSON (src/sources/aurora.json)

  if (!config.DISABLE_TEC) {
    scheduler.register(new TecCollector(), COLLECTOR_CONFIGS.tec.intervalMs);
  }

  if (!config.DISABLE_KIWISDR) {
    scheduler.register(new KiwiSdrCollector(), COLLECTOR_CONFIGS.kiwisdr.intervalMs);
  }

  if (!config.DISABLE_PROCIV) {
    scheduler.register(new ProcivCollector(), COLLECTOR_CONFIGS.prociv.intervalMs);
  }

  if (!config.DISABLE_GDACS) {
    scheduler.register(new GdacsCollector(), COLLECTOR_CONFIGS.gdacs.intervalMs);
  }

  // Warnings: migrated to JSON (src/sources/warnings.json)

  if (!config.DISABLE_LIGHTNING) {
    scheduler.registerWebSocket(new LightningCollector());
  }

  if (!config.DISABLE_APRS) {
    scheduler.registerWebSocket(new AprsCollector());
  }

  // GFS weather overlays (wind, temperature, humidity, precipitation, clouds, CAPE, UV)
  if (!config.DISABLE_GFS) {
    scheduler.register(new GfsCollector(), COLLECTOR_CONFIGS.gfs.intervalMs);
  }

  // Ocean data collectors
  if (!config.DISABLE_OCEAN) {
    scheduler.register(new OceanCurrentsCollector(), COLLECTOR_CONFIGS.oceanCurrents.intervalMs);
    scheduler.register(new WavesCollector(), COLLECTOR_CONFIGS.waves.intervalMs);
    scheduler.register(new SstCollector(), COLLECTOR_CONFIGS.sst.intervalMs);
  }

  // Aircraft tracking (OpenSky Network with OAuth)
  if (!config.DISABLE_AIRCRAFT) {
    scheduler.register(new AircraftCollector(config), COLLECTOR_CONFIGS.aircraft.intervalMs);
  }

  // Auto-register JSON-defined sources from /sources directory
  const sourceConfigs = loadSourceConfigs();
  for (const sourceConfig of sourceConfigs) {
    const collector = new GenericSourceCollector(sourceConfig);
    scheduler.register(collector, collector.intervalMs);
    logger.info(`Registered source: ${sourceConfig.name}`);
  }

  // Start health server
  startHealthServer(config.WORKER_HEALTH_PORT, scheduler);

  // Start scheduler
  await scheduler.start();

  logger.info("Kaos Worker started successfully");

  // Handle graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down...`);
    scheduler.stop();
    stopHealthServer();
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  // Keep the process running
  await new Promise(() => {});
}

main().catch((error) => {
  logger.error("Fatal error", error);
  process.exit(1);
});
