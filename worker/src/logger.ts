/**
 * Simple structured logger for the worker.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

let currentLevel: LogLevel = "info";

export function setLogLevel(level: LogLevel): void {
  currentLevel = level;
}

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}

function formatMessage(
  level: LogLevel,
  context: string,
  message: string,
  data?: Record<string, unknown>
): string {
  const timestamp = new Date().toISOString();
  const base = `[${timestamp}] [${level.toUpperCase()}] [${context}] ${message}`;

  if (data && Object.keys(data).length > 0) {
    return `${base} ${JSON.stringify(data)}`;
  }

  return base;
}

export function createLogger(context: string) {
  return {
    debug(message: string, data?: Record<string, unknown>): void {
      if (shouldLog("debug")) {
        console.debug(formatMessage("debug", context, message, data));
      }
    },

    info(message: string, data?: Record<string, unknown>): void {
      if (shouldLog("info")) {
        console.info(formatMessage("info", context, message, data));
      }
    },

    warn(message: string, data?: Record<string, unknown>): void {
      if (shouldLog("warn")) {
        console.warn(formatMessage("warn", context, message, data));
      }
    },

    error(message: string, error?: unknown, data?: Record<string, unknown>): void {
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

export type Logger = ReturnType<typeof createLogger>;
