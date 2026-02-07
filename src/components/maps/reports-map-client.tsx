"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import {
  MapContainer,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import type { LatLngExpression } from "leaflet";

import { cn } from "@/lib/utils";
import { type IncidentType } from "@/lib/reports/incident-types";
import {
  type CurrentWeatherData,
  getWeatherIconUrl,
  msToKmh,
  windDegToDirection,
} from "@/lib/overlays/weather-api";
import {
  createClusterIcon,
  createImageMarkerIcon,
  createSolvedImageMarkerIcon,
  createEscalatedImageMarkerIcon,
  YELLOW_PIN_ICON,
  SOLVED_PIN_ICON,
  ESCALATED_PIN_ICON,
} from "./marker-icons";
import { MarkerClusterGroup, type ClusteredMarker } from "./marker-cluster-group";
import { WeatherOverlay } from "./overlays/weather-overlay";
import { SeismicOverlay } from "./overlays/seismic-overlay";
import { ProCivOverlay } from "./overlays/prociv-overlay";
import { RainfallOverlay } from "./overlays/rainfall-overlay";
import { WarningsOverlay } from "./overlays/warnings-overlay";
import { WindOverlay } from "./overlays/wind-overlay";
import { RouteOverlay } from "./overlays/route-overlay";
import { TemperatureOverlay } from "./overlays/temperature-overlay";
import { HumidityOverlay } from "./overlays/humidity-overlay";
import { PrecipitationGfsOverlay } from "./overlays/precipitation-gfs-overlay";
import { CloudCoverOverlay } from "./overlays/cloud-cover-overlay";
import { CapeOverlay } from "./overlays/cape-overlay";
import { FireWeatherOverlay } from "./overlays/fire-weather-overlay";
import { FiresOverlay } from "./overlays/fires-overlay";
import { AuroraOverlay } from "./overlays/aurora-overlay";
import { AirQualityOverlay } from "./overlays/air-quality-overlay";
import { UvIndexOverlay } from "./overlays/uv-index-overlay";
import { WavesOverlay } from "./overlays/waves-overlay";
import { OceanCurrentsOverlay } from "./overlays/ocean-currents-overlay";
import { SstOverlay } from "./overlays/sst-overlay";
import { AircraftOverlay } from "./overlays/aircraft-overlay";
import { LightningOverlay } from "./overlays/lightning-overlay";
import { KiwiSdrOverlay } from "./overlays/kiwisdr-overlay";
import { AprsOverlay } from "./overlays/aprs-overlay";
import { IonosphereOverlay } from "./overlays/ionosphere-overlay";
import { GdacsOverlay } from "./overlays/gdacs-overlay";
import { TerminatorOverlay } from "./overlays/terminator-overlay";
import { OverlayControls } from "./overlays/overlay-controls";
import { useWeatherOverlay, type WeatherOverlayConfig } from "./hooks/use-weather-overlay";
import { useSeismicOverlay, type SeismicOverlayConfig } from "./hooks/use-seismic-overlay";
import { useProCivOverlay, type ProCivOverlayConfig } from "./hooks/use-prociv-overlay";
import { useRainfallOverlay, type RainfallOverlayConfig } from "./hooks/use-rainfall-overlay";
import { useWarningsOverlay, type WarningsOverlayConfig } from "./hooks/use-warnings-overlay";
import { useWindOverlay, type WindOverlayConfig } from "./hooks/use-wind-overlay";
import { useTemperatureOverlay, type TemperatureOverlayConfig } from "./hooks/use-temperature-overlay";
import { useHumidityOverlay, type HumidityOverlayConfig } from "./hooks/use-humidity-overlay";
import { usePrecipitationOverlay, type PrecipitationOverlayConfig } from "./hooks/use-precipitation-overlay";
import { useCloudCoverOverlay, type CloudCoverOverlayConfig } from "./hooks/use-cloud-cover-overlay";
import { useCapeOverlay, type CapeOverlayConfig } from "./hooks/use-cape-overlay";
import { useFireWeatherOverlay, type FireWeatherOverlayConfig } from "./hooks/use-fire-weather-overlay";
import { useFiresOverlay, type FiresOverlayConfig } from "./hooks/use-fires-overlay";
import { useAuroraOverlay, type AuroraOverlayConfig } from "./hooks/use-aurora-overlay";
import { useAirQualityOverlay, type AirQualityOverlayConfig } from "./hooks/use-air-quality-overlay";
import { useUvIndexOverlay, type UvIndexOverlayConfig } from "./hooks/use-uv-index-overlay";
import { useWavesOverlay, type WavesOverlayConfig } from "./hooks/use-waves-overlay";
import { useOceanCurrentsOverlay, type OceanCurrentsOverlayConfig } from "./hooks/use-ocean-currents-overlay";
import { useSstOverlay, type SstOverlayConfig } from "./hooks/use-sst-overlay";
import { useAircraftOverlay, type AircraftOverlayConfig } from "./hooks/use-aircraft-overlay";
import { useLightningOverlay, type LightningOverlayConfig } from "./hooks/use-lightning-overlay";
import { useKiwiSdrOverlay, type KiwiSdrOverlayConfig } from "./hooks/use-kiwisdr-overlay";
import { useAprsOverlay, type AprsOverlayConfig } from "./hooks/use-aprs-overlay";
import { useIonosphereOverlay, type IonosphereOverlayConfig } from "./hooks/use-ionosphere-overlay";
import { useGdacsOverlay, type GdacsOverlayConfig } from "./hooks/use-gdacs-overlay";
import { useTerminatorOverlay, type TerminatorOverlayConfig } from "./hooks/use-terminator-overlay";
import { useLocationWeather } from "./hooks/use-location-weather";
import { useOverlayValues, type OverlayValueConfig } from "./hooks/use-overlay-values";
import { UserLocationMarker, PinLocationMarker } from "./user-location-marker";

