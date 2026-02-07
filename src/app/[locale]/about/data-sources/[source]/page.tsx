import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ChevronRight,
  ExternalLink,
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
  const tAbout = await getTranslations("about");
  const sourceData = dataSources[source];
  const Icon = sourceData.icon;

  return (
    <>
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/" className="underline-offset-4 hover:text-foreground hover:underline">Sentinela</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href={`/${locale}/about`} className="underline-offset-4 hover:text-foreground hover:underline">{tAbout("title")}</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href={`/${locale}/about/data-sources`} className="underline-offset-4 hover:text-foreground hover:underline">{tAbout("dataSourcesTitle")}</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground">{t(`${source}.title`)}</span>
      </nav>

      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Icon className={`h-6 w-6 ${sourceData.color}`} />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t(`${source}.title`)}</h1>
          <p className="text-sm text-muted-foreground">{sourceData.provider}</p>
        </div>
      </div>

      {/* Description */}
      <div className="prose prose-zinc dark:prose-invert max-w-none">
        {/* Quick Info */}
        <p className="text-muted-foreground">
          <strong>Coverage:</strong> {sourceData.coverage} · <strong>Update frequency:</strong> {sourceData.updateFrequency} · <strong>Format:</strong> {sourceData.dataFormat}
        </p>

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
        <section className="not-prose rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
          <h3 className="mt-0 flex items-center gap-2 font-semibold text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-4 w-4" />
            Limitations & Considerations
          </h3>
          <p className="mb-0 mt-2 text-sm">{t(`${source}.limitations`)}</p>
        </section>

        {/* Links */}
        <section>
          <h2>Resources</h2>
          <ul>
            <li>
              <a href={sourceData.apiUrl} target="_blank" rel="noopener noreferrer">
                API Endpoint <ExternalLink className="ml-0.5 inline h-3 w-3" />
              </a>
            </li>
            {sourceData.docsUrl && (
              <li>
                <a href={sourceData.docsUrl} target="_blank" rel="noopener noreferrer">
                  Documentation <ExternalLink className="ml-0.5 inline h-3 w-3" />
                </a>
              </li>
            )}
          </ul>
        </section>
      </div>
    </>
  );
}
