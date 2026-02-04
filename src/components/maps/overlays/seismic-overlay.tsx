"use client";

import { CircleMarker, Popup } from "react-leaflet";
import type { EarthquakeFeature } from "@/lib/overlays/seismic-api";
import { getMagnitudeColor, getMagnitudeRadius } from "@/lib/overlays/seismic-api";

export type SeismicOverlayProps = {
  earthquakes: EarthquakeFeature[];
};

export function SeismicOverlay({ earthquakes }: SeismicOverlayProps) {
  return (
    <>
      {earthquakes.map((eq) => {
        const [lng, lat, depth] = eq.geometry.coordinates;
        const { mag, place, time, url } = eq.properties;
        const color = getMagnitudeColor(mag);
        const radius = getMagnitudeRadius(mag);

        return (
          <CircleMarker
            key={eq.id}
            center={[lat, lng]}
            radius={radius}
            pathOptions={{
              fillColor: color,
              fillOpacity: 0.7,
              color: "#fff",
              weight: 1.5,
              opacity: 0.9,
            }}
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
          </CircleMarker>
        );
      })}
    </>
  );
}