const TILE_LIGHT =
  "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
const TILE_DARK =
  "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const TILE_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>';

export type ReportStatus = "NEW" | "NOTIFIED" | "CLOSED";

export type ReportMapItem = {
  id: string;
  type: IncidentType;
  status: ReportStatus;
  latitude: number;
  longitude: number;
  createdAt: string;
  description: string | null;
  imageUrl: string | null;
  score: number;
};

export type OverlayConfig = {
  weather: WeatherOverlayConfig;
  seismic: SeismicOverlayConfig;
  prociv: ProCivOverlayConfig;
  gdacs: GdacsOverlayConfig;
  rainfall: RainfallOverlayConfig;
  warnings: WarningsOverlayConfig;
  wind: WindOverlayConfig;
  // GFS forecast overlays
  temperature: TemperatureOverlayConfig;
  humidity: HumidityOverlayConfig;
  precipitation: PrecipitationOverlayConfig;
  cloudCover: CloudCoverOverlayConfig;
  cape: CapeOverlayConfig;
  fireWeather: FireWeatherOverlayConfig;
  fires: FiresOverlayConfig;
  aurora: AuroraOverlayConfig;
  airQuality: AirQualityOverlayConfig;
  uvIndex: UvIndexOverlayConfig;
  waves: WavesOverlayConfig;
  oceanCurrents: OceanCurrentsOverlayConfig;
  sst: SstOverlayConfig;
  // Radio data overlays
  aircraft: AircraftOverlayConfig;
  lightning: LightningOverlayConfig;
  kiwisdr: KiwiSdrOverlayConfig;
  aprs: AprsOverlayConfig;
  ionosphere: IonosphereOverlayConfig;
  // Utility overlays
  terminator: TerminatorOverlayConfig;
};

export type ReportsMapProps = {
  reports: ReportMapItem[];
  center?: LatLngExpression;
  /** Coordinates to fly to (triggers animation when changed). */
  flyTo?: LatLngExpression;
  userLocation?: [number, number];
  /** Coordinates of the pin dropped by the user for a new report. */
  pinLocation?: [number, number];
  /** Called when the user clicks the map to drop a pin. */
  onMapClick?: (lat: number, lng: number) => void;
  /** Called when user clicks "View report" in a popup. */
  onReportSelect?: (reportId: string) => void;
  zoom?: number;
  className?: string;
  /** Configuration for map overlays (weather, seismic). */
  overlayConfig?: OverlayConfig;
  /** Time filter in hours – controls how far back overlays fetch data. */
  timeFilterHours?: number;
  /** Route geometry to display as a polyline. Array of [lat, lng] pairs. */
  routeGeometry?: [number, number][];
};

function FlyToCenter({ center }: { center?: LatLngExpression }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, 17, { duration: 0.5 });
    }
  }, [map, center]);
  return null;
}

