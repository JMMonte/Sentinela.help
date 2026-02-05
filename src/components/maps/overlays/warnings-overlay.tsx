"use client";

import { useMemo } from "react";
import { Marker, Popup } from "react-leaflet";
import L from "leaflet";
import type {
  DistrictWarnings,
  WarningEntry,
} from "@/lib/overlays/warnings-api";
import { getWarningLevelColor } from "@/lib/overlays/warnings-api";

export type WarningsOverlayProps = {
  districts: DistrictWarnings[];
};

function createWarningIcon(district: DistrictWarnings): L.DivIcon {
  const color = getWarningLevelColor(district.highestLevel);
  const count = district.warnings.length;
  const size =
    district.highestLevel === "red"
      ? 36
      : district.highestLevel === "orange"
        ? 32
        : 28;

  return L.divIcon({
    className: "sentinela-warning-marker",
    html: `
      <div class="sentinela-warning sentinela-warning--${district.highestLevel}">
        <svg viewBox="0 0 24 24" width="${size}" height="${size}">
          <path d="M12 2L1 21h22L12 2z" fill="${color}" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/>
          <text x="12" y="17" text-anchor="middle" fill="#fff" font-size="9" font-weight="700">${count > 1 ? count : "!"}</text>
        </svg>
      </div>
    `,
    iconSize: L.point(size, size),
    iconAnchor: L.point(size / 2, size),
    popupAnchor: L.point(0, -size + 4),
  });
}

function formatTime(date: Date): string {
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function WarningItem({ warning }: { warning: WarningEntry }) {
  const color = getWarningLevelColor(warning.level);

  return (
    <div
      className="py-1.5 text-xs border-l-2 pl-2"
      style={{ borderColor: color }}
    >
      <div className="flex items-center gap-1.5 font-medium">
        <span className="text-[11px]" style={{ color }}>{warning.awarenessType}</span>
        <span
          className="ml-auto text-[10px] font-semibold uppercase"
          style={{ color }}
        >
          {warning.level}
        </span>
      </div>
      {warning.text && (
        <div className="mt-0.5 text-[11px] text-foreground/70">
          {warning.text}
        </div>
      )}
      <div className="mt-0.5 text-[10px] text-muted-foreground">
        {formatTime(warning.startTime)} — {formatTime(warning.endTime)}
      </div>
    </div>
  );
}

function WarningPopupContent({ district }: { district: DistrictWarnings }) {
  return (
    <div className="grid gap-2 min-w-[220px] max-w-[300px]">
      <div className="font-semibold text-sm">{district.districtName}</div>
      <div className="text-xs text-muted-foreground">
        {district.warnings.length} aviso
        {district.warnings.length !== 1 ? "s" : ""} ativo
        {district.warnings.length !== 1 ? "s" : ""}
      </div>
      <div className="grid gap-1.5">
        {district.warnings.map((w, i) => (
          <WarningItem key={`${w.awarenessType}-${i}`} warning={w} />
        ))}
      </div>
      <div className="text-[10px] text-muted-foreground pt-1">
        Fonte: IPMA (api.ipma.pt)
      </div>
    </div>
  );
}

export function WarningsOverlay({ districts }: WarningsOverlayProps) {
  const icons = useMemo(
    () =>
      new Map(
        districts.map((d) => [d.districtCode, createWarningIcon(d)]),
      ),
    [districts],
  );

  return (
    <>
      {districts.map((district) => (
        <Marker
          key={district.districtCode}
          position={[district.lat, district.lng]}
          icon={icons.get(district.districtCode)!}
          zIndexOffset={500}
        >
          <Popup>
            <WarningPopupContent district={district} />
          </Popup>
        </Marker>
      ))}
    </>
  );
}
