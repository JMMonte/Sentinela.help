import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  FileJson,
  MapPin,
  Server,
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
  params: Promise<{ locale: string; source: string }>;
};

// Data source metadata
const dataSources: Record<string, {
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  provider: string;
  apiUrl: string;
  docsUrl?: string;
  updateFrequency: string;
  coverage: string;
  dataFormat: string;
}> = {
  earthquakes: {
    icon: Activity,
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
    provider: "USGS Earthquake Hazards Program",
    apiUrl: "https://earthquake.usgs.gov/fdsnws/event/1/",
    docsUrl: "https://earthquake.usgs.gov/fdsnws/event/1/",
    updateFrequency: "Real-time (1-2 min delay)",
    coverage: "Global",
    dataFormat: "GeoJSON",
  },
  fires: {
    icon: Flame,
    color: "text-red-500",
    bgColor: "bg-red-500/10",
    provider: "NASA FIRMS",
    apiUrl: "https://firms.modaps.eosdis.nasa.gov/",
    docsUrl: "https://firms.modaps.eosdis.nasa.gov/api/",
    updateFrequency: "Every 3 hours",
    coverage: "Global",
    dataFormat: "CSV/JSON",
  },
  gdacs: {
    icon: Globe,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    provider: "GDACS - Global Disaster Alert and Coordination System",
    apiUrl: "https://www.gdacs.org/",
    docsUrl: "https://www.gdacs.org/Knowledge/",
    updateFrequency: "Real-time",
    coverage: "Global",
    dataFormat: "GeoRSS/XML",
  },
  warnings: {
    icon: AlertTriangle,
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10",
    provider: "IPMA - Instituto Português do Mar e da Atmosfera",
    apiUrl: "https://api.ipma.pt/",
    docsUrl: "https://api.ipma.pt/",
    updateFrequency: "Every 15-30 minutes",
    coverage: "Portugal",
    dataFormat: "JSON",
  },
  "weather-tiles": {
    icon: Cloud,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    provider: "OpenWeatherMap",
    apiUrl: "https://openweathermap.org/api",
    docsUrl: "https://openweathermap.org/api/weathermaps",
    updateFrequency: "Every 10 minutes",
    coverage: "Global",
    dataFormat: "Map Tiles (PNG)",
  },
  "gfs-forecast": {
    icon: Thermometer,
    color: "text-cyan-500",
    bgColor: "bg-cyan-500/10",
    provider: "NOAA Global Forecast System",
    apiUrl: "https://nomads.ncep.noaa.gov/",
    docsUrl: "https://www.nco.ncep.noaa.gov/pmb/products/gfs/",
    updateFrequency: "Every 6 hours",
    coverage: "Global (0.25° resolution)",
    dataFormat: "GRIB2",
  },
  "wind-flow": {
    icon: Wind,
    color: "text-teal-500",
    bgColor: "bg-teal-500/10",
    provider: "NOAA Global Forecast System",
    apiUrl: "https://nomads.ncep.noaa.gov/",
    docsUrl: "https://www.nco.ncep.noaa.gov/pmb/products/gfs/",
    updateFrequency: "Every 6 hours",
    coverage: "Global",
    dataFormat: "GRIB2 (U/V components)",
  },
  rainfall: {
    icon: Cloud,
    color: "text-sky-500",
    bgColor: "bg-sky-500/10",
    provider: "IPMA Weather Stations",
    apiUrl: "https://api.ipma.pt/",
    docsUrl: "https://api.ipma.pt/",
    updateFrequency: "Every 10 minutes",
    coverage: "Portugal (200+ stations)",
    dataFormat: "JSON",
  },
  "air-quality": {
    icon: Wind,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
    provider: "World Air Quality Index (WAQI)",
    apiUrl: "https://aqicn.org/api/",
    docsUrl: "https://aqicn.org/api/",
    updateFrequency: "Hourly",
    coverage: "Global (station-based)",
    dataFormat: "JSON",
  },
  "uv-index": {
    icon: Sun,
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10",
    provider: "TEMIS - Tropospheric Emission Monitoring Internet Service",
    apiUrl: "https://www.temis.nl/",
    docsUrl: "https://www.temis.nl/uvradiation/",
    updateFrequency: "Daily",
    coverage: "Global",
    dataFormat: "NetCDF/ASCII",
  },
  aurora: {
    icon: Satellite,
    color: "text-green-400",
    bgColor: "bg-green-400/10",
    provider: "NOAA Space Weather Prediction Center",
    apiUrl: "https://services.swpc.noaa.gov/",
    docsUrl: "https://www.swpc.noaa.gov/products/aurora-30-minute-forecast",
    updateFrequency: "Every 30 minutes",
    coverage: "Northern & Southern Hemisphere",
    dataFormat: "JSON/Text",
  },
  waves: {
    icon: Waves,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    provider: "NOAA WAVEWATCH III",
    apiUrl: "https://polar.ncep.noaa.gov/waves/",
    docsUrl: "https://polar.ncep.noaa.gov/waves/wavewatch/",
    updateFrequency: "Every 3 hours",
    coverage: "Global oceans",
    dataFormat: "GRIB2",
  },
  "ocean-currents": {
    icon: Waves,
    color: "text-sky-400",
    bgColor: "bg-sky-400/10",
    provider: "NOAA OSCAR - Ocean Surface Current Analysis Real-time",
    apiUrl: "https://www.oscar.noaa.gov/",
    docsUrl: "https://www.oscar.noaa.gov/datadisplay/",
    updateFrequency: "Every 5 days",
    coverage: "Global oceans",
    dataFormat: "NetCDF",
  },
  "sea-temperature": {
    icon: Thermometer,
    color: "text-cyan-500",
    bgColor: "bg-cyan-500/10",
    provider: "NOAA OISST - Optimum Interpolation SST",
    apiUrl: "https://www.ncei.noaa.gov/products/optimum-interpolation-sst",
    docsUrl: "https://www.ncei.noaa.gov/products/optimum-interpolation-sst",
    updateFrequency: "Daily",
    coverage: "Global oceans",
    dataFormat: "NetCDF",
  },
  aircraft: {
    icon: Plane,
    color: "text-sky-500",
    bgColor: "bg-sky-500/10",
    provider: "OpenSky Network",
    apiUrl: "https://opensky-network.org/",
    docsUrl: "https://openskynetwork.github.io/opensky-api/",
    updateFrequency: "Real-time (5-10 sec)",
    coverage: "Global (ADS-B coverage)",
    dataFormat: "JSON",
  },
  lightning: {
    icon: Zap,
    color: "text-yellow-400",
    bgColor: "bg-yellow-400/10",
    provider: "Blitzortung.org",
    apiUrl: "https://www.blitzortung.org/",
    docsUrl: "https://www.blitzortung.org/en/",
    updateFrequency: "Real-time",
    coverage: "Global (community sensors)",
    dataFormat: "JSON/WebSocket",
  },
  kiwisdr: {
    icon: Radio,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    provider: "KiwiSDR Network",
    apiUrl: "http://kiwisdr.com/",
    docsUrl: "https://github.com/jks-prv/kiwiclient",
    updateFrequency: "Real-time",
    coverage: "Global (community receivers)",
    dataFormat: "JSON",
  },
  aprs: {
    icon: Radio,
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
    provider: "APRS-IS (Automatic Packet Reporting System)",
    apiUrl: "https://aprs.fi/",
    docsUrl: "http://www.aprs-is.net/",
    updateFrequency: "Real-time",
    coverage: "Global (amateur radio network)",
    dataFormat: "APRS Protocol",
  },
  ionosphere: {
    icon: Satellite,
    color: "text-indigo-500",
    bgColor: "bg-indigo-500/10",
    provider: "NOAA Space Weather Prediction Center",
    apiUrl: "https://services.swpc.noaa.gov/",
    docsUrl: "https://www.swpc.noaa.gov/",
    updateFrequency: "Every 1-3 hours",
    coverage: "Global",
    dataFormat: "JSON/Text",
  },
};

