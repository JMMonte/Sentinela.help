"use client";

import { useEffect, useMemo } from "react";
import { Marker, Popup } from "react-leaflet";
import L from "leaflet";
import type { EarthquakeFeature } from "@/lib/overlays/seismic-api";
import { getMagnitudeColor } from "@/lib/overlays/seismic-api";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DOT_SIZE = 10;
const STYLE_ID = "eq-ripple-style";

// ---------------------------------------------------------------------------
// Ripple parameters driven by magnitude
// ---------------------------------------------------------------------------

/** How far the ripple expands (as a scale multiplier of the dot). */
function getRippleScale(magnitude: number): number {
  if (magnitude >= 7) return 8;
  if (magnitude >= 5) return 6;
  if (magnitude >= 3) return 4;
  return 2.5;
}

/** Animation cycle duration in seconds — larger quakes pulse faster. */
function getRippleDuration(magnitude: number): number {
  if (magnitude >= 7) return 1.0;
  if (magnitude >= 5) return 1.5;
  if (magnitude >= 3) return 2.0;
  return 2.5;
}

// ---------------------------------------------------------------------------
// Inject global keyframe once
// ---------------------------------------------------------------------------

function ensureRippleStyles() {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    @keyframes eq-ripple {
      0% {
        transform: scale(1);
        opacity: 0.45;
      }
      100% {
        transform: scale(var(--eq-scale, 3));
        opacity: 0;
      }
    }
    .eq-marker {
      overflow: visible !important;
      background: transparent !important;
      border: none !important;
    }
  `;
  document.head.appendChild(style);
}

// ---------------------------------------------------------------------------
// DivIcon factory
// ---------------------------------------------------------------------------

function createEarthquakeIcon(magnitude: number): L.DivIcon {
  const color = getMagnitudeColor(magnitude);
  const scale = getRippleScale(magnitude);
  const duration = getRippleDuration(magnitude);
  const half = DOT_SIZE / 2;

  return L.divIcon({
    className: "eq-marker",
    iconSize: [DOT_SIZE, DOT_SIZE],
    iconAnchor: [half, half],
    popupAnchor: [0, -half - 4],
    html: `
      <div style="position:relative;width:${DOT_SIZE}px;height:${DOT_SIZE}px;">
        <div style="
          position:absolute;inset:0;
          border-radius:50%;
          background:${color};
          border:1.5px solid rgba(255,255,255,0.9);
          z-index:2;
        "></div>
        <div style="
          position:absolute;inset:0;
          border-radius:50%;
          background:${color};
          --eq-scale:${scale};
          animation:eq-ripple ${duration}s ease-out infinite;
          z-index:1;
        "></div>
        <div style="
          position:absolute;inset:0;
          border-radius:50%;
          background:${color};
          --eq-scale:${scale};
          animation:eq-ripple ${duration}s ease-out infinite;
          animation-delay:${(duration / 2).toFixed(1)}s;
          z-index:1;
        "></div>
      </div>
    `,
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export type SeismicOverlayProps = {
  earthquakes: EarthquakeFeature[];
};

export function SeismicOverlay({ earthquakes }: SeismicOverlayProps) {
  useEffect(() => {
    ensureRippleStyles();
  }, []);

  const icons = useMemo(
    () =>
      new Map(
        earthquakes.map((eq) => [eq.id, createEarthquakeIcon(eq.properties.mag)]),
      ),
    [earthquakes],
  );

  return (
    <>
      {earthquakes.map((eq) => {
        const [lng, lat, depth] = eq.geometry.coordinates;
        const { mag, place, time, url } = eq.properties;

        return (
          <Marker
            key={eq.id}
            position={[lat, lng]}
            icon={icons.get(eq.id)!}
          >
            <Popup>
              <div className="grid gap-1 min-w-[180px]">
                <div className="font-semibold">M{mag.toFixed(1)}</div>
                <div className="text-xs text-muted-foreground">{place}</div>
                <div className="text-xs text-muted-foreground">
                  {new Date(time).toLocaleString()}
                  <br />
                  Depth: {depth.toFixed(1)} km
                </div>
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs underline mt-1"
                >
                  USGS Details
                </a>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
}
