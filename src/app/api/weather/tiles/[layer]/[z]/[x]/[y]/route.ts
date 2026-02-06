import { NextResponse } from "next/server";
import { env } from "@/lib/env";

// Valid OpenWeatherMap tile layers
const VALID_LAYERS = new Set([
  "precipitation_new",
  "clouds_new",
  "pressure_new",
  "wind_new",
  "temp_new",
]);

// Cache tiles for 10 minutes (OWM updates every ~10 min)
const CACHE_TTL = 10 * 60;

type RouteParams = {
  params: Promise<{
    layer: string;
    z: string;
    x: string;
    y: string;
  }>;
};

export async function GET(
  _request: Request,
  { params }: RouteParams
): Promise<NextResponse> {
  const { layer, z, x, y } = await params;

  // Validate layer
  if (!VALID_LAYERS.has(layer)) {
    return NextResponse.json(
      { error: "Invalid layer" },
      { status: 400 }
    );
  }

  // Validate tile coordinates are integers
  const zNum = parseInt(z, 10);
  const xNum = parseInt(x, 10);
  const yNum = parseInt(y, 10);

  if (isNaN(zNum) || isNaN(xNum) || isNaN(yNum)) {
    return NextResponse.json(
      { error: "Invalid tile coordinates" },
      { status: 400 }
    );
  }

  // Check API key is configured
  const apiKey = env.OPENWEATHERMAP_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Weather service not configured" },
      { status: 503 }
    );
  }

  try {
    // Fetch tile from OpenWeatherMap
    const tileUrl = `https://tile.openweathermap.org/map/${layer}/${zNum}/${xNum}/${yNum}.png?appid=${apiKey}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(tileUrl, {
      signal: controller.signal,
      headers: {
        "Accept": "image/png",
      },
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.error(`[weather/tiles] OWM error: ${response.status}`);
      return NextResponse.json(
        { error: "Failed to fetch weather tile" },
        { status: 502 }
      );
    }

    // Stream the tile image back to client
    const imageBuffer = await response.arrayBuffer();

    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": `public, max-age=${CACHE_TTL}, stale-while-revalidate=${CACHE_TTL / 2}`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (message.includes("aborted")) {
      console.error("[weather/tiles] Request timeout");
      return NextResponse.json(
        { error: "Request timeout" },
        { status: 504 }
      );
    }

    console.error("[weather/tiles] Error:", message);
    return NextResponse.json(
      { error: "Failed to fetch weather tile" },
      { status: 500 }
    );
  }
}
