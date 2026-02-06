import { NextResponse } from "next/server";
import { z } from "zod";

import { reverseGeocode, type ReverseGeocodeResult } from "@/lib/geocoding/nominatim";
import { composeNotificationDraft } from "@/lib/government/notification-draft";
import { resolveGovernmentContact } from "@/lib/government/resolve-contact";
import { prisma } from "@/lib/db/prisma";
import { env } from "@/lib/env";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { createReportFieldsSchema } from "@/lib/reports/validation";
import { isAllowedImageMimeType, saveImage } from "@/lib/uploads";
import { fetchWeatherSnapshotServer } from "@/lib/overlays/weather-api";

export const runtime = "nodejs";

// Rate limit: 5 reports per 15 minutes per IP
const REPORT_RATE_LIMIT = {
  name: "create-report",
  maxRequests: 5,
  windowMs: 15 * 60 * 1000, // 15 minutes
};

function nullIfEmpty(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const limit = z.coerce
      .number()
      .int()
      .min(1)
      .max(500)
      .catch(200)
      .parse(url.searchParams.get("limit"));

    const reports = await prisma.report.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        type: true,
        status: true,
        latitude: true,
        longitude: true,
        createdAt: true,
        description: true,
        escalateCount: true,
        deescalateCount: true,
        images: {
          take: 1,
          select: { url: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    return NextResponse.json({
      reports: reports.map((r) => ({
        id: r.id,
        type: r.type,
        status: r.status,
        latitude: r.latitude,
        longitude: r.longitude,
        createdAt: r.createdAt.toISOString(),
        description: r.description,
        imageUrl: r.images[0]?.url ?? null,
        score: r.escalateCount - r.deescalateCount,
      })),
    });
  } catch {
    return NextResponse.json({ error: "Unable to load reports." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  // Check rate limit
  const clientIp = getClientIp(request);
  const rateLimit = checkRateLimit(clientIp, REPORT_RATE_LIMIT);

  if (!rateLimit.success) {
    return NextResponse.json(
      { error: "Too many reports. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(rateLimit.resetAt),
        },
      },
    );
  }

  try {
    const formData = await request.formData();

    const fields = createReportFieldsSchema.parse({
      type: formData.get("type"),
      description: formData.get("description"),
      reporterEmail: formData.get("reporterEmail"),
      latitude: formData.get("latitude"),
      longitude: formData.get("longitude"),
    });

    const images = formData.getAll("images");
    if (images.length === 0) {
      return NextResponse.json({ error: "Attach at least one image." }, { status: 400 });
    }

    if (images.length > env.MAX_UPLOAD_IMAGES) {
      return NextResponse.json(
        { error: `Attach up to ${env.MAX_UPLOAD_IMAGES} images.` },
        { status: 400 },
      );
    }

    const files: File[] = [];
    for (const value of images) {
      if (!(value instanceof File)) {
        return NextResponse.json({ error: "Invalid image upload." }, { status: 400 });
      }
      if (!isAllowedImageMimeType(value.type)) {
        return NextResponse.json(
          { error: `Unsupported image type: ${value.type}` },
          { status: 400 },
        );
      }
      files.push(value);
    }

    const storedImages = await Promise.all(files.map((file) => saveImage(file)));

    // Fetch geocode and weather in parallel (both non-blocking)
    let address: string | null = null;
    let geocode: ReverseGeocodeResult | null = null;
    const weatherPromise = env.OPENWEATHERMAP_API_KEY
      ? fetchWeatherSnapshotServer(fields.latitude, fields.longitude, env.OPENWEATHERMAP_API_KEY)
      : Promise.resolve(null);

    try {
      geocode = await reverseGeocode({
        latitude: fields.latitude,
        longitude: fields.longitude,
      });
      address = geocode?.displayName ?? null;
    } catch {
      address = null;
    }

    const weatherSnapshot = await weatherPromise;

    const report = await prisma.report.create({
      data: {
        type: fields.type,
        description: nullIfEmpty(fields.description),
        reporterEmail: nullIfEmpty(fields.reporterEmail),
        latitude: fields.latitude,
        longitude: fields.longitude,
        address,
        weatherSnapshot: weatherSnapshot ?? undefined,
        images: {
          create: storedImages.map((image) => ({
            url: image.url,
            mimeType: image.mimeType,
            bytes: image.bytes,
          })),
        },
      },
      include: {
        images: { select: { url: true } },
      },
    });

    const government = await resolveGovernmentContact(geocode);
    const notificationDraft = composeNotificationDraft({
      id: report.id,
      createdAt: report.createdAt,
      type: report.type,
      latitude: report.latitude,
      longitude: report.longitude,
      address: report.address,
      description: report.description,
      reporterEmail: report.reporterEmail,
      images: report.images,
    }, { to: government.email });

    return NextResponse.json({
      report: {
        id: report.id,
        createdAt: report.createdAt.toISOString(),
        type: report.type,
        latitude: report.latitude,
        longitude: report.longitude,
        address: report.address,
        images: report.images,
      },
      government,
      notificationDraft,
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.issues[0]?.message ?? "Invalid input." }, { status: 400 });
    }

    return NextResponse.json({ error: "Unexpected error." }, { status: 500 });
  }
}
