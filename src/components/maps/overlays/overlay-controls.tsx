"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Layers, Cloud, Activity, Shield, Droplets, AlertTriangle, RefreshCw, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import type { WeatherLayer } from "@/lib/overlays/weather-api";

export type OverlayControlsProps = {
  weather: WeatherOverlayState;
  seismic: SeismicOverlayState;
  prociv: ProCivOverlayState;
  rainfall: RainfallOverlayState;
  warnings: WarningsOverlayState;
};

export function OverlayControls({
  weather,
  seismic,
  prociv,
  rainfall,
  warnings,
}: OverlayControlsProps) {
  const [headerPortal, setHeaderPortal] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setHeaderPortal(document.getElementById("header-actions"));
  }, []);

  // Don't render if no overlays are available
  if (!weather.isAvailable && !seismic.isAvailable && !prociv.isAvailable && !rainfall.isAvailable && !warnings.isAvailable) {
    return null;
  }

  const hasActiveOverlay = weather.enabled || seismic.enabled || prociv.enabled || rainfall.enabled || warnings.enabled;

  const trigger = (
    <TooltipProvider delayDuration={300}>
    <Popover>
        <Tooltip>
          <PopoverTrigger asChild>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-10 w-10 sm:h-8 sm:w-8 rounded-full",
                  hasActiveOverlay && "text-primary"
                )}
                style={{ order: 3 }}
                aria-label="Map layers"
              >
                <Layers className="h-5 w-5 sm:h-4 sm:w-4" />
              </Button>
            </TooltipTrigger>
          </PopoverTrigger>
          <TooltipContent>
            <p>Map layers</p>
          </TooltipContent>
        </Tooltip>
      <PopoverContent align="end" collisionPadding={12} className="w-[calc(100vw-1.5rem)] sm:w-64">
        <div className="grid gap-3">
          <span className="text-sm font-medium">Map Layers</span>

          {/* Weather Layer */}
          {weather.isAvailable && (
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={weather.enabled}
                    onChange={(e) => weather.setEnabled(e.target.checked)}
                    className="rounded accent-primary"
                  />
                  <Cloud className="size-4" />
                  Weather
                </label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="size-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="left" className="max-w-48 text-xs">
                    Real-time weather tiles from OpenWeatherMap (precipitation, clouds, temperature, wind &amp; pressure).
                  </TooltipContent>
                </Tooltip>
              </div>

              {weather.enabled && (
                <div className="grid gap-1 pl-6">
                  {weather.availableLayers.map((layer) => (
                    <label
                      key={layer.id}
                      className="flex items-center gap-2 text-xs cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="weather-layer"
                        checked={weather.activeLayer === layer.id}
                        onChange={() =>
                          weather.setActiveLayer(layer.id as WeatherLayer)
                        }
                        className="accent-primary"
                      />
                      {layer.label}
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Seismic Layer */}
          {seismic.isAvailable && (
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={seismic.enabled}
                    onChange={(e) => seismic.setEnabled(e.target.checked)}
                    className="rounded accent-primary"
                  />
                  <Activity className="size-4" />
                  Earthquakes
                </label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="size-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="left" className="max-w-48 text-xs">
                    Seismic events from the last 24h via USGS Earthquake Hazards Program (earthquake.usgs.gov).
                  </TooltipContent>
                </Tooltip>
              </div>

              {seismic.enabled && (
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {seismic.isLoading
                      ? "Loading..."
                      : `${seismic.earthquakes.length} events`}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => void seismic.refresh()}
                    disabled={seismic.isLoading}
                    title="Refresh"
                  >
                    <RefreshCw
                      className={cn(
                        "size-3",
                        seismic.isLoading && "animate-spin"
                      )}
                    />
                  </Button>
                </div>
              )}

              {seismic.error && (
                <p className="text-xs text-destructive">{seismic.error}</p>
              )}
            </div>
          )}

          {/* ProCiv Layer */}
          {prociv.isAvailable && (
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={prociv.enabled}
                    onChange={(e) => prociv.setEnabled(e.target.checked)}
                    className="rounded accent-primary"
                  />
                  <Shield className="size-4" />
                  ProCiv
                </label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="size-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="left" className="max-w-48 text-xs">
                    Active civil protection incidents in Portugal via Fogos.pt (fires, accidents, weather events).
                  </TooltipContent>
                </Tooltip>
              </div>

              {prociv.enabled && (
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {prociv.isLoading
                      ? "Loading..."
                      : `${prociv.incidents.length} ocorrências`}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => void prociv.refresh()}
                    disabled={prociv.isLoading}
                    title="Refresh"
                  >
                    <RefreshCw
                      className={cn(
                        "size-3",
                        prociv.isLoading && "animate-spin"
                      )}
                    />
                  </Button>
                </div>
              )}

              {prociv.error && (
                <p className="text-xs text-destructive">{prociv.error}</p>
              )}
            </div>
          )}

          {/* Rainfall Layer (IPMA) */}
          {rainfall.isAvailable && (
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rainfall.enabled}
                    onChange={(e) => rainfall.setEnabled(e.target.checked)}
                    className="rounded accent-primary"
                  />
                  <Droplets className="size-4" />
                  Precipitação
                </label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="size-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="left" className="max-w-48 text-xs">
                    Accumulated rainfall from IPMA weather stations across Portugal (api.ipma.pt). Updated every 10 min.
                  </TooltipContent>
                </Tooltip>
              </div>

              {rainfall.enabled && (
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {rainfall.isLoading
                      ? "Loading..."
                      : `${rainfall.stations.length} estações`}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => void rainfall.refresh()}
                    disabled={rainfall.isLoading}
                    title="Refresh"
                  >
                    <RefreshCw
                      className={cn(
                        "size-3",
                        rainfall.isLoading && "animate-spin"
                      )}
                    />
                  </Button>
                </div>
              )}

              {rainfall.error && (
                <p className="text-xs text-destructive">{rainfall.error}</p>
              )}
            </div>
          )}

          {/* IPMA Warnings Layer */}
          {warnings.isAvailable && (
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={warnings.enabled}
                    onChange={(e) => warnings.setEnabled(e.target.checked)}
                    className="rounded accent-primary"
                  />
                  <AlertTriangle className="size-4" />
                  Avisos IPMA
                </label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="size-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="left" className="max-w-48 text-xs">
                    Official weather warnings from IPMA (wind, rain, snow, heat, cold, fog, thunderstorms). Updated every 30 min.
                  </TooltipContent>
                </Tooltip>
              </div>

              {warnings.enabled && (
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {warnings.isLoading
                      ? "Loading..."
                      : `${warnings.districts.length} distrito${warnings.districts.length !== 1 ? "s" : ""} com avisos`}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => void warnings.refresh()}
                    disabled={warnings.isLoading}
                    title="Refresh"
                  >
                    <RefreshCw
                      className={cn(
                        "size-3",
                        warnings.isLoading && "animate-spin",
                      )}
                    />
                  </Button>
                </div>
              )}

              {warnings.error && (
                <p className="text-xs text-destructive">{warnings.error}</p>
              )}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
    </TooltipProvider>
  );

  if (!headerPortal) return null;

  return createPortal(trigger, headerPortal);
}
