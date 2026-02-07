/**
 * Fetch utilities with timeout and retry support.
 */
export class FetchTimeoutError extends Error {
    constructor(url, timeoutMs) {
        super(`Request to ${url} timed out after ${timeoutMs}ms`);
        this.name = "FetchTimeoutError";
    }
}
export class FetchError extends Error {
    status;
    constructor(url, status, statusText) {
        super(`Request to ${url} failed: ${status} ${statusText}`);
        this.name = "FetchError";
        this.status = status;
    }
}
/**
 * Fetch with timeout support.
 */
export async function fetchWithTimeout(url, options = {}, timeoutMs = 30000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
        });
        if (!response.ok) {
            throw new FetchError(url, response.status, response.statusText);
        }
        return response;
    }
    catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
            throw new FetchTimeoutError(url, timeoutMs);
        }
        throw error;
    }
    finally {
        clearTimeout(timeoutId);
    }
}
/**
 * Fetch with retry support.
 */
export async function fetchWithRetry(url, options = {}, config = {}) {
    const { timeoutMs = 30000, retries = 3, retryDelayMs = 1000, shouldRetry = () => true, } = config;
    let lastError;
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            return await fetchWithTimeout(url, options, timeoutMs);
        }
        catch (error) {
            lastError = error;
            // Don't retry on 4xx errors
            if (error instanceof FetchError && error.status >= 400 && error.status < 500) {
                throw error;
            }
            // Check if we should retry
            if (attempt < retries && shouldRetry(error)) {
                const delay = retryDelayMs * Math.pow(2, attempt); // Exponential backoff
                await sleep(delay);
                continue;
            }
            throw error;
        }
    }
    throw lastError;
}
/**
 * Sleep for a given duration.
 */
export function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
//# sourceMappingURL=fetch.js.map