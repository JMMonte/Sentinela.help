import { NextResponse, type NextRequest } from "next/server";
import { cachedFetch } from "@/lib/server-cache";

/**
 * GET /api/prociv?hours=8
 *
 * Proxies Fogos.pt active + search endpoints with server-side caching.
 * Cache TTL: 1 min (ProCiv data changes rapidly during incidents).
 */

const CACHE_TTL = 60 * 1000;

const FOGOS_ACTIVE_URL = "https://api.fogos.pt/v2/incidents/active";
const FOGOS_SEARCH_URL = "https://api.fogos.pt/v2/incidents/search";

type FogosResponse = {
  success: boolean;
  data: { id: string; dateTime: { sec: number }; [key: string]: unknown }[];
};

export async function GET(request: NextRequest) {
  const hours = Math.max(1, Math.min(Number(request.nextUrl.searchParams.get("hours") ?? "8"), 168));
  const cutoff = Date.now() - hours * 60 * 60 * 1000;
  const since = new Date(cutoff);
  const after = `${since.getFullYear()}-${String(since.getMonth() + 1).padStart(2, "0")}-${String(since.getDate()).padStart(2, "0")}`;

  try {
    // Cache each endpoint separately (active changes more than search)
    const [activeData, searchData] = await Promise.all([
      cachedFetch<FogosResponse>(
        "prociv:active",
        CACHE_TTL,
        async () => {
          const res = await fetch(FOGOS_ACTIVE_URL, { cache: "no-store" });
          if (!res.ok) return { success: false, data: [] };
          return res.json();
        },
      ),
      cachedFetch<FogosResponse>(
        `prociv:search:${after}`,
        CACHE_TTL,
        async () => {
          const res = await fetch(`${FOGOS_SEARCH_URL}?after=${after}&limit=100`, { cache: "no-store" });
          if (!res.ok) return { success: false, data: [] };
          return res.json();
        },
      ),
    ]);

    // Merge and deduplicate (active takes priority)
    const byId = new Map<string, unknown>();
    if (searchData.success) {
      for (const i of searchData.data) {
        if (i.dateTime.sec * 1000 >= cutoff) {
          byId.set(i.id, i);
        }
      }
    }
    if (activeData.success) {
      for (const i of activeData.data) {
        byId.set(i.id, i);
      }
    }

    return NextResponse.json(
      { success: true, data: Array.from(byId.values()) },
      { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=30" } },
    );
  } catch (error) {
    console.error("[prociv] proxy error:", error);
    return NextResponse.json({ error: "Failed to fetch ProCiv data" }, { status: 502 });
  }
}
