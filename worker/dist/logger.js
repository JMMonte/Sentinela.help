/**
 * Simple structured logger for the worker.
 */
const LOG_LEVELS = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};
let currentLevel = "info";
export function setLogLevel(level) {
    currentLevel = level;
}
function shouldLog(level) {
    return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}
function formatMessage(level, context, message, data) {
    const timestamp = new Date().toISOString();
    const base = `[${timestamp}] [${level.toUpperCase()}] [${context}] ${message}`;
    if (data && Object.keys(data).length > 0) {
        return `${base} ${JSON.stringify(data)}`;
    }
    return base;
}
export function createLogger(context) {
    return {
        debug(message, data) {
            if (shouldLog("debug")) {
                console.debug(formatMessage("debug", context, message, data));
            }
        },
        info(message, data) {
            if (shouldLog("info")) {
                console.info(formatMessage("info", context, message, data));
            }
        },
        warn(message, data) {
            if (shouldLog("warn")) {
                console.warn(formatMessage("warn", context, message, data));
            }
        },
        error(message, error, data) {
            if (shouldLog("error")) {
                const errorData = {
                    ...data,
                    ...(error instanceof Error
                        ? { errorMessage: error.message, stack: error.stack }
                        : { error: String(error) }),
                };
                console.error(formatMessage("error", context, message, errorData));
            }
        },
    };
}
//# sourceMappingURL=logger.js.map