"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Layers,
  Cloud,
  Activity,
  Shield,
  Droplets,
  AlertTriangle,
  RefreshCw,
  Thermometer,
  Cloudy,
  CloudRain,
  Zap,
  Flame,
  Sparkles,
  Wind,
  Waves,
  Sun,
  Navigation,
  Anchor,
  ChevronDown,
  ChevronRight,
  X,
  Plane,
  Radio,
  Satellite,
  Info,
  Globe,
  Sunset,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { WeatherOverlayState } from "../hooks/use-weather-overlay";
import type { SeismicOverlayState } from "../hooks/use-seismic-overlay";
import type { ProCivOverlayState } from "../hooks/use-prociv-overlay";
import type { RainfallOverlayState } from "../hooks/use-rainfall-overlay";
import type { WarningsOverlayState } from "../hooks/use-warnings-overlay";
import type { WindOverlayState } from "../hooks/use-wind-overlay";
import type { TemperatureOverlayState } from "../hooks/use-temperature-overlay";
import type { HumidityOverlayState } from "../hooks/use-humidity-overlay";
import type { PrecipitationOverlayState } from "../hooks/use-precipitation-overlay";
import type { CloudCoverOverlayState } from "../hooks/use-cloud-cover-overlay";
import type { CapeOverlayState } from "../hooks/use-cape-overlay";
import type { FireWeatherOverlayState } from "../hooks/use-fire-weather-overlay";
import type { FiresOverlayState } from "../hooks/use-fires-overlay";
import type { AuroraOverlayState } from "../hooks/use-aurora-overlay";
import type { AirQualityOverlayState } from "../hooks/use-air-quality-overlay";
import type { UvIndexOverlayState } from "../hooks/use-uv-index-overlay";
import type { WavesOverlayState } from "../hooks/use-waves-overlay";
import type { OceanCurrentsOverlayState } from "../hooks/use-ocean-currents-overlay";
import type { SstOverlayState } from "../hooks/use-sst-overlay";
import type { AircraftOverlayState } from "../hooks/use-aircraft-overlay";
import type { LightningOverlayState } from "../hooks/use-lightning-overlay";
import type { KiwiSdrOverlayState } from "../hooks/use-kiwisdr-overlay";
import type { AprsOverlayState } from "../hooks/use-aprs-overlay";
import type { IonosphereOverlayState } from "../hooks/use-ionosphere-overlay";
import type { GdacsOverlayState } from "../hooks/use-gdacs-overlay";
import type { TerminatorOverlayState } from "../hooks/use-terminator-overlay";
import type { WeatherLayer } from "@/lib/overlays/weather-api";

// Info descriptions for OpenWeatherMap real-time layers
function getWeatherLayerInfo(layerId: string): string {
  const infoMap: Record<string, string> = {
    precipitation_new: "OpenWeatherMap real-time precipitation radar. Updates every 10 minutes.",
    clouds_new: "OpenWeatherMap real-time cloud coverage. Updates every 10 minutes.",
    temp_new: "OpenWeatherMap real-time temperature. Updates every 10 minutes.",
    wind_new: "OpenWeatherMap real-time wind speed. Updates every 10 minutes.",
    pressure_new: "OpenWeatherMap real-time sea level pressure. Updates every 10 minutes.",
  };
  return infoMap[layerId] || "OpenWeatherMap real-time weather data.";
}

export type OverlayControlsProps = {
  weather: WeatherOverlayState;
  seismic: SeismicOverlayState;
  prociv: ProCivOverlayState;
  gdacs: GdacsOverlayState;
  rainfall: RainfallOverlayState;
  warnings: WarningsOverlayState;
  wind: WindOverlayState;
  temperature: TemperatureOverlayState;
  humidity: HumidityOverlayState;
  precipitation: PrecipitationOverlayState;
  cloudCover: CloudCoverOverlayState;
  cape: CapeOverlayState;
  fireWeather: FireWeatherOverlayState;
  fires: FiresOverlayState;
  aurora: AuroraOverlayState;
  airQuality: AirQualityOverlayState;
  uvIndex: UvIndexOverlayState;
  waves: WavesOverlayState;
  oceanCurrents: OceanCurrentsOverlayState;
  sst: SstOverlayState;
  // Radio data overlays
  aircraft: AircraftOverlayState;
  lightning: LightningOverlayState;
  kiwisdr: KiwiSdrOverlayState;
  aprs: AprsOverlayState;
  ionosphere: IonosphereOverlayState;
  // Utility overlays
  terminator: TerminatorOverlayState;
};

