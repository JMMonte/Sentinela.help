import type { MetadataRoute } from "next";

import { prisma } from "@/lib/db/prisma";
import { locales } from "@/i18n/config";

const BASE_URL = "https://sentinela.help";

// All valid data sources (kept in sync with data-sources/[source]/page.tsx)
const dataSources = [
  "earthquakes",
  "fires",
  "gdacs",
  "warnings",
  "weather-tiles",
  "gfs-forecast",
  "wind-flow",
  "rainfall",
  "air-quality",
  "uv-index",
  "aurora",
  "waves",
  "ocean-currents",
  "sea-temperature",
  "aircraft",
  "lightning",
  "kiwisdr",
  "aprs",
  "ionosphere",
];

// Revalidate sitemap every hour
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [];

  // Add locale home pages (highest priority)
  for (const locale of locales) {
    entries.push({
      url: `${BASE_URL}/${locale}`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1.0,
    });
  }

  // Add report creation pages
  for (const locale of locales) {
    entries.push({
      url: `${BASE_URL}/${locale}/report`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    });
  }

  // Add about pages
  for (const locale of locales) {
    entries.push({
      url: `${BASE_URL}/${locale}/about`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    });

    entries.push({
      url: `${BASE_URL}/${locale}/about/data-sources`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    });
  }

  // Add all data source pages
  for (const locale of locales) {
    for (const source of dataSources) {
      entries.push({
        url: `${BASE_URL}/${locale}/about/data-sources/${source}`,
        lastModified: now,
        changeFrequency: "monthly",
        priority: 0.6,
      });
    }
  }

  // Add dynamic report pages from database
  try {
    const reports = await prisma.report.findMany({
      select: { id: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 10000, // Limit to prevent massive sitemaps (Google allows 50k URLs per sitemap)
    });

    for (const report of reports) {
      for (const locale of locales) {
        entries.push({
          url: `${BASE_URL}/${locale}/reports/${report.id}`,
          lastModified: report.updatedAt,
          changeFrequency: "weekly",
          priority: 0.5,
        });
      }
    }
  } catch (error) {
    // Log error but don't fail sitemap generation
    console.error("Failed to fetch reports for sitemap:", error);
  }

  return entries;
}
