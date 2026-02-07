import { NextResponse, type NextRequest } from "next/server";
import { getFromRedis } from "@/lib/redis-cache";
import { validateInt, validateFloat } from "@/lib/api-utils";

/**
 * GET /api/seismic?hours=24&minMag=2.5
 *
 * Returns earthquake data from Redis cache (populated by worker).
 */

type SeismicData = {
  features: { properties: { mag: number; time: number } }[];
  [key: string]: unknown;
};

export async function GET(request: NextRequest) {
  // Validate input parameters
  const hoursResult = validateInt(
    request.nextUrl.searchParams.get("hours"),
    24,
    1,
    744
  );
  if (!hoursResult.success) {
    return NextResponse.json({ error: hoursResult.error }, { status: 400 });
  }
  const hours = hoursResult.value;

  const minMagResult = validateFloat(
    request.nextUrl.searchParams.get("minMag"),
    2.5,
    0,
    10
  );
  if (!minMagResult.success) {
    return NextResponse.json({ error: minMagResult.error }, { status: 400 });
  }
  const minMag = minMagResult.value;

  const feedKey = hours <= 24 ? "day" : hours <= 168 ? "week" : "month";

  try {
    const data = await getFromRedis<SeismicData>(`kaos:seismic:${feedKey}`);

    if (!data) {
      return NextResponse.json(
        { error: "Earthquake data unavailable - worker may not be running" },
        { status: 503 }
      );
    }

    // Filter by magnitude and time on every request (user-specific params)
    const cutoff = Date.now() - hours * 60 * 60 * 1000;
    const features = data.features.filter(
      (f) => f.properties.mag >= minMag && f.properties.time >= cutoff
    );

    return NextResponse.json(
      { ...data, features },
      { headers: { "Cache-Control": "no-cache" } }
    );
  } catch (error) {
    console.error("[seismic] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch earthquake data" },
      { status: 500 }
    );
  }
}
