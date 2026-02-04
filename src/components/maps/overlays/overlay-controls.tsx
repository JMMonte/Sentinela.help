"use client";

import { useState } from "react";
import { Layers, Cloud, Activity, ChevronDown, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { WeatherOverlayState } from "../hooks/use-weather-overlay";
import type { SeismicOverlayState } from "../hooks/use-seismic-overlay";
import type { WeatherLayer } from "@/lib/overlays/weather-api";

export type OverlayControlsProps = {
  weather: WeatherOverlayState;
  seismic: SeismicOverlayState;
  className?: string;
};

export function OverlayControls({
  weather,
  seismic,
  className,
}: OverlayControlsProps) {
  const [expanded, setExpanded] = useState(false);

  // Don't render if no overlays are available
  if (!weather.isAvailable && !seismic.isAvailable) {
    return null;
  }

  const hasActiveOverlay = weather.enabled || seismic.enabled;

  return (
    <div
      className={cn(
        "absolute z-[1000] transition-all bg-background/95 backdrop-blur-sm border rounded-lg shadow-lg",
        "bottom-20 right-3",
        expanded ? "w-56 p-3" : "w-auto",
        className
      )}
    >
      {!expanded ? (
        <Button
          variant="ghost"
          size="icon-sm"
          className={cn(hasActiveOverlay && "text-primary")}
          onClick={() => setExpanded(true)}
          title="Map layers"
        >
          <Layers className="size-4" />
        </Button>
      ) : (
        <div className="grid gap-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Map Layers</span>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => setExpanded(false)}
            >
              <ChevronDown className="size-3" />
            </Button>
          </div>

          {/* Weather Layer */}
          {weather.isAvailable && (
            <div className="grid gap-2">
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

              {weather.enabled && (
                <Select
                  value={weather.activeLayer}
                  onValueChange={(v) => weather.setActiveLayer(v as WeatherLayer)}
                >
                  <SelectTrigger size="sm" className="h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {weather.availableLayers.map((layer) => (
                      <SelectItem key={layer.id} value={layer.id}>
                        {layer.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {/* Seismic Layer */}
          {seismic.isAvailable && (
            <div className="grid gap-2">
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
                      className={cn("size-3", seismic.isLoading && "animate-spin")}
                    />
                  </Button>
                </div>
              )}

              {seismic.error && (
                <p className="text-xs text-destructive">{seismic.error}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
