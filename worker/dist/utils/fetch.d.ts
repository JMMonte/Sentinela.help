/**
 * Fetch utilities with timeout and retry support.
 */
export declare class FetchTimeoutError extends Error {
    constructor(url: string, timeoutMs: number);
}
export declare class FetchError extends Error {
    status: number;
    constructor(url: string, status: number, statusText: string);
}
/**
 * Fetch with timeout support.
 */
export declare function fetchWithTimeout(url: string, options?: RequestInit, timeoutMs?: number): Promise<Response>;
/**
 * Fetch with retry support.
 */
export declare function fetchWithRetry(url: string, options?: RequestInit, config?: {
    timeoutMs?: number;
    retries?: number;
    retryDelayMs?: number;
    shouldRetry?: (error: unknown) => boolean;
}): Promise<Response>;
/**
 * Sleep for a given duration.
 */
export declare function sleep(ms: number): Promise<void>;
//# sourceMappingURL=fetch.d.ts.map