const validSources = Object.keys(dataSources);

export async function generateStaticParams() {
  const locales = ["en", "pt-PT"];
  return locales.flatMap((locale) =>
    validSources.map((source) => ({ locale, source }))
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, source } = await params;

  if (!validSources.includes(source)) {
    return { title: "Not Found" };
  }

  const t = await getTranslations({ locale, namespace: "dataSourcePages" });

  return {
    title: `${t(`${source}.title`)} - Data Sources - Sentinela`,
    description: t(`${source}.shortDescription`),
  };
}

export default async function DataSourcePage({ params }: Props) {
  const { locale, source } = await params;
  setRequestLocale(locale);

  if (!validSources.includes(source)) {
    notFound();
  }

  const t = await getTranslations("dataSourcePages");
  const sourceData = dataSources[source];
  const Icon = sourceData.icon;

  return (
    <>
      <Link
        href={`/${locale}/about/data-sources`}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Data Sources
      </Link>

      {/* Header */}
      <div className="mb-8 flex items-start gap-4">
        <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl ${sourceData.bgColor}`}>
          <Icon className={`h-7 w-7 ${sourceData.color}`} />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t(`${source}.title`)}</h1>
          <p className="mt-1 text-muted-foreground">{sourceData.provider}</p>
        </div>
      </div>

      {/* Quick Info Cards */}
      <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span className="text-xs font-medium uppercase">Update Frequency</span>
          </div>
          <p className="mt-1 text-sm font-medium">{sourceData.updateFrequency}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span className="text-xs font-medium uppercase">Coverage</span>
          </div>
          <p className="mt-1 text-sm font-medium">{sourceData.coverage}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <FileJson className="h-4 w-4" />
            <span className="text-xs font-medium uppercase">Data Format</span>
          </div>
          <p className="mt-1 text-sm font-medium">{sourceData.dataFormat}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Server className="h-4 w-4" />
            <span className="text-xs font-medium uppercase">API</span>
          </div>
          <a
            href={sourceData.apiUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            View API
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>

      {/* Description */}
      <div className="prose prose-zinc dark:prose-invert max-w-none">
        <section>
          <h2>Overview</h2>
          <p>{t(`${source}.description`)}</p>
        </section>

        <section>
          <h2>How Sentinela Uses This Data</h2>
          <p>{t(`${source}.howWeUseIt`)}</p>
        </section>

        <section>
          <h2>Data Processing</h2>
          <p>{t(`${source}.processing`)}</p>
        </section>

        {/* Limitations */}
        <section className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
          <h3 className="mt-0 flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-4 w-4" />
            Limitations & Considerations
          </h3>
          <p className="mb-0 text-sm">{t(`${source}.limitations`)}</p>
        </section>
      </div>

      {/* Links */}
      <div className="mt-8 flex flex-wrap gap-3">
        <a
          href={sourceData.apiUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-md border bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
        >
          <Server className="h-4 w-4" />
          API Endpoint
          <ExternalLink className="h-3 w-3" />
        </a>
        {sourceData.docsUrl && (
          <a
            href={sourceData.docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md border bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
          >
            Documentation
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </>
  );
}
