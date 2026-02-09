/**
 * KiwiSDR Proxy Worker
 *
 * Proxies requests to http://kiwisdr.com/.public/ which only supports HTTP.
 * This allows HTTPS clients (like Railway) to access the data.
 */

export interface Env {
  UPSTREAM_URL: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Only allow GET requests
    if (request.method !== "GET") {
      return new Response("Method not allowed", { status: 405 });
    }

    // Simple rate limiting via cache
    const cacheKey = new Request(env.UPSTREAM_URL, request);
    const cache = caches.default;

    // Check cache first (cache for 5 minutes to reduce load on upstream)
    let response = await cache.match(cacheKey);
    if (response) {
      return new Response(response.body, {
        status: response.status,
        headers: {
          ...Object.fromEntries(response.headers),
          "X-Cache": "HIT",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    try {
      // Fetch from upstream
      const upstreamResponse = await fetch(env.UPSTREAM_URL, {
        headers: {
          "User-Agent": "Kaos-Worker/1.0 (KiwiSDR-Proxy)",
          "Accept": "text/html",
        },
      });

      if (!upstreamResponse.ok) {
        return new Response(`Upstream error: ${upstreamResponse.status}`, {
          status: 502,
        });
      }

      // Clone response for caching
      const responseBody = await upstreamResponse.text();

      response = new Response(responseBody, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "public, max-age=300", // 5 minutes
          "X-Cache": "MISS",
          "Access-Control-Allow-Origin": "*",
        },
      });

      // Store in cache (don't await - fire and forget)
      const cacheResponse = new Response(responseBody, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "public, max-age=300",
        },
      });
      await cache.put(cacheKey, cacheResponse);

      return response;
    } catch (error) {
      return new Response(`Proxy error: ${error instanceof Error ? error.message : "Unknown error"}`, {
        status: 502,
      });
    }
  },
};
