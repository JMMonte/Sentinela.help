import type { Metadata } from "next";
import Link from "next/link";
import {
  ChevronRight,
  Activity,
  Cloud,
  Flame,
  Waves,
  Plane,
  Zap,
  Radio,
  Satellite,
  Globe,
  Wind,
  Thermometer,
  Sun,
  AlertTriangle,
} from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "about" });

  const title = t("dataSourcesTitle");
  const description = t("dataSourcesDescription");

  return {
    title,
    description,
    keywords: [
      "data sources",
      "API",
      "earthquake data",
      "fire data",
      "weather data",
      "USGS",
      "NASA FIRMS",
      "NOAA",
      "IPMA",
      "real-time monitoring",
      "open data",
    ],
    openGraph: {
      title: `${title} | Sentinela`,
      description,
      type: "website",
    },
    twitter: {
      card: "summary",
      title: `${title} | Sentinela`,
      description,
    },
    alternates: {
      canonical: `/${locale}/about/data-sources`,
      languages: {
        en: "/en/about/data-sources",
        "pt-PT": "/pt-PT/about/data-sources",
      },
    },
  };
}

// Data source definitions with categories
const dataSourceCategories = [
  {
    id: "hazards",
    sources: [
      {
        id: "earthquakes",
        icon: Activity,
        color: "text-orange-500",
        bgColor: "bg-orange-500/10",
        provider: "USGS",
        apiUrl: "https://earthquake.usgs.gov/fdsnws/event/1/",
      },
      {
        id: "fires",
        icon: Flame,
        color: "text-red-500",
        bgColor: "bg-red-500/10",
        provider: "NASA FIRMS",
        apiUrl: "https://firms.modaps.eosdis.nasa.gov/",
      },
      {
        id: "gdacs",
        icon: Globe,
        color: "text-amber-500",
        bgColor: "bg-amber-500/10",
        provider: "GDACS",
        apiUrl: "https://www.gdacs.org/",
      },
      {
        id: "warnings",
        icon: AlertTriangle,
        color: "text-yellow-500",
        bgColor: "bg-yellow-500/10",
        provider: "IPMA",
        apiUrl: "https://api.ipma.pt/",
      },
    ],
  },
  {
    id: "weather",
    sources: [
      {
        id: "weather-tiles",
        icon: Cloud,
        color: "text-blue-500",
        bgColor: "bg-blue-500/10",
        provider: "OpenWeatherMap",
        apiUrl: "https://openweathermap.org/api",
      },
      {
        id: "gfs-forecast",
        icon: Thermometer,
        color: "text-cyan-500",
        bgColor: "bg-cyan-500/10",
        provider: "NOAA GFS",
        apiUrl: "https://nomads.ncep.noaa.gov/",
      },
      {
        id: "wind-flow",
        icon: Wind,
        color: "text-teal-500",
        bgColor: "bg-teal-500/10",
        provider: "NOAA GFS",
        apiUrl: "https://nomads.ncep.noaa.gov/",
      },
      {
        id: "rainfall",
        icon: Cloud,
        color: "text-sky-500",
        bgColor: "bg-sky-500/10",
        provider: "IPMA",
        apiUrl: "https://api.ipma.pt/",
      },
    ],
  },
  {
    id: "environment",
    sources: [
      {
        id: "air-quality",
        icon: Wind,
        color: "text-emerald-500",
        bgColor: "bg-emerald-500/10",
        provider: "WAQI",
        apiUrl: "https://aqicn.org/api/",
      },
      {
        id: "uv-index",
        icon: Sun,
        color: "text-yellow-500",
        bgColor: "bg-yellow-500/10",
        provider: "TEMIS",
        apiUrl: "https://www.temis.nl/",
      },
      {
        id: "aurora",
        icon: Satellite,
        color: "text-green-400",
        bgColor: "bg-green-400/10",
        provider: "NOAA SWPC",
        apiUrl: "https://services.swpc.noaa.gov/",
      },
    ],
  },
  {
    id: "ocean",
    sources: [
      {
        id: "waves",
        icon: Waves,
        color: "text-blue-500",
        bgColor: "bg-blue-500/10",
        provider: "NOAA WaveWatch III",
        apiUrl: "https://polar.ncep.noaa.gov/waves/",
      },
      {
        id: "ocean-currents",
        icon: Waves,
        color: "text-sky-400",
        bgColor: "bg-sky-400/10",
        provider: "NOAA OSCAR",
        apiUrl: "https://www.oscar.noaa.gov/",
      },
      {
        id: "sea-temperature",
        icon: Thermometer,
        color: "text-cyan-500",
        bgColor: "bg-cyan-500/10",
        provider: "NOAA OISST",
        apiUrl: "https://www.ncei.noaa.gov/products/optimum-interpolation-sst",
      },
    ],
  },
  {
    id: "radio",
    sources: [
      {
        id: "aircraft",
        icon: Plane,
        color: "text-sky-500",
        bgColor: "bg-sky-500/10",
        provider: "OpenSky Network",
        apiUrl: "https://opensky-network.org/",
      },
      {
        id: "lightning",
        icon: Zap,
        color: "text-yellow-400",
        bgColor: "bg-yellow-400/10",
        provider: "Blitzortung",
        apiUrl: "https://www.blitzortung.org/",
      },
      {
        id: "kiwisdr",
        icon: Radio,
        color: "text-green-500",
        bgColor: "bg-green-500/10",
        provider: "KiwiSDR",
        apiUrl: "http://kiwisdr.com/",
      },
      {
        id: "aprs",
        icon: Radio,
        color: "text-orange-500",
        bgColor: "bg-orange-500/10",
        provider: "APRS-IS",
        apiUrl: "https://aprs.fi/",
      },
    ],
  },
  {
    id: "space",
    sources: [
      {
        id: "ionosphere",
        icon: Satellite,
        color: "text-indigo-500",
        bgColor: "bg-indigo-500/10",
        provider: "NOAA SWPC",
        apiUrl: "https://services.swpc.noaa.gov/",
      },
    ],
  },
];

