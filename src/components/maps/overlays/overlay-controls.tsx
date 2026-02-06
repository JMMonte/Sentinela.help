"use client";

import { useState, useEffect, useRef, useLayoutEffect } from "react";
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
import type { WeatherLayer } from "@/lib/overlays/weather-api";

export type OverlayControlsProps = {
  weather: WeatherOverlayState;
  seismic: SeismicOverlayState;
  prociv: ProCivOverlayState;
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
}: OverlayControlsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["image", "flow", "hazards"])
  );
  const [headerPortal, setHeaderPortal] = useState<HTMLElement | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollTopRef = useRef(0);

  useEffect(() => {
    setHeaderPortal(document.getElementById("header-actions"));
  }, []);

  // Restore scroll position synchronously before paint
  useLayoutEffect(() => {
    if (scrollRef.current && scrollTopRef.current > 0) {
      scrollRef.current.scrollTop = scrollTopRef.current;
    }
  });

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
  const hasHazards = seismic.isAvailable || prociv.isAvailable || warnings.isAvailable || fires.isAvailable || rainfall.isAvailable;
  const hasImageOverlays = hasWeatherTiles || hasGfsOverlays || hasOceanOverlays || hasEnvOverlays;

  const anyAvailable = hasImageOverlays || hasFlowOverlays || hasHazards;

  if (!anyAvailable) return null;

  const hasActiveOverlay = activeImage !== null || activeFlow !== null ||
    seismic.enabled || prociv.enabled || warnings.enabled || fires.enabled || rainfall.enabled;

  const isAnyLoading =
    temperature.isLoading || humidity.isLoading || precipitation.isLoading ||
    cloudCover.isLoading || cape.isLoading || fireWeather.isLoading ||
    waves.isLoading || sst.isLoading || airQuality.isLoading || uvIndex.isLoading ||
    aurora.isLoading || wind.isLoading || oceanCurrents.isLoading ||
    seismic.isLoading || prociv.isLoading || warnings.isLoading || fires.isLoading || rainfall.isLoading;

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
            "fixed left-3 top-16 z-[9999] w-56 max-h-[calc(100vh-6rem)] rounded-xl shadow-sm overflow-hidden",
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
          <div
            ref={scrollRef}
            onScroll={(e) => { scrollTopRef.current = e.currentTarget.scrollTop; }}
            className="overflow-y-auto flex-1 p-2 space-y-1 overscroll-contain"
          >
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
                      return (
                        <RadioItem
                          key={layer.id}
                          name="image"
                          checked={activeImage === value}
                          onChange={() => setImageOverlay(value)}
                          icon={<Cloud className="size-3.5" />}
                          label={layer.label}
                        />
                      );
                    })}
                  </div>
                )}

                {hasGfsOverlays && (
                  <div className="space-y-0.5 mt-2">
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground px-1">Forecast</span>
                    {temperature.isAvailable && (
                      <RadioItem name="image" checked={activeImage === "gfs-temperature"} onChange={() => setImageOverlay("gfs-temperature")} icon={<Thermometer className="size-3.5" />} label="Temperature" />
                    )}
                    {humidity.isAvailable && (
                      <RadioItem name="image" checked={activeImage === "gfs-humidity"} onChange={() => setImageOverlay("gfs-humidity")} icon={<Droplets className="size-3.5" />} label="Humidity" />
                    )}
                    {precipitation.isAvailable && (
                      <RadioItem name="image" checked={activeImage === "gfs-precipitation"} onChange={() => setImageOverlay("gfs-precipitation")} icon={<CloudRain className="size-3.5" />} label="Precipitation" />
                    )}
                    {cloudCover.isAvailable && (
                      <RadioItem name="image" checked={activeImage === "gfs-cloudCover"} onChange={() => setImageOverlay("gfs-cloudCover")} icon={<Cloudy className="size-3.5" />} label="Cloud Cover" />
                    )}
                    {cape.isAvailable && (
                      <RadioItem name="image" checked={activeImage === "gfs-cape"} onChange={() => setImageOverlay("gfs-cape")} icon={<Zap className="size-3.5" />} label="Storm Potential" />
                    )}
                    {fireWeather.isAvailable && (
                      <RadioItem name="image" checked={activeImage === "gfs-fireWeather"} onChange={() => setImageOverlay("gfs-fireWeather")} icon={<Flame className="size-3.5 text-orange-500" />} label="Fire Weather" />
                    )}
                  </div>
                )}

                {hasOceanOverlays && (
                  <div className="space-y-0.5 mt-2">
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground px-1">Ocean</span>
                    {waves.isAvailable && (
                      <RadioItem name="image" checked={activeImage === "ocean-waves"} onChange={() => setImageOverlay("ocean-waves")} icon={<Waves className="size-3.5 text-blue-500" />} label="Wave Height" />
                    )}
                    {sst.isAvailable && (
                      <RadioItem name="image" checked={activeImage === "ocean-sst"} onChange={() => setImageOverlay("ocean-sst")} icon={<Anchor className="size-3.5 text-cyan-500" />} label="Sea Temperature" />
                    )}
                  </div>
                )}

                {hasEnvOverlays && (
                  <div className="space-y-0.5 mt-2">
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground px-1">Environment</span>
                    {airQuality.isAvailable && (
                      <RadioItem name="image" checked={activeImage === "env-airQuality"} onChange={() => setImageOverlay("env-airQuality")} icon={<Wind className="size-3.5 text-emerald-500" />} label="Air Quality" />
                    )}
                    {uvIndex.isAvailable && (
                      <RadioItem name="image" checked={activeImage === "env-uvIndex"} onChange={() => setImageOverlay("env-uvIndex")} icon={<Sun className="size-3.5 text-yellow-500" />} label="UV Index" />
                    )}
                    {aurora.isAvailable && (
                      <RadioItem name="image" checked={activeImage === "env-aurora"} onChange={() => setImageOverlay("env-aurora")} icon={<Sparkles className="size-3.5 text-green-400" />} label="Aurora" />
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

            {/* Flow Overlays */}
            {hasFlowOverlays && (
              <CollapsibleSection
                title="Flow Animation"
                expanded={expandedSections.has("flow")}
                onToggle={() => toggleSection("flow")}
              >
                {wind.isAvailable && (
                  <RadioItem name="flow" checked={activeFlow === "wind"} onChange={() => setFlowOverlay("wind")} icon={<Wind className="size-3.5" />} label="Wind Flow" />
                )}
                {oceanCurrents.isAvailable && (
                  <RadioItem name="flow" checked={activeFlow === "currents"} onChange={() => setFlowOverlay("currents")} icon={<Navigation className="size-3.5 text-sky-400" />} label="Ocean Currents" />
                )}
                <RadioItem name="flow" checked={activeFlow === null} onChange={() => setFlowOverlay(null)} label="None" className="text-muted-foreground" />
              </CollapsibleSection>
            )}

            {/* Hazards */}
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
                  />
                )}
              </CollapsibleSection>
            )}
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