type ImageOverlay =
  | "owm-precipitation"
  | "owm-clouds"
  | "owm-temperature"
  | "owm-wind"
  | "owm-pressure"
  | "gfs-temperature"
  | "gfs-humidity"
  | "gfs-precipitation"
  | "gfs-cloudCover"
  | "gfs-cape"
  | "gfs-fireWeather"
  | "ocean-waves"
  | "ocean-sst"
  | "env-airQuality"
  | "env-uvIndex"
  | "env-aurora"
  | null;

type FlowOverlay = "wind" | "currents" | null;

export function OverlayControls({
  weather,
  seismic,
  prociv,
  gdacs,
  rainfall,
  warnings,
  wind,
  temperature,
  humidity,
  precipitation,
  cloudCover,
  cape,
  fireWeather,
  fires,
  aurora,
  airQuality,
  uvIndex,
  waves,
  oceanCurrents,
  sst,
  aircraft,
  lightning,
  kiwisdr,
  aprs,
  ionosphere,
  terminator,
}: OverlayControlsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["image", "flow", "hazards", "radio"])
  );
  const [headerPortal, setHeaderPortal] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setHeaderPortal(document.getElementById("header-actions"));
  }, []);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  // Image overlay management
  const getActiveImageOverlay = (): ImageOverlay => {
    if (weather.enabled) return `owm-${weather.activeLayer.replace("_new", "")}` as ImageOverlay;
    if (temperature.enabled) return "gfs-temperature";
    if (humidity.enabled) return "gfs-humidity";
    if (precipitation.enabled) return "gfs-precipitation";
    if (cloudCover.enabled) return "gfs-cloudCover";
    if (cape.enabled) return "gfs-cape";
    if (fireWeather.enabled) return "gfs-fireWeather";
    if (waves.enabled) return "ocean-waves";
    if (sst.enabled) return "ocean-sst";
    if (airQuality.enabled) return "env-airQuality";
    if (uvIndex.enabled) return "env-uvIndex";
    if (aurora.enabled) return "env-aurora";
    return null;
  };

  const setImageOverlay = (overlay: ImageOverlay) => {
    weather.setEnabled(false);
    temperature.setEnabled(false);
    humidity.setEnabled(false);
    precipitation.setEnabled(false);
    cloudCover.setEnabled(false);
    cape.setEnabled(false);
    fireWeather.setEnabled(false);
    waves.setEnabled(false);
    sst.setEnabled(false);
    airQuality.setEnabled(false);
    uvIndex.setEnabled(false);
    aurora.setEnabled(false);

    if (!overlay) return;

    if (overlay.startsWith("owm-")) {
      weather.setEnabled(true);
      weather.setActiveLayer((overlay.replace("owm-", "") + "_new") as WeatherLayer);
    } else if (overlay === "gfs-temperature") temperature.setEnabled(true);
    else if (overlay === "gfs-humidity") humidity.setEnabled(true);
    else if (overlay === "gfs-precipitation") precipitation.setEnabled(true);
    else if (overlay === "gfs-cloudCover") cloudCover.setEnabled(true);
    else if (overlay === "gfs-cape") cape.setEnabled(true);
    else if (overlay === "gfs-fireWeather") fireWeather.setEnabled(true);
    else if (overlay === "ocean-waves") waves.setEnabled(true);
    else if (overlay === "ocean-sst") sst.setEnabled(true);
    else if (overlay === "env-airQuality") airQuality.setEnabled(true);
    else if (overlay === "env-uvIndex") uvIndex.setEnabled(true);
    else if (overlay === "env-aurora") aurora.setEnabled(true);
  };

  // Flow overlay management
  const getActiveFlowOverlay = (): FlowOverlay => {
    if (wind.enabled) return "wind";
    if (oceanCurrents.enabled) return "currents";
    return null;
  };

  const setFlowOverlay = (flow: FlowOverlay) => {
    wind.setEnabled(false);
    oceanCurrents.setEnabled(false);
    if (flow === "wind") wind.setEnabled(true);
    if (flow === "currents") oceanCurrents.setEnabled(true);
  };

  const activeImage = getActiveImageOverlay();
  const activeFlow = getActiveFlowOverlay();

  // Availability
  const hasWeatherTiles = weather.isAvailable;
  const hasGfsOverlays = temperature.isAvailable || humidity.isAvailable || precipitation.isAvailable || cloudCover.isAvailable || cape.isAvailable || fireWeather.isAvailable;
  const hasOceanOverlays = waves.isAvailable || sst.isAvailable;
  const hasEnvOverlays = airQuality.isAvailable || uvIndex.isAvailable || aurora.isAvailable;
  const hasFlowOverlays = wind.isAvailable || oceanCurrents.isAvailable;
  const hasHazards = seismic.isAvailable || prociv.isAvailable || gdacs.isAvailable || warnings.isAvailable || fires.isAvailable || rainfall.isAvailable;
  const hasRadioOverlays = aircraft.isAvailable || lightning.isAvailable || kiwisdr.isAvailable || aprs.isAvailable || ionosphere.isAvailable;
  const hasUtilityOverlays = terminator.isAvailable;
  const hasImageOverlays = hasWeatherTiles || hasGfsOverlays || hasOceanOverlays || hasEnvOverlays;

  const anyAvailable = hasImageOverlays || hasFlowOverlays || hasHazards || hasRadioOverlays || hasUtilityOverlays;

  if (!anyAvailable) return null;

  const hasActiveOverlay = activeImage !== null || activeFlow !== null ||
    seismic.enabled || prociv.enabled || warnings.enabled || fires.enabled || rainfall.enabled ||
    aircraft.enabled || lightning.enabled || kiwisdr.enabled || aprs.enabled || ionosphere.enabled;

  const isAnyLoading =
    temperature.isLoading || humidity.isLoading || precipitation.isLoading ||
    cloudCover.isLoading || cape.isLoading || fireWeather.isLoading ||
    waves.isLoading || sst.isLoading || airQuality.isLoading || uvIndex.isLoading ||
    aurora.isLoading || wind.isLoading || oceanCurrents.isLoading ||
    seismic.isLoading || prociv.isLoading || warnings.isLoading || fires.isLoading || rainfall.isLoading ||
    aircraft.isLoading || lightning.isLoading || kiwisdr.isLoading || aprs.isLoading || ionosphere.isLoading;

  // Header toggle button (portaled to topbar)
  const headerButton = (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(!isOpen)}
            className={cn(
              "h-10 w-10 sm:h-8 sm:w-8 rounded-full",
              hasActiveOverlay && "text-primary",
              isOpen && "bg-accent"
            )}
          >
            {isAnyLoading ? (
              <RefreshCw className="size-4 animate-spin" />
            ) : (
              <Layers className="size-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>Map layers</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  return (
    <>
      {/* Portal toggle button to header */}
      {headerPortal && createPortal(headerButton, headerPortal)}

      {/* Floating sidebar panel - portaled to body, always mounted to preserve scroll */}
      {createPortal(
        <div
          className={cn(
            "fixed left-3 right-3 sm:right-auto top-16 z-[9999] sm:w-56 max-h-[50vh] sm:max-h-[calc(100vh-6rem)] rounded-xl shadow-sm overflow-hidden",
            "bg-background/80 backdrop-blur-md supports-backdrop-filter:bg-background/60",
            "border",
            "flex flex-col",
            "transition-opacity duration-150",
            isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-black/5 dark:border-white/5">
            <span className="text-sm font-medium">Layers</span>
            <Button
              variant="ghost"
              size="icon"
              className="size-6 -mr-1"
              onClick={() => setIsOpen(false)}
            >
              <X className="size-3.5" />
            </Button>
          </div>

          {/* Scrollable content */}
          <div className="overflow-y-auto flex-1 p-2 overscroll-contain">
            {/* Mobile: two-column grid with fixed column assignment */}
            <div className="grid grid-cols-2 gap-1 sm:flex sm:flex-col sm:gap-0 sm:space-y-1">
              {/* Column 1 on mobile: Image Layers + Hazards */}
              <div className="space-y-1 sm:contents">
                {/* Image Overlays */}
                {hasImageOverlays && (
                  <CollapsibleSection
                    title="Image Layers"
                    expanded={expandedSections.has("image")}
                    onToggle={() => toggleSection("image")}
                  >
                {hasWeatherTiles && (
                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground px-1">Real-time</span>
                    {weather.availableLayers.map((layer) => {
                      const value = `owm-${layer.id.replace("_new", "")}` as ImageOverlay;
                      const info = getWeatherLayerInfo(layer.id);
                      return (
                        <RadioItem
                          key={layer.id}
                          name="image"
                          checked={activeImage === value}
                          onChange={() => setImageOverlay(value)}
                          icon={<Cloud className="size-3.5" />}
                          label={layer.label}
                          info={info}
                        />
                      );
                    })}
                  </div>
                )}

                {hasGfsOverlays && (
                  <div className="space-y-0.5 mt-2">
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground px-1">Forecast</span>
                    {temperature.isAvailable && (
                      <RadioItem name="image" checked={activeImage === "gfs-temperature"} onChange={() => setImageOverlay("gfs-temperature")} icon={<Thermometer className="size-3.5" />} label="Temperature" info="NOAA GFS 2m temperature forecast. Updates every 6 hours." />
                    )}
                    {humidity.isAvailable && (
                      <RadioItem name="image" checked={activeImage === "gfs-humidity"} onChange={() => setImageOverlay("gfs-humidity")} icon={<Droplets className="size-3.5" />} label="Humidity" info="NOAA GFS relative humidity forecast. Updates every 6 hours." />
                    )}
                    {precipitation.isAvailable && (
                      <RadioItem name="image" checked={activeImage === "gfs-precipitation"} onChange={() => setImageOverlay("gfs-precipitation")} icon={<CloudRain className="size-3.5" />} label="Precipitation" info="NOAA GFS total precipitation forecast. Updates every 6 hours." />
                    )}
                    {cloudCover.isAvailable && (
                      <RadioItem name="image" checked={activeImage === "gfs-cloudCover"} onChange={() => setImageOverlay("gfs-cloudCover")} icon={<Cloudy className="size-3.5" />} label="Cloud Cover" info="NOAA GFS total cloud cover forecast. Updates every 6 hours." />
                    )}
                    {cape.isAvailable && (
                      <RadioItem name="image" checked={activeImage === "gfs-cape"} onChange={() => setImageOverlay("gfs-cape")} icon={<Zap className="size-3.5" />} label="Storm Potential" info="NOAA GFS CAPE (storm energy) forecast. Higher values indicate severe weather potential." />
                    )}
                    {fireWeather.isAvailable && (
                      <RadioItem name="image" checked={activeImage === "gfs-fireWeather"} onChange={() => setImageOverlay("gfs-fireWeather")} icon={<Flame className="size-3.5 text-orange-500" />} label="Fire Weather" info="Fire Weather Index based on temperature and humidity. Higher values = greater fire risk." />
                    )}
                  </div>
                )}

                {hasOceanOverlays && (
                  <div className="space-y-0.5 mt-2">
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground px-1">Ocean</span>
                    {waves.isAvailable && (
                      <RadioItem name="image" checked={activeImage === "ocean-waves"} onChange={() => setImageOverlay("ocean-waves")} icon={<Waves className="size-3.5 text-blue-500" />} label="Wave Height" info="NOAA WaveWatch III significant wave height. Updates every 3 hours." />
                    )}
                    {sst.isAvailable && (
                      <RadioItem name="image" checked={activeImage === "ocean-sst"} onChange={() => setImageOverlay("ocean-sst")} icon={<Anchor className="size-3.5 text-cyan-500" />} label="Sea Temperature" info="NOAA sea surface temperature analysis. Updates daily." />
                    )}
                  </div>
                )}

                {hasEnvOverlays && (
                  <div className="space-y-0.5 mt-2">
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground px-1">Environment</span>
                    {airQuality.isAvailable && (
                      <RadioItem name="image" checked={activeImage === "env-airQuality"} onChange={() => setImageOverlay("env-airQuality")} icon={<Wind className="size-3.5 text-emerald-500" />} label="Air Quality" info="World Air Quality Index (WAQI) PM2.5 data from monitoring stations." />
                    )}
                    {uvIndex.isAvailable && (
                      <RadioItem name="image" checked={activeImage === "env-uvIndex"} onChange={() => setImageOverlay("env-uvIndex")} icon={<Sun className="size-3.5 text-yellow-500" />} label="UV Index" info="TEMIS UV index from satellite observations. Higher values = more sun protection needed." />
                    )}
                    {aurora.isAvailable && (
                      <RadioItem name="image" checked={activeImage === "env-aurora"} onChange={() => setImageOverlay("env-aurora")} icon={<Sparkles className="size-3.5 text-green-400" />} label="Aurora" info="NOAA aurora forecast showing northern/southern lights visibility probability." />
                    )}
                  </div>
                )}

                <RadioItem
                  name="image"
                  checked={activeImage === null}
                  onChange={() => setImageOverlay(null)}
                  label="None"
                  className="text-muted-foreground mt-1"
                />
              </CollapsibleSection>
            )}

                {/* Hazards - in column 1 on mobile */}
                {hasHazards && (
              <CollapsibleSection
                title="Hazards"
                expanded={expandedSections.has("hazards")}
                onToggle={() => toggleSection("hazards")}
              >
                {seismic.isAvailable && (
                  <CheckboxItem
                    checked={seismic.enabled}
                    onChange={seismic.setEnabled}
                    icon={<Activity className="size-3.5" />}
                    label="Earthquakes"
                    status={seismic.enabled ? `${seismic.earthquakes.length}` : undefined}
                    isLoading={seismic.isLoading}
                    info="USGS global earthquake data. Filtered by time selector. Updates every minute."
                  />
                )}
                {prociv.isAvailable && (
                  <CheckboxItem
                    checked={prociv.enabled}
                    onChange={prociv.setEnabled}
                    icon={<Shield className="size-3.5" />}
                    label="ProCiv"
                    status={prociv.enabled ? `${prociv.incidents.length}` : undefined}
                    isLoading={prociv.isLoading}
                    info="Portuguese Civil Protection incidents. Filtered by time selector. Updates every 2 minutes."
                  />
                )}
                {gdacs.isAvailable && (
                  <CheckboxItem
                    checked={gdacs.enabled}
                    onChange={gdacs.setEnabled}
                    icon={<Globe className="size-3.5 text-orange-500" />}
                    label="Global Disasters"
                    status={gdacs.enabled ? `${gdacs.events.length}` : undefined}
                    isLoading={gdacs.isLoading}
                    info="GDACS global disaster alerts: earthquakes, floods, cyclones, volcanoes, wildfires, droughts. Updates every 10 minutes."
                  />
                )}
                {warnings.isAvailable && (
                  <CheckboxItem
                    checked={warnings.enabled}
                    onChange={warnings.setEnabled}
                    icon={<AlertTriangle className="size-3.5 text-amber-500" />}
                    label="IPMA Warnings"
                    status={warnings.enabled ? `${warnings.districts.length}` : undefined}
                    isLoading={warnings.isLoading}
                    info="Portuguese weather warnings by district from IPMA. Updates every 15 minutes."
                  />
                )}
                {fires.isAvailable && (
                  <CheckboxItem
                    checked={fires.enabled}
                    onChange={fires.setEnabled}
                    icon={<Flame className="size-3.5 text-red-500" />}
                    label="Active Fires"
                    status={fires.enabled ? `${fires.hotspots.length}` : undefined}
                    isLoading={fires.isLoading}
                    info="NASA FIRMS satellite fire detection. Shows last 24h of hotspots. Updates every 10 minutes."
                  />
                )}
                {rainfall.isAvailable && (
                  <CheckboxItem
                    checked={rainfall.enabled}
                    onChange={rainfall.setEnabled}
                    icon={<Droplets className="size-3.5 text-blue-400" />}
                    label="Rainfall"
                    status={rainfall.enabled ? `${rainfall.stations.length}` : undefined}
                    isLoading={rainfall.isLoading}
                    info="IPMA weather station rainfall observations. Filtered by time selector. Updates hourly."
                  />
                )}
              </CollapsibleSection>
            )}
              </div>

              {/* Column 2 on mobile: Flow Animation + Radio & Tracking */}
              <div className="space-y-1 sm:contents">
                {/* Flow Overlays */}
                {hasFlowOverlays && (
                  <CollapsibleSection
                    title="Flow Animation"
                    expanded={expandedSections.has("flow")}
                    onToggle={() => toggleSection("flow")}
                  >
                    {wind.isAvailable && (
                      <RadioItem name="flow" checked={activeFlow === "wind"} onChange={() => setFlowOverlay("wind")} icon={<Wind className="size-3.5" />} label="Wind Flow" info="NOAA GFS global wind forecast. Animated particle flow visualization." />
                    )}
                    {oceanCurrents.isAvailable && (
                      <RadioItem name="flow" checked={activeFlow === "currents"} onChange={() => setFlowOverlay("currents")} icon={<Navigation className="size-3.5 text-sky-400" />} label="Ocean Currents" info="NOAA OSCAR ocean surface currents. Animated flow visualization." />
                    )}
                    <RadioItem name="flow" checked={activeFlow === null} onChange={() => setFlowOverlay(null)} label="None" className="text-muted-foreground" />
                  </CollapsibleSection>
                )}

                {/* Radio Data */}
                {hasRadioOverlays && (
              <CollapsibleSection
                title="Radio & Tracking"
                expanded={expandedSections.has("radio")}
                onToggle={() => toggleSection("radio")}
              >
                {aircraft.isAvailable && (
                  <CheckboxItem
                    checked={aircraft.enabled}
                    onChange={aircraft.setEnabled}
                    icon={<Plane className="size-3.5 text-sky-500" />}
                    label="Aircraft (ADS-B)"
                    status={aircraft.enabled ? `${aircraft.aircraft.length}` : undefined}
                    isLoading={aircraft.isLoading}
                    info="Live ADS-B aircraft positions via OpenSky Network. Updates on map pan/zoom."
                  />
                )}
                {lightning.isAvailable && (
                  <CheckboxItem
                    checked={lightning.enabled}
                    onChange={lightning.setEnabled}
                    icon={<Zap className="size-3.5 text-yellow-400" />}
                    label="Lightning"
                    status={lightning.enabled ? `${lightning.strikes.length}` : undefined}
                    isLoading={lightning.isLoading}
                    info="Blitzortung global lightning detection network. Shows last 30 minutes of strikes."
                  />
                )}
                {kiwisdr.isAvailable && (
                  <CheckboxItem
                    checked={kiwisdr.enabled}
                    onChange={kiwisdr.setEnabled}
                    icon={<Radio className="size-3.5 text-green-500" />}
                    label="WebSDR Stations"
                    status={kiwisdr.enabled ? `${kiwisdr.stations.length}` : undefined}
                    isLoading={kiwisdr.isLoading}
                    info="KiwiSDR web-based software-defined radio receivers worldwide. Click to listen live."
                  />
                )}
                {aprs.isAvailable && (
                  <CheckboxItem
                    checked={aprs.enabled}
                    onChange={aprs.setEnabled}
                    icon={<Radio className="size-3.5 text-orange-500" />}
                    label="APRS Stations"
                    status={aprs.enabled ? `${aprs.stations.length}` : undefined}
                    isLoading={aprs.isLoading}
                    info="Amateur radio APRS network stations. Updates on map pan/zoom."
                  />
                )}
                {ionosphere.isAvailable && (
                  <CheckboxItem
                    checked={ionosphere.enabled}
                    onChange={ionosphere.setEnabled}
                    icon={<Satellite className="size-3.5 text-indigo-500" />}
                    label="Ionosphere"
                    status={ionosphere.enabled && ionosphere.spaceWeather ? `Kp ${ionosphere.spaceWeather.kpIndex.toFixed(1)}` : undefined}
                    isLoading={ionosphere.isLoading}
                    info="NOAA space weather data: Kp index, solar flux, X-ray emissions, and TEC map."
                  />
                )}
              </CollapsibleSection>
            )}

                {/* Utility Overlays */}
                {hasUtilityOverlays && (
                  <CollapsibleSection
                    title="Utility"
                    expanded={expandedSections.has("utility")}
                    onToggle={() => toggleSection("utility")}
                  >
                    {terminator.isAvailable && (
                      <>
                        <CheckboxItem
                          checked={terminator.enabled}
                          onChange={terminator.setEnabled}
                          icon={<Sunset className="size-3.5 text-orange-400" />}
                          label="Day/Night"
                          info="Shows the day/night terminator line - the boundary between sunlit and dark areas on Earth."
                        />
                        {terminator.enabled && (
                          <div className="ml-5">
                            <CheckboxItem
                              checked={terminator.animate}
                              onChange={terminator.setAnimate}
                              label="Animate"
                              info="Animate the terminator in real-time. Uses more CPU."
                            />
                          </div>
                        )}
                      </>
                    )}
                  </CollapsibleSection>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

// Collapsible section component
function CollapsibleSection({
  title,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg bg-black/[0.03] dark:bg-white/[0.03]">
      <button
        onClick={onToggle}
        className="flex items-center justify-between w-full px-2 py-1.5 text-xs font-medium hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors"
      >
        <span>{title}</span>
        {expanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
      </button>
      {expanded && <div className="px-1 pb-2 space-y-0.5">{children}</div>}
    </div>
  );
}

// Radio item for mutually exclusive options (button-based to avoid scroll issues with hidden inputs)
function RadioItem({
  checked,
  onChange,
  icon,
  label,
  className,
  info,
}: {
  name?: string; // kept for API compatibility but not used
  checked: boolean;
  onChange: () => void;
  icon?: React.ReactNode;
  label: string;
  className?: string;
  info?: string;
}) {
  return (
    <div className="flex items-center gap-0.5">
      <button
        type="button"
        role="radio"
        aria-checked={checked}
        onClick={onChange}
        className={cn(
          "flex items-center gap-2 px-2 py-1 text-xs rounded-md cursor-pointer transition-colors flex-1 min-w-0 text-left",
          "hover:bg-black/5 dark:hover:bg-white/5",
          checked && "bg-primary/10 text-primary",
          className
        )}
      >
        <span className={cn("size-2 rounded-full border-2 flex-shrink-0", checked ? "border-primary bg-primary" : "border-muted-foreground/50")} />
        {icon && <span className="flex-shrink-0">{icon}</span>}
        <span className="truncate min-w-0">{label}</span>
      </button>
      {info && (
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="p-1 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <Info className="size-3" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="z-[10000] max-w-[200px] text-xs">
              <p>{info}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}

// Checkbox item for toggleable options
function CheckboxItem({
  checked,
  onChange,
  icon,
  label,
  status,
  isLoading,
  info,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  icon?: React.ReactNode;
  label: string;
  status?: string;
  isLoading?: boolean;
  info?: string;
}) {
  return (
    <div className="flex items-center gap-0.5">
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "flex items-center gap-2 px-2 py-1 text-xs rounded-md cursor-pointer transition-colors flex-1 min-w-0 text-left",
          "hover:bg-black/5 dark:hover:bg-white/5",
          checked && "bg-primary/10"
        )}
      >
        <span className={cn(
          "size-3.5 rounded border flex-shrink-0 flex items-center justify-center transition-colors",
          checked ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/50"
        )}>
          {checked && <svg className="size-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
        </span>
        {icon && <span className="flex-shrink-0">{icon}</span>}
        <span className="truncate flex-1 min-w-0">{label}</span>
        {isLoading && <RefreshCw className="size-3 flex-shrink-0 animate-spin text-muted-foreground" />}
        {!isLoading && status && <span className="text-[10px] flex-shrink-0 text-muted-foreground">{status}</span>}
      </button>
      {info && (
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="p-1 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <Info className="size-3" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="z-[10000] max-w-[200px] text-xs">
              <p>{info}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}
