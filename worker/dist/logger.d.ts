/**
 * Simple structured logger for the worker.
 */
export type LogLevel = "debug" | "info" | "warn" | "error";
export declare function setLogLevel(level: LogLevel): void;
export declare function createLogger(context: string): {
    debug(message: string, data?: Record<string, unknown>): void;
    info(message: string, data?: Record<string, unknown>): void;
    warn(message: string, data?: Record<string, unknown>): void;
    error(message: string, error?: unknown, data?: Record<string, unknown>): void;
};
export type Logger = ReturnType<typeof createLogger>;
//# sourceMappingURL=logger.d.ts.map