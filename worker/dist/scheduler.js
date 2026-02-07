/**
 * Job scheduler for running collectors at specified intervals.
 */
import { createLogger } from "./logger.js";
const logger = createLogger("scheduler");
export class Scheduler {
    jobs = new Map();
    wsCollectors = [];
    running = false;
    checkIntervalId;
    /**
     * Register a polling-based collector.
     */
    register(collector, intervalMs) {
        this.jobs.set(collector.name, {
            collector,
            intervalMs,
            lastRun: 0,
            isRunning: false,
        });
        logger.info(`Registered collector: ${collector.name}`, { intervalMs });
    }
    /**
     * Register a WebSocket-based collector.
     */
    registerWebSocket(collector) {
        this.wsCollectors.push(collector);
        logger.info(`Registered WebSocket collector: ${collector.name}`);
    }
    /**
     * Start the scheduler.
     */
    async start() {
        if (this.running) {
            logger.warn("Scheduler already running");
            return;
        }
        this.running = true;
        logger.info("Starting scheduler", {
            pollingCollectors: this.jobs.size,
            wsCollectors: this.wsCollectors.length,
        });
        // Start WebSocket collectors
        for (const wsCollector of this.wsCollectors) {
            try {
                await wsCollector.start();
            }
            catch (error) {
                logger.error(`Failed to start WebSocket collector: ${wsCollector.name}`, error);
            }
        }
        // Run all polling jobs immediately
        await this.runAllJobs();
        // Start the check loop
        this.checkIntervalId = setInterval(() => this.checkJobs(), 1000);
    }
    /**
     * Stop the scheduler.
     */
    stop() {
        this.running = false;
        // Clear check interval
        if (this.checkIntervalId) {
            clearInterval(this.checkIntervalId);
            this.checkIntervalId = undefined;
        }
        // Clear all job timeouts
        for (const job of this.jobs.values()) {
            if (job.timeoutId) {
                clearTimeout(job.timeoutId);
            }
        }
        // Stop WebSocket collectors
        for (const wsCollector of this.wsCollectors) {
            wsCollector.stop();
        }
        logger.info("Scheduler stopped");
    }
    /**
     * Run all jobs immediately (for startup).
     */
    async runAllJobs() {
        const promises = [];
        for (const [name, job] of this.jobs) {
            promises.push(this.runJob(name, job));
        }
        // Wait for all initial runs to complete
        await Promise.allSettled(promises);
    }
    /**
     * Check if any jobs need to run.
     */
    checkJobs() {
        if (!this.running)
            return;
        const now = Date.now();
        for (const [name, job] of this.jobs) {
            // Skip if already running or not enough time has passed
            if (job.isRunning || now - job.lastRun < job.intervalMs) {
                continue;
            }
            // Run the job (fire and forget, don't await)
            this.runJob(name, job).catch((error) => {
                logger.error(`Unexpected error in job ${name}`, error);
            });
        }
    }
    /**
     * Run a single job.
     */
    async runJob(name, job) {
        job.isRunning = true;
        job.lastRun = Date.now();
        try {
            await job.collector.run();
        }
        catch (error) {
            logger.error(`Job ${name} failed`, error);
        }
        finally {
            job.isRunning = false;
        }
    }
    /**
     * Get scheduler status for health check.
     */
    getStatus() {
        const jobs = {};
        for (const [name, job] of this.jobs) {
            jobs[name] = {
                lastRun: job.lastRun,
                isRunning: job.isRunning,
                intervalMs: job.intervalMs,
            };
        }
        return {
            running: this.running,
            jobs,
            wsCollectors: this.wsCollectors.map((c) => c.name),
        };
    }
}
//# sourceMappingURL=scheduler.js.map