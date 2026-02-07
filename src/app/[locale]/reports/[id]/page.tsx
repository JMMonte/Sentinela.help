import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import Link from "next/link";

import { prisma } from "@/lib/db/prisma";
import { locales } from "@/i18n/config";
import {
  IncidentReportJsonLd,
  BreadcrumbJsonLd,
} from "@/components/seo/json-ld";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

const BASE_URL = "https://sentinela.help";

// Map incident types to translation keys
const incidentTypeLabels: Record<string, string> = {
  FLOOD: "FLOOD",
  FIRE: "FIRE",
  EXPLOSION: "EXPLOSION",
  EARTHQUAKE: "EARTHQUAKE",
  LANDSLIDE: "LANDSLIDE",
  STORM: "STORM",
  ROAD_CLOSURE: "ROAD_CLOSURE",
  OTHER: "OTHER",
};

async function getReport(id: string) {
  try {
    return await prisma.report.findUnique({
      where: { id },
      select: {
        id: true,
        type: true,
        status: true,
        description: true,
        address: true,
        latitude: true,
        longitude: true,
        createdAt: true,
        updatedAt: true,
        images: { select: { url: true }, take: 1 },
      },
    });
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, id } = await params;
  const report = await getReport(id);

  if (!report) {
    return {
      title: "Report Not Found",
      robots: { index: false },
    };
  }

  const t = await getTranslations({ locale, namespace: "incidentTypes" });
  const incidentType = t(incidentTypeLabels[report.type] || "OTHER");

  const title = report.address
    ? `${incidentType} - ${report.address}`
    : `${incidentType} Report`;

  const description =
    report.description ||
    `${incidentType} reported at ${report.address || `${report.latitude.toFixed(4)}, ${report.longitude.toFixed(4)}`}. View details and contribute to this community report on Sentinela.`;

  const ogImage = report.images[0]?.url || "/og_share.png";

  return {
    title,
    description,
    keywords: [
      incidentType,
      "emergency report",
      "incident",
      report.address || "",
      "Sentinela",
      "community report",
    ].filter(Boolean),
    openGraph: {
      title: `${title} | Sentinela`,
      description,
      type: "article",
      url: `${BASE_URL}/${locale}/reports/${id}`,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      publishedTime: report.createdAt.toISOString(),
      modifiedTime: report.updatedAt.toISOString(),
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | Sentinela`,
      description,
      images: [ogImage],
    },
    alternates: {
      canonical: `${BASE_URL}/${locale}/reports/${id}`,
      languages: Object.fromEntries(
        locales.map((loc) => [loc, `${BASE_URL}/${loc}/reports/${id}`])
      ),
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function ReportDetailsPage({ params }: Props) {
  const { locale, id } = await params;
  const report = await getReport(id);

  if (!report) {
    notFound();
  }

  const t = await getTranslations({ locale, namespace: "incidentTypes" });
  const incidentType = t(incidentTypeLabels[report.type] || "OTHER");

  // Format date for display
  const formattedDate = new Intl.DateTimeFormat(locale, {
    dateStyle: "long",
    timeStyle: "short",
  }).format(report.createdAt);

  const pageUrl = `${BASE_URL}/${locale}/reports/${id}`;
  const title = report.address
    ? `${incidentType} - ${report.address}`
    : `${incidentType} Report`;
  const description =
    report.description ||
    `${incidentType} reported at ${report.address || `${report.latitude.toFixed(4)}, ${report.longitude.toFixed(4)}`}`;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* JSON-LD Structured Data */}
      <IncidentReportJsonLd
        title={title}
        description={description}
        url={pageUrl}
        imageUrl={report.images[0]?.url}
        datePublished={report.createdAt.toISOString()}
        dateModified={report.updatedAt.toISOString()}
        latitude={report.latitude}
        longitude={report.longitude}
        address={report.address || undefined}
        incidentType={incidentType}
      />
      <BreadcrumbJsonLd
        items={[
          { name: "Sentinela", url: BASE_URL },
          { name: "Reports", url: `${BASE_URL}/${locale}/reports` },
          { name: title, url: pageUrl },
        ]}
      />

      {/* SEO-friendly content that search engines can index */}
      <article>
        <header className="mb-6">
          <h1 className="mb-2 text-2xl font-bold">
            {incidentType}
            {report.address ? ` - ${report.address}` : ""}
          </h1>
          <p className="text-sm text-muted-foreground">
            Reported on {formattedDate}
          </p>
        </header>

        {report.description && (
          <section className="mb-6">
            <h2 className="sr-only">Description</h2>
            <p className="text-foreground">{report.description}</p>
          </section>
        )}

        <section className="mb-6">
          <h2 className="sr-only">Location</h2>
          <p className="text-sm text-muted-foreground">
            {report.address ||
              `Coordinates: ${report.latitude.toFixed(4)}, ${report.longitude.toFixed(4)}`}
          </p>
        </section>

        {/* Link to interactive map view */}
        <div className="mt-8">
          <Link
            href={`/?report=${id}`}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            View on Map
          </Link>
        </div>
      </article>

      {/* Client-side redirect for better UX - users go to interactive map */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            if (typeof window !== 'undefined') {
              window.location.replace('/${locale}?report=${id}');
            }
          `,
        }}
      />
    </div>
  );
}
