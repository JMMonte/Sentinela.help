/**
 * Job scheduler for running collectors at specified intervals.
 */
import type { BaseCollector, WebSocketCollector } from "./collectors/base-collector.js";
export declare class Scheduler {
    private jobs;
    private wsCollectors;
    private running;
    private checkIntervalId?;
    /**
     * Register a polling-based collector.
     */
    register(collector: BaseCollector, intervalMs: number): void;
    /**
     * Register a WebSocket-based collector.
     */
    registerWebSocket(collector: WebSocketCollector): void;
    /**
     * Start the scheduler.
     */
    start(): Promise<void>;
    /**
     * Stop the scheduler.
     */
    stop(): void;
    /**
     * Run all jobs immediately (for startup).
     */
    private runAllJobs;
    /**
     * Check if any jobs need to run.
     */
    private checkJobs;
    /**
     * Run a single job.
     */
    private runJob;
    /**
     * Get scheduler status for health check.
     */
    getStatus(): {
        running: boolean;
        jobs: Record<string, {
            lastRun: number;
            isRunning: boolean;
            intervalMs: number;
        }>;
        wsCollectors: string[];
    };
}
//# sourceMappingURL=scheduler.d.ts.map