function ResizeInvalidator() {
  const map = useMap();
  useEffect(() => {
    const container = map.getContainer();
    const observer = new ResizeObserver(() => {
      map.invalidateSize();
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [map]);
  return null;
}

/** Exposes the Leaflet map instance on window for screenshot automation */
function MapExposer() {
  const map = useMap();
  useEffect(() => {
    // Expose map to window for external control (screenshots, testing)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__LEAFLET_MAP__ = map;

    // Listen for custom events to control the map
    const handleSetView = (e: CustomEvent<{ lat: number; lng: number; zoom: number }>) => {
      const { lat, lng, zoom } = e.detail;
      map.setView([lat, lng], zoom, { animate: false });
    };

    window.addEventListener("setMapView", handleSetView as EventListener);

    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (window as any).__LEAFLET_MAP__;
      window.removeEventListener("setMapView", handleSetView as EventListener);
    };
  }, [map]);
  return null;
}

function ClickHandler({
  onPick,
}: {
  onPick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(event) {
      onPick(event.latlng.lat, event.latlng.lng);
    },
  });
  return null;
}

type PopupTranslations = {
  typeLabel: string;
  viewReport: string;
};

function buildWeatherRowHtml(w: CurrentWeatherData): string {
  const temp = Math.round(w.main.temp);
  const iconUrl = getWeatherIconUrl(w.weather[0].icon);
  const wind = msToKmh(w.wind.speed);
  const windDir = windDegToDirection(w.wind.deg);
  const humidity = w.main.humidity;
  const description = w.weather[0].description;

  return `
    <div style="display:flex;align-items:center;gap:6px;font-size:11px;color:#71717a;border-top:1px solid #e4e4e7;padding-top:6px;">
      <img src="${iconUrl}" alt="${description}" style="width:24px;height:24px;margin:-2px 0;" />
      <span style="font-weight:600;color:#18181b;">${temp}&deg;C</span>
      <span>${wind}<small style="font-size:9px;opacity:0.7;margin-left:1px;">km/h</small> ${windDir}</span>
      <span>${humidity}<small style="font-size:9px;opacity:0.7;margin-left:1px;">%</small></span>
    </div>
  `;
}

function buildPopupHtml(
  report: ReportMapItem,
  translations: PopupTranslations,
  weather?: CurrentWeatherData | null,
): string {
  const imageHtml = report.imageUrl
    ? `<img src="${report.imageUrl}" alt="" style="height:96px;width:100%;border-radius:4px;object-fit:cover;" />`
    : "";

  const date = new Date(report.createdAt).toLocaleString();
  const scoreColor = report.score > 0 ? "#ef4444" : report.score < 0 ? "#3b82f6" : "#71717a";
  const scoreLabel = report.score > 0 ? `+${report.score}` : String(report.score);
  const weatherHtml = weather ? buildWeatherRowHtml(weather) : "";

  return `
    <div style="display:grid;gap:8px;min-width:180px;">
      ${imageHtml}
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
        <span style="font-size:12px;font-weight:500;background:#f4f4f5;padding:2px 6px;border-radius:4px;">${translations.typeLabel}</span>
        <span style="font-size:11px;font-weight:600;color:${scoreColor};">${scoreLabel}</span>
        <span style="font-size:11px;color:#71717a;">${date}</span>
      </div>
      ${weatherHtml}
      <button data-report-id="${report.id}" style="font-size:14px;text-decoration:underline;background:none;border:none;padding:0;cursor:pointer;text-align:left;color:inherit;">${translations.viewReport}</button>
    </div>
  `;
}

const DEFAULT_OVERLAY_CONFIG: OverlayConfig = {
  weather: { enabled: false },
  seismic: { enabled: false, minMagnitude: 2.5 },
  prociv: { enabled: false },
  gdacs: { enabled: false },
  rainfall: { enabled: false },
  warnings: { enabled: false },
  wind: { enabled: false },
  // GFS forecast overlays
  temperature: { enabled: false },
  humidity: { enabled: false },
  precipitation: { enabled: false },
  cloudCover: { enabled: false },
  cape: { enabled: false },
  fireWeather: { enabled: false },
  fires: { enabled: false },
  aurora: { enabled: false },
  airQuality: { enabled: false },
  uvIndex: { enabled: false },
  waves: { enabled: false },
  oceanCurrents: { enabled: false },
  sst: { enabled: false },
  // Radio data overlays
  aircraft: { enabled: false },
  lightning: { enabled: false },
  kiwisdr: { enabled: false },
  aprs: { enabled: false },
  ionosphere: { enabled: false },
  // Utility overlays
  terminator: { enabled: false },
};

export function ReportsMapClient({
  reports,
  center,
  flyTo,
  userLocation,
  pinLocation,
  onMapClick,
  onReportSelect,
  zoom,
  className,
  overlayConfig = DEFAULT_OVERLAY_CONFIG,
  timeFilterHours = 8,
  routeGeometry,
}: ReportsMapProps) {
  const { resolvedTheme } = useTheme();
  const tileUrl = resolvedTheme === "dark" ? TILE_DARK : TILE_LIGHT;
  const tIncidentTypes = useTranslations("incidentTypes");
  const tReports = useTranslations("reports");
  const tMap = useTranslations("map");

  // Overlay state
  const weather = useWeatherOverlay(overlayConfig.weather);
  const seismic = useSeismicOverlay(overlayConfig.seismic, timeFilterHours);
  const prociv = useProCivOverlay(overlayConfig.prociv, timeFilterHours);
  const gdacs = useGdacsOverlay(overlayConfig.gdacs);
  const rainfall = useRainfallOverlay(overlayConfig.rainfall, timeFilterHours);
  const warnings = useWarningsOverlay(overlayConfig.warnings);
  const wind = useWindOverlay(overlayConfig.wind);

  // GFS forecast overlays
  const temperature = useTemperatureOverlay(overlayConfig.temperature);
  const humidity = useHumidityOverlay(overlayConfig.humidity);
  const precipitation = usePrecipitationOverlay(overlayConfig.precipitation);
  const cloudCover = useCloudCoverOverlay(overlayConfig.cloudCover);
  const cape = useCapeOverlay(overlayConfig.cape);
  const fireWeather = useFireWeatherOverlay(overlayConfig.fireWeather);
  const fires = useFiresOverlay(overlayConfig.fires);
  const aurora = useAuroraOverlay(overlayConfig.aurora);
  const airQuality = useAirQualityOverlay(overlayConfig.airQuality);
  const uvIndex = useUvIndexOverlay(overlayConfig.uvIndex);
  const waves = useWavesOverlay(overlayConfig.waves);
  const oceanCurrents = useOceanCurrentsOverlay(overlayConfig.oceanCurrents);
  const sst = useSstOverlay(overlayConfig.sst);

  // Radio data overlays
  const aircraft = useAircraftOverlay(overlayConfig.aircraft);
  const lightning = useLightningOverlay(overlayConfig.lightning);
  const kiwisdr = useKiwiSdrOverlay(overlayConfig.kiwisdr);
  const aprs = useAprsOverlay(overlayConfig.aprs);
  const ionosphere = useIonosphereOverlay(overlayConfig.ionosphere);

  // Utility overlays
  const terminator = useTerminatorOverlay(overlayConfig.terminator);

  // Location weather (current weather at user position)
  // API key handled server-side via proxy
  const locationWeather = useLocationWeather(
    userLocation,
    weather.isAvailable
  );

  // Weather at pin location (for yellow marker popup)
  const pinWeather = useLocationWeather(
    pinLocation,
    weather.isAvailable
  );

  // Build overlay config for value sampling
  const overlayValueConfigs: OverlayValueConfig[] = useMemo(
    () => [
      { type: "temperature", data: temperature.data, enabled: temperature.enabled },
      { type: "humidity", data: humidity.data, enabled: humidity.enabled },
      { type: "precipitation", data: precipitation.data, enabled: precipitation.enabled },
      { type: "cloudCover", data: cloudCover.data, enabled: cloudCover.enabled },
      { type: "cape", data: cape.data, enabled: cape.enabled },
      { type: "fireWeather", data: fireWeather.data, enabled: fireWeather.enabled },
      { type: "uvIndex", data: uvIndex.data, enabled: uvIndex.enabled },
      { type: "airQuality", data: airQuality.data, enabled: airQuality.enabled },
    ],
    [
      temperature.data, temperature.enabled,
      humidity.data, humidity.enabled,
      precipitation.data, precipitation.enabled,
      cloudCover.data, cloudCover.enabled,
      cape.data, cape.enabled,
      fireWeather.data, fireWeather.enabled,
      uvIndex.data, uvIndex.enabled,
      airQuality.data, airQuality.enabled,
    ]
  );

  // Sample overlay values at user and pin locations
  const userOverlayValues = useOverlayValues(userLocation, overlayValueConfigs);
  const pinOverlayValues = useOverlayValues(pinLocation, overlayValueConfigs);

  // Handle clicks on "View report" buttons in popups
  useEffect(() => {
    if (!onReportSelect) return;

    const selectReport = onReportSelect;
    function handlePopupClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      const reportId = target.getAttribute("data-report-id");
      if (reportId) {
        e.preventDefault();
        selectReport(reportId);
      }
    }

    document.addEventListener("click", handlePopupClick);
    return () => document.removeEventListener("click", handlePopupClick);
  }, [onReportSelect]);

  // Convert reports to clustered markers
  const clusteredMarkers: ClusteredMarker[] = useMemo(
    () =>
      reports.map((report) => {
        const isSolved = report.status === "CLOSED";
        const isEscalated = report.status === "NOTIFIED";
        let icon;
        if (report.imageUrl) {
          if (isSolved) {
            icon = createSolvedImageMarkerIcon(report.imageUrl);
          } else if (isEscalated) {
            icon = createEscalatedImageMarkerIcon(report.imageUrl);
          } else {
            icon = createImageMarkerIcon(report.imageUrl);
          }
        } else {
          if (isSolved) {
            icon = SOLVED_PIN_ICON;
          } else if (isEscalated) {
            icon = ESCALATED_PIN_ICON;
          } else {
            icon = YELLOW_PIN_ICON;
          }
        }
        return {
          id: report.id,
          position: [report.latitude, report.longitude] as [number, number],
          icon,
          popupContent: buildPopupHtml(
            report,
            {
              typeLabel: tIncidentTypes(report.type),
              viewReport: tReports("viewReport"),
            },
            locationWeather.data,
          ),
        };
      }),
    [reports, tIncidentTypes, tReports, locationWeather.data]
  );

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={center ?? [37.7749, -122.4194]}
        zoom={zoom ?? (center ? 11 : 4)}
        className={cn("h-[420px] w-full rounded-md z-0", className)}
        scrollWheelZoom
        maxBounds={[[-85.05, -Infinity], [85.05, Infinity]]}
        maxBoundsViscosity={1.0}
      >
        <TileLayer key={tileUrl} attribution={TILE_ATTR} url={tileUrl} />
        <ResizeInvalidator />
        <MapExposer />
        <FlyToCenter center={flyTo} />
        {onMapClick && <ClickHandler onPick={onMapClick} />}

        {/* Day/Night terminator (shows shadow for night side) */}
        {terminator.enabled && <TerminatorOverlay animate={terminator.animate} />}

        {/* Weather overlay (above base tiles, below markers) */}
        {weather.enabled && weather.tileUrl && (
          <WeatherOverlay tileUrl={weather.tileUrl} opacity={weather.opacity} />
        )}

        {/* Wind particle overlay (animated wind flow - independent of weather tiles) */}
        {wind.enabled && wind.data && (
          <WindOverlay data={wind.data} />
        )}

        {/* Seismic overlay (above weather, below user markers) */}
        {seismic.enabled && seismic.earthquakes.length > 0 && (
          <SeismicOverlay earthquakes={seismic.earthquakes} />
        )}

        {/* ProCiv overlay (civil protection occurrences) */}
        {prociv.enabled && prociv.incidents.length > 0 && (
          <ProCivOverlay incidents={prociv.incidents} />
        )}

        {/* GDACS Global Disasters overlay */}
        {gdacs.enabled && gdacs.events.length > 0 && (
          <GdacsOverlay events={gdacs.events} />
        )}

        {/* Rainfall overlay (IPMA station observations) */}
        {rainfall.enabled && rainfall.stations.length > 0 && (
          <RainfallOverlay stations={rainfall.stations} />
        )}

        {/* IPMA Weather Warnings overlay */}
        {warnings.enabled && warnings.districts.length > 0 && (
          <WarningsOverlay districts={warnings.districts} />
        )}

        {/* GFS Forecast overlays */}
        {temperature.enabled && temperature.data && (
          <TemperatureOverlay data={temperature.data} opacity={0.6} />
        )}

        {humidity.enabled && humidity.data && (
          <HumidityOverlay data={humidity.data} opacity={0.6} />
        )}

        {precipitation.enabled && precipitation.data && (
          <PrecipitationGfsOverlay data={precipitation.data} opacity={0.6} />
        )}

        {cloudCover.enabled && cloudCover.data && (
          <CloudCoverOverlay data={cloudCover.data} opacity={0.5} />
        )}

        {cape.enabled && cape.data && (
          <CapeOverlay data={cape.data} opacity={0.6} />
        )}

        {/* Fire Weather Index overlay */}
        {fireWeather.enabled && fireWeather.data && (
          <FireWeatherOverlay data={fireWeather.data} opacity={0.6} />
        )}

        {/* NASA FIRMS Fire Detection overlay */}
        {fires.enabled && fires.hotspots.length > 0 && (
          <FiresOverlay hotspots={fires.hotspots} />
        )}

        {/* Aurora Borealis/Australis overlay */}
        {aurora.enabled && aurora.data && (
          <AuroraOverlay data={aurora.data} opacity={0.7} />
        )}

        {/* Air Quality overlay (WAQI stations, IDW interpolated) */}
        {airQuality.enabled && airQuality.data && (
          <AirQualityOverlay data={airQuality.data} />
        )}

        {/* UV Index overlay (GFS ozone data) */}
        {uvIndex.enabled && uvIndex.data && (
          <UvIndexOverlay data={uvIndex.data} />
        )}

        {/* Ocean Waves overlay (PacIOOS WAVEWATCH III) */}
        {waves.enabled && waves.data && (
          <WavesOverlay data={waves.data} opacity={0.7} />
        )}

        {/* Sea Surface Temperature overlay (NOAA OISST) */}
        {sst.enabled && sst.data && (
          <SstOverlay data={sst.data} opacity={0.6} />
        )}

        {/* Ocean Currents overlay (NOAA CoastWatch ERDDAP) */}
        {oceanCurrents.enabled && oceanCurrents.data && (
          <OceanCurrentsOverlay data={oceanCurrents.data} />
        )}

        {/* Radio Data overlays */}
        {/* Aircraft (ADS-B) overlay */}
        {aircraft.enabled && (
          <AircraftOverlay
            aircraft={aircraft.aircraft}
            onBoundsChange={aircraft.updateBounds}
          />
        )}

        {/* Lightning overlay (Blitzortung) */}
        {lightning.enabled && lightning.strikes.length > 0 && (
          <LightningOverlay strikes={lightning.strikes} />
        )}

        {/* KiwiSDR WebSDR stations overlay */}
        {kiwisdr.enabled && kiwisdr.stations.length > 0 && (
          <KiwiSdrOverlay stations={kiwisdr.stations} />
        )}

        {/* APRS amateur radio stations overlay */}
        {aprs.enabled && (
          <AprsOverlay
            stations={aprs.stations}
            onBoundsChange={aprs.updateBounds}
          />
        )}

        {/* Combined Ionosphere overlay (Space Weather + TEC) */}
        {ionosphere.enabled && (
          <IonosphereOverlay
            spaceWeather={ionosphere.spaceWeather}
            tecData={ionosphere.tecData}
          />
        )}

        {/* Route polyline (navigation route) */}
        {routeGeometry && routeGeometry.length >= 2 && (
          <RouteOverlay geometry={routeGeometry} />
        )}

        {/* User location (blue dot + ambient weather) */}
        {userLocation && (
          <UserLocationMarker
            position={userLocation}
            weather={locationWeather.data}
            overlayValues={userOverlayValues}
            locationLabel={tMap("yourLocation")}
            reportLabel={tReports("reportIncident")}
            onReportIncident={
              onMapClick
                ? () => onMapClick(userLocation[0], userLocation[1])
                : undefined
            }
          />
        )}

        {/* User's new report pin (yellow) */}
        {pinLocation && (
          <PinLocationMarker
            position={pinLocation}
            weather={pinWeather.data}
            overlayValues={pinOverlayValues}
            locationLabel={tMap("yourLocation")}
            reportLabel={tReports("reportIncident")}
          />
        )}

        {/* Clustered report markers */}
        <MarkerClusterGroup
          markers={clusteredMarkers}
          iconCreateFunction={createClusterIcon}
          maxClusterRadius={35}
        />
      </MapContainer>

      {/* Overlay controls (floating sidebar on map left side) */}
      <OverlayControls
        weather={weather}
        seismic={seismic}
        prociv={prociv}
        gdacs={gdacs}
        rainfall={rainfall}
        warnings={warnings}
        wind={wind}
        temperature={temperature}
        humidity={humidity}
        precipitation={precipitation}
        cloudCover={cloudCover}
        cape={cape}
        fireWeather={fireWeather}
        fires={fires}
        aurora={aurora}
        airQuality={airQuality}
        uvIndex={uvIndex}
        waves={waves}
        oceanCurrents={oceanCurrents}
        sst={sst}
        aircraft={aircraft}
        lightning={lightning}
        kiwisdr={kiwisdr}
        aprs={aprs}
        ionosphere={ionosphere}
        terminator={terminator}
      />
    </div>
  );
}
