import { NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const report = await prisma.report.findUnique({
      where: { id },
      include: {
        images: { select: { url: true } },
        contributions: {
          orderBy: { createdAt: "asc" },
          include: {
            images: { select: { url: true } },
          },
        },
      },
    });

    if (!report) return NextResponse.json({ report: null }, { status: 404 });

    return NextResponse.json({
      report: {
        id: report.id,
        createdAt: report.createdAt.toISOString(),
        type: report.type,
        status: report.status,
        latitude: report.latitude,
        longitude: report.longitude,
        address: report.address,
        description: report.description,
        reporterEmail: report.reporterEmail,
        images: report.images,
        score: report.escalateCount - report.deescalateCount,
        weatherSnapshot: report.weatherSnapshot,
        contributions: report.contributions.map((c) => ({
          id: c.id,
          createdAt: c.createdAt.toISOString(),
          type: c.type,
          contributorEmail: c.contributorEmail,
          comment: c.comment,
          images: c.images,
          weatherSnapshot: c.weatherSnapshot,
        })),
      },
    });
  } catch {
    return NextResponse.json({ error: "Unable to load report." }, { status: 500 });
  }
}
