/**
 * Health check HTTP server for the worker.
 */

import { createServer, type Server } from "http";
import { createLogger } from "./logger.js";
import { pingRedis, getAllCollectorStatuses } from "./redis.js";
import type { Scheduler } from "./scheduler.js";

const logger = createLogger("health");

export interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  uptime: number;
  redis: "connected" | "disconnected";
  scheduler: {
    running: boolean;
    jobs: Record<string, { lastRun: number; isRunning: boolean }>;
  };
  collectors: Record<string, { status: string; lastRun: number; errorCount: number }>;
}

let server: Server | null = null;
let startTime: number = Date.now();

export function startHealthServer(port: number, scheduler: Scheduler): void {
  startTime = Date.now();

  server = createServer(async (req, res) => {
    // CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Content-Type", "application/json");

    if (req.url === "/health" || req.url === "/") {
      try {
        const status = await getHealthStatus(scheduler);
        const httpCode =
          status.status === "healthy" ? 200 : status.status === "degraded" ? 200 : 500;

        res.writeHead(httpCode);
        res.end(JSON.stringify(status, null, 2));
      } catch (error) {
        logger.error("Health check failed", error);
        res.writeHead(500);
        res.end(JSON.stringify({ status: "unhealthy", error: "Health check failed" }));
      }
    } else if (req.url === "/ready") {
      // Simple readiness probe
      const redisOk = await pingRedis();
      res.writeHead(redisOk ? 200 : 503);
      res.end(redisOk ? "OK" : "NOT READY");
    } else if (req.url === "/live") {
      // Simple liveness probe
      res.writeHead(200);
      res.end("OK");
    } else {
      res.writeHead(404);
      res.end(JSON.stringify({ error: "Not Found" }));
    }
  });

  server.listen(port, () => {
    logger.info(`Health server listening on port ${port}`);
  });
}

export function stopHealthServer(): void {
  if (server) {
    server.close();
    server = null;
    logger.info("Health server stopped");
  }
}

async function getHealthStatus(scheduler: Scheduler): Promise<HealthStatus> {
  const [redisOk, collectorStatuses] = await Promise.all([
    pingRedis(),
    getAllCollectorStatuses(),
  ]);

  const schedulerStatus = scheduler.getStatus();

  // Determine overall status
  let status: HealthStatus["status"] = "healthy";

  if (!redisOk) {
    status = "unhealthy";
  } else {
    // Check collector statuses
    const collectorValues = Object.values(collectorStatuses);
    const errorCount = collectorValues.filter((c) => c.status === "error").length;
    const degradedCount = collectorValues.filter((c) => c.status === "degraded").length;

    if (errorCount > collectorValues.length / 2) {
      status = "unhealthy";
    } else if (errorCount > 0 || degradedCount > 0) {
      status = "degraded";
    }
  }

  return {
    status,
    uptime: Math.floor((Date.now() - startTime) / 1000),
    redis: redisOk ? "connected" : "disconnected",
    scheduler: {
      running: schedulerStatus.running,
      jobs: schedulerStatus.jobs,
    },
    collectors: collectorStatuses,
  };
}