export default async function DataSourcesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("about");
  const tSources = await getTranslations("dataSourcePages");

  return (
    <>
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/" className="underline-offset-4 hover:text-foreground hover:underline">Sentinela</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href={`/${locale}/about`} className="underline-offset-4 hover:text-foreground hover:underline">{t("title")}</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground">{t("dataSourcesTitle")}</span>
      </nav>

      <h1 className="mb-3 text-3xl font-bold tracking-tight">{t("dataSourcesTitle")}</h1>
      <p className="mb-8 text-lg text-muted-foreground">{t("dataSourcesDescription")}</p>

      <div className="prose prose-zinc dark:prose-invert max-w-none prose-h2:border-b prose-h2:border-border prose-h2:pb-2 prose-h2:text-xl prose-h2:font-semibold">
        {dataSourceCategories.map((category) => (
          <section key={category.id} className="mt-8">
            <h2 className="!mb-4 !border-b !border-border !pb-2 !text-xl !font-bold">{tSources(`categories.${category.id}`)}</h2>
            <ul>
              {category.sources.map((source) => {
                const Icon = source.icon;
                return (
                  <li key={source.id}>
                    <Link
                      href={`/${locale}/about/data-sources/${source.id}`}
                      className="inline-flex items-center gap-1.5 font-medium text-primary underline-offset-4 hover:underline"
                    >
                      <Icon className={`h-4 w-4 ${source.color}`} />
                      {tSources(`${source.id}.title`)}
                      <ChevronRight className="h-3 w-3" />
                    </Link>
                    {" — "}
                    <span className="text-muted-foreground">
                      {tSources(`${source.id}.shortDescription`)}
                    </span>
                    <span className="ml-1 text-xs text-muted-foreground">
                      ({source.provider})
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}

        {/* Attribution Section */}
        <section className="mt-10">
          <h2 className="!mb-4 !border-b !border-border !pb-2 !text-xl !font-bold">{tSources("ui.attributionTitle")}</h2>
          <p>{tSources("ui.attributionText")}</p>
          <p className="text-sm text-muted-foreground">{tSources("ui.dataProviders")}</p>
        </section>
      </div>
    </>
  );
}
