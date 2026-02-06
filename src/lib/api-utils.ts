/**
 * Shared utilities for API routes.
 * Provides timeout handling, input validation, and error utilities.
 */

// ── Fetch with Timeout ──

export class FetchTimeoutError extends Error {
  constructor(message = "Request timeout") {
    super(message);
    this.name = "FetchTimeoutError";
  }
}

/**
 * Fetch with timeout support.
 * @param url - URL to fetch
 * @param options - Fetch options
 * @param timeoutMs - Timeout in milliseconds (default: 30000)
 */
export async function fetchWithTimeout(
  url: string,
  options?: RequestInit,
  timeoutMs: number = 30000
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new FetchTimeoutError(`Request timeout after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

// ── Input Validation ──

export type ValidationResult<T> =
  | { success: true; value: T }
  | { success: false; error: string };

/**
 * Parse and validate an integer from a string.
 * @param value - String value to parse
 * @param defaultValue - Default if value is null/undefined
 * @param min - Minimum allowed value (inclusive)
 * @param max - Maximum allowed value (inclusive)
 */
export function validateInt(
  value: string | null | undefined,
  defaultValue: number,
  min: number,
  max: number
): ValidationResult<number> {
  if (value == null || value === "") {
    return { success: true, value: defaultValue };
  }

  const parsed = parseInt(value, 10);

  if (isNaN(parsed)) {
    return { success: false, error: `Invalid integer: "${value}"` };
  }

  if (parsed < min || parsed > max) {
    return { success: false, error: `Value must be between ${min} and ${max}` };
  }

  return { success: true, value: parsed };
}

/**
 * Parse and validate a float from a string.
 * @param value - String value to parse
 * @param defaultValue - Default if value is null/undefined
 * @param min - Minimum allowed value (inclusive)
 * @param max - Maximum allowed value (inclusive)
 */
export function validateFloat(
  value: string | null | undefined,
  defaultValue: number,
  min: number,
  max: number
): ValidationResult<number> {
  if (value == null || value === "") {
    return { success: true, value: defaultValue };
  }

  const parsed = parseFloat(value);

  if (isNaN(parsed)) {
    return { success: false, error: `Invalid number: "${value}"` };
  }

  if (parsed < min || parsed > max) {
    return { success: false, error: `Value must be between ${min} and ${max}` };
  }

  return { success: true, value: parsed };
}

/**
 * Validate that a string is one of allowed values.
 * @param value - String value to validate
 * @param allowedValues - Set or array of allowed values
 * @param defaultValue - Default if value is null/undefined
 */
export function validateEnum<T extends string>(
  value: string | null | undefined,
  allowedValues: Set<T> | T[],
  defaultValue: T
): ValidationResult<T> {
  if (value == null || value === "") {
    return { success: true, value: defaultValue };
  }

  const allowed = allowedValues instanceof Set
    ? allowedValues
    : new Set(allowedValues);

  if (!allowed.has(value as T)) {
    const validOptions = Array.from(allowed).join(", ");
    return { success: false, error: `Invalid value. Must be one of: ${validOptions}` };
  }

  return { success: true, value: value as T };
}

// ── Error Response Helpers ──

export function createErrorResponse(message: string, status: number) {
  return { error: message, status };
}

/**
 * Extract a safe error message from an unknown error.
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof FetchTimeoutError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

/**
 * Determine appropriate HTTP status code for an error.
 */
export function getErrorStatus(error: unknown): number {
  if (error instanceof FetchTimeoutError) {
    return 504; // Gateway Timeout
  }
  // Check for fetch errors that indicate upstream issues
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes("fetch") || message.includes("network")) {
      return 502; // Bad Gateway
    }
  }
  return 500; // Internal Server Error
}
