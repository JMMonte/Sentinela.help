"use client";

import { GfsGridOverlay } from "./gfs-grid-overlay";
import { UV_INDEX_COLORS, type GfsGridData } from "@/lib/overlays/gfs-utils";

export type UvIndexOverlayProps = {
  data: GfsGridData;
  opacity?: number;
};

/**
 * UV Index overlay - renders UV index data as a color gradient.
 * Uses WHO standard color scale:
 * - Green: 0-2 (Low)
 * - Yellow: 3-5 (Moderate)
 * - Orange: 6-7 (High)
 * - Red: 8-10 (Very High)
 * - Violet/Purple: 11+ (Extreme)
 */
export function UvIndexOverlay({ data, opacity = 0.6 }: UvIndexOverlayProps) {
  return (
    <GfsGridOverlay
      data={data}
      colorScale={UV_INDEX_COLORS}
      opacity={opacity}
    />
  );
}

/**
 * UV Index Legend component for displaying color scale
 */
export function UvIndexLegend() {
  const levels = [
    { range: "0-2", label: "Low", color: "#4ade80" },
    { range: "3-5", label: "Moderate", color: "#facc15" },
    { range: "6-7", label: "High", color: "#fb923c" },
    { range: "8-10", label: "Very High", color: "#ef4444" },
    { range: "11+", label: "Extreme", color: "#a855f7" },
  ];

  return (
    <div className="flex flex-col gap-1 text-xs">
      <div className="font-medium mb-1">UV Index</div>
      {levels.map((level) => (
        <div key={level.range} className="flex items-center gap-2">
          <div
            className="size-3 rounded-sm"
            style={{ backgroundColor: level.color }}
          />
          <span>{level.range}</span>
          <span className="text-muted-foreground">({level.label})</span>
        </div>
      ))}
    </div>
  );
}
