/**
 * Simple server-side in-memory cache.
 *
 * Uses `globalThis` to survive HMR in development.
 * Each entry has a TTL — stale entries are replaced on next request.
 */

type CacheEntry<T> = {
  data: T;
  fetchedAt: number;
};

const globalForCache = globalThis as unknown as {
  __serverCache?: Map<string, CacheEntry<unknown>>;
};

function getStore(): Map<string, CacheEntry<unknown>> {
  if (!globalForCache.__serverCache) {
    globalForCache.__serverCache = new Map();
  }
  return globalForCache.__serverCache;
}

/**
 * Fetch data with server-side caching.
 *
 * @param key   Unique cache key (e.g. "seismic:all_day")
 * @param ttlMs How long the cached value stays fresh
 * @param fetcher  Async function that produces the data
 * @returns The cached or freshly-fetched data
 */
export async function cachedFetch<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  const store = getStore();
  const entry = store.get(key) as CacheEntry<T> | undefined;

  if (entry && Date.now() - entry.fetchedAt < ttlMs) {
    return entry.data;
  }

  const data = await fetcher();
  store.set(key, { data, fetchedAt: Date.now() });
  return data;
}
