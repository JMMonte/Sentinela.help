import { NextResponse } from "next/server";
import { cachedFetch } from "@/lib/server-cache";

/**
 * GET /api/warnings
 *
 * Proxies IPMA weather warnings with server-side caching.
 * Cache TTL: 10 min (IPMA updates warnings every ~30 min).
 */

const CACHE_TTL = 10 * 60 * 1000;

const WARNINGS_URL = "https://api.ipma.pt/open-data/forecast/warnings/warnings_www.json";

export async function GET() {
  try {
    const data = await cachedFetch(
      "warnings:ipma",
      CACHE_TTL,
      async () => {
        const res = await fetch(WARNINGS_URL, { cache: "no-store" });
        if (!res.ok) throw new Error(`IPMA warnings error: ${res.status}`);
        return res.json();
      },
    );

    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, max-age=600, stale-while-revalidate=300" },
    });
  } catch (error) {
    console.error("[warnings] proxy error:", error);
    return NextResponse.json({ error: "Failed to fetch warnings" }, { status: 502 });
  }
}
