/**
 * Health check HTTP server for the worker.
 */
import type { Scheduler } from "./scheduler.js";
export interface HealthStatus {
    status: "healthy" | "degraded" | "unhealthy";
    uptime: number;
    redis: "connected" | "disconnected";
    scheduler: {
        running: boolean;
        jobs: Record<string, {
            lastRun: number;
            isRunning: boolean;
        }>;
    };
    collectors: Record<string, {
        status: string;
        lastRun: number;
        errorCount: number;
    }>;
}
export declare function startHealthServer(port: number, scheduler: Scheduler): void;
export declare function stopHealthServer(): void;
//# sourceMappingURL=health.d.ts.map