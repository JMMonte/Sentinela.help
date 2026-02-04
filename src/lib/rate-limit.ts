/**
 * Simple in-memory rate limiter using sliding window.
 * For production with multiple servers, consider using Redis.
 */

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const limiters = new Map<string, Map<string, RateLimitEntry>>();

export type RateLimitConfig = {
  /** Unique identifier for this rate limiter (e.g., "reports", "contributions") */
  name: string;
  /** Maximum requests allowed in the window */
  maxRequests: number;
  /** Window duration in milliseconds */
  windowMs: number;
};

export type RateLimitResult = {
  success: boolean;
  remaining: number;
  resetAt: number;
};

/**
 * Check if a request should be rate limited.
 * @param key - Unique identifier for the client (e.g., IP address)
 * @param config - Rate limit configuration
 * @returns Result indicating if request is allowed and remaining quota
 */
export function checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();

  // Get or create limiter for this config
  if (!limiters.has(config.name)) {
    limiters.set(config.name, new Map());
  }
  const limiter = limiters.get(config.name)!;

  // Get or create entry for this key
  let entry = limiter.get(key);

  if (!entry || now >= entry.resetAt) {
    // Window expired or new entry - reset
    entry = {
      count: 0,
      resetAt: now + config.windowMs,
    };
    limiter.set(key, entry);
  }

  // Check if over limit
  if (entry.count >= config.maxRequests) {
    return {
      success: false,
      remaining: 0,
      resetAt: entry.resetAt,
    };
  }

  // Increment count and allow request
  entry.count++;
  return {
    success: true,
    remaining: config.maxRequests - entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * Get client IP from request headers.
 * Handles common proxy headers (X-Forwarded-For, X-Real-IP).
 */
export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    // X-Forwarded-For can contain multiple IPs; take the first one
    return forwardedFor.split(",")[0].trim();
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  // Fallback - this won't work in production but helps with local dev
  return "unknown";
}

// Clean up old entries periodically (every 5 minutes)
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const limiter of limiters.values()) {
      for (const [key, entry] of limiter.entries()) {
        if (now >= entry.resetAt) {
          limiter.delete(key);
        }
      }
    }
  }, 5 * 60 * 1000);
}