// Radio item for mutually exclusive options
function RadioItem({
  name,
  checked,
  onChange,
  icon,
  label,
  className,
}: {
  name: string;
  checked: boolean;
  onChange: () => void;
  icon?: React.ReactNode;
  label: string;
  className?: string;
}) {
  return (
    <label
      className={cn(
        "flex items-center gap-2 px-2 py-1 text-xs rounded-md cursor-pointer transition-colors",
        "hover:bg-black/5 dark:hover:bg-white/5",
        checked && "bg-primary/10 text-primary",
        className
      )}
    >
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onChange}
        className="sr-only"
      />
      <span className={cn("size-2 rounded-full border-2 flex-shrink-0", checked ? "border-primary bg-primary" : "border-muted-foreground/50")} />
      {icon}
      <span className="truncate">{label}</span>
    </label>
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
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  icon?: React.ReactNode;
  label: string;
  status?: string;
  isLoading?: boolean;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "flex items-center gap-2 px-2 py-1 text-xs rounded-md cursor-pointer transition-colors w-full text-left",
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
      {icon}
      <span className="truncate flex-1">{label}</span>
      {isLoading && <RefreshCw className="size-3 animate-spin text-muted-foreground" />}
      {!isLoading && status && <span className="text-[10px] text-muted-foreground">{status}</span>}
    </button>
  );
}
