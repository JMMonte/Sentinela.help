import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db/prisma";
import { env } from "@/lib/env";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { createContributionFieldsSchema } from "@/lib/reports/validation";
import { isAllowedImageMimeType, saveImage } from "@/lib/uploads";
import { fetchWeatherSnapshotServer } from "@/lib/overlays/weather-api";

export const runtime = "nodejs";

// Rate limit: 20 contributions per 15 minutes per IP
const CONTRIBUTION_RATE_LIMIT = {
  name: "create-contribution",
  maxRequests: 20,
  windowMs: 15 * 60 * 1000, // 15 minutes
};

function nullIfEmpty(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  // Check rate limit
  const clientIp = getClientIp(request);
  const rateLimit = checkRateLimit(clientIp, CONTRIBUTION_RATE_LIMIT);

  if (!rateLimit.success) {
    return NextResponse.json(
      { error: "Too many contributions. Please try again later." },
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
    const { id: reportId } = await params;

    // Verify report exists (include coords for weather snapshot)
    const report = await prisma.report.findUnique({
      where: { id: reportId },
      select: { id: true, latitude: true, longitude: true },
    });

    if (!report) {
      return NextResponse.json({ error: "Report not found." }, { status: 404 });
    }

    const formData = await request.formData();

    const fields = createContributionFieldsSchema.parse({
      type: formData.get("type") || "COMMENT",
      comment: formData.get("comment"),
      contributorEmail: formData.get("contributorEmail"),
    });

    const images = formData.getAll("images");
    const contributionType = fields.type ?? "COMMENT";

    // For action types (ESCALATE, DEESCALATE, SOLVED), no content required
    const isActionType = contributionType !== "COMMENT";
    const hasComment = !!nullIfEmpty(fields.comment);
    const hasImages = images.length > 0;

    if (!isActionType && !hasComment && !hasImages) {
      return NextResponse.json(
        { error: "Provide a comment or at least one image." },
        { status: 400 },
      );
    }

    // Validate images if provided
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

    // Store images and fetch weather in parallel
    const [storedImages, weatherSnapshot] = await Promise.all([
      Promise.all(files.map((file) => saveImage(file))),
      env.OPENWEATHERMAP_API_KEY
        ? fetchWeatherSnapshotServer(report.latitude, report.longitude, env.OPENWEATHERMAP_API_KEY)
        : Promise.resolve(null),
    ]);

    // Determine new report status and score updates based on contribution type
    let newReportStatus: "NEW" | "NOTIFIED" | "CLOSED" | null = null;
    let scoreUpdate: { escalateCount?: { increment: number }; deescalateCount?: { increment: number } } = {};

    if (contributionType === "ESCALATE") {
      newReportStatus = "NOTIFIED";
      scoreUpdate = { escalateCount: { increment: 1 } };
    } else if (contributionType === "DEESCALATE") {
      newReportStatus = "NEW";
      scoreUpdate = { deescalateCount: { increment: 1 } };
    } else if (contributionType === "SOLVED") {
      newReportStatus = "CLOSED";
    } else if (contributionType === "REOPEN") {
      newReportStatus = "NEW";
    }

    // Build report update data
    const reportUpdateData: Record<string, unknown> = { ...scoreUpdate };
    if (newReportStatus) {
      reportUpdateData.status = newReportStatus;
    }
    const needsReportUpdate = Object.keys(reportUpdateData).length > 0;

    // Create contribution and optionally update report in a transaction
    const [contribution] = await prisma.$transaction([
      prisma.contribution.create({
        data: {
          reportId,
          type: contributionType,
          comment: nullIfEmpty(fields.comment),
          contributorEmail: nullIfEmpty(fields.contributorEmail),
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
      }),
      ...(needsReportUpdate
        ? [prisma.report.update({ where: { id: reportId }, data: reportUpdateData })]
        : []),
    ]);

    return NextResponse.json({
      contribution: {
        id: contribution.id,
        createdAt: contribution.createdAt.toISOString(),
        type: contribution.type,
        contributorEmail: contribution.contributorEmail,
        comment: contribution.comment,
        images: contribution.images,
      },
      reportStatus: newReportStatus,
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.issues[0]?.message ?? "Invalid input." }, { status: 400 });
    }

    return NextResponse.json({ error: "Unexpected error." }, { status: 500 });
  }
}
