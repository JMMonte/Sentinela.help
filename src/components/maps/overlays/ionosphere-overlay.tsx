"use client";

import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import { renderToStaticMarkup } from "react-dom/server";
import {
  type SpaceWeatherData,
  getKpColor,
} from "@/lib/overlays/space-weather-api";
import {
  type TecData,
  getTecColor,
  getTecDescription,
  getGpsImpact,
} from "@/lib/overlays/tec-api";

export type IonosphereOverlayProps = {
  spaceWeather: SpaceWeatherData | null;
  tecData: TecData | null;
};

// Icon components rendered to static markup for Leaflet
const SunIcon = renderToStaticMarkup(
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
);

const ActivityIcon = renderToStaticMarkup(
  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"/></svg>
);

const RadioIcon = renderToStaticMarkup(
  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/><circle cx="12" cy="12" r="2"/><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/><path d="M19.1 4.9C23 8.8 23 15.1 19.1 19"/></svg>
);

const SatelliteIcon = renderToStaticMarkup(
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 7 9 3 5 7l4 4"/><path d="m17 11 4 4-4 4-4-4"/><path d="m8 12 4 4 6-6-4-4Z"/><path d="m16 8 3-3"/><path d="M9 21a6 6 0 0 0-6-6"/></svg>
);

/**
 * Combined Ionosphere overlay - displays TEC grid and unified info panel.
 * Panel style matches the layers control panel.
 */
export function IonosphereOverlay({
  spaceWeather,
  tecData,
}: IonosphereOverlayProps) {
  const map = useMap();
  const tecLayerRef = useRef<L.LayerGroup | null>(null);
  const controlRef = useRef<L.Control | null>(null);

  // Render TEC grid
  useEffect(() => {
    if (!map || !tecData || tecData.grid.length === 0) {
      if (tecLayerRef.current) {
        map?.removeLayer(tecLayerRef.current);
        tecLayerRef.current = null;
      }
      return;
    }

    // Remove existing layer
    if (tecLayerRef.current) {
      map.removeLayer(tecLayerRef.current);
      tecLayerRef.current = null;
    }

    // Create layer group for TEC grid
    const layerGroup = L.layerGroup();

    // Render TEC grid as rectangles
    for (let latIdx = 0; latIdx < tecData.grid.length; latIdx++) {
      const lat = tecData.latMin + latIdx * tecData.latStep;
      for (let lonIdx = 0; lonIdx < tecData.grid[latIdx].length; lonIdx++) {
        const lon = tecData.lonMin + lonIdx * tecData.lonStep;
        const tec = tecData.grid[latIdx][lonIdx];

        if (tec === null || tec === undefined || isNaN(tec)) continue;

        const color = getTecColor(tec);

        const bounds: L.LatLngBoundsExpression = [
          [lat, lon],
          [lat + tecData.latStep, lon + tecData.lonStep],
        ];

        const rect = L.rectangle(bounds, {
          color: "transparent",
          fillColor: color,
          fillOpacity: 0.6,
          weight: 0,
        });

        rect.bindPopup(() => {
          const description = getTecDescription(tec);
          const gpsImpact = getGpsImpact(tec);
          const isDark = document.documentElement.classList.contains("dark");

          return `
            <div class="ionosphere-popup ${isDark ? "dark" : ""}">
              <div class="ionosphere-popup__header">
                ${SatelliteIcon}
                <span>Ionosphere TEC</span>
              </div>
              <div class="ionosphere-popup__content">
                <div class="ionosphere-popup__row">
                  <span class="ionosphere-popup__label">TEC:</span>
                  <span class="ionosphere-popup__value">${tec.toFixed(1)} TECU</span>
                </div>
                <div class="ionosphere-popup__row">
                  <span class="ionosphere-popup__label">GPS Impact:</span>
                  <span class="ionosphere-popup__value">${gpsImpact}</span>
                </div>
                <div class="ionosphere-popup__description">${description}</div>
              </div>
            </div>
          `;
        });

        layerGroup.addLayer(rect);
      }
    }

    layerGroup.addTo(map);
    tecLayerRef.current = layerGroup;

    return () => {
      if (tecLayerRef.current) {
        map.removeLayer(tecLayerRef.current);
        tecLayerRef.current = null;
      }
    };
  }, [map, tecData]);

  // Render unified ionosphere panel
  useEffect(() => {
    if (!map) return;

    // Remove existing control
    if (controlRef.current) {
      map.removeControl(controlRef.current);
      controlRef.current = null;
    }

    // Only show if we have data
    if (!spaceWeather && (!tecData || tecData.grid.length === 0)) return;

    const IonosphereControl = L.Control.extend({
      options: {
        position: "bottomright" as L.ControlPosition,
      },

      onAdd: function () {
        const isDark = document.documentElement.classList.contains("dark");
        const container = L.DomUtil.create("div", "ionosphere-panel");
        if (isDark) container.classList.add("dark");

        let spaceWeatherHtml = "";
        let tecLegendHtml = "";

        // Space Weather section
        if (spaceWeather) {
          const kpColor = getKpColor(spaceWeather.kpIndex);
          const hfCondition =
            spaceWeather.kpIndex < 4
              ? "Good"
              : spaceWeather.kpIndex < 6
                ? "Degraded"
                : "Poor";
          const hfClass =
            spaceWeather.kpIndex < 4
              ? "good"
              : spaceWeather.kpIndex < 6
                ? "degraded"
                : "poor";

          spaceWeatherHtml = `
            <div class="ionosphere-panel__section">
              <div class="ionosphere-panel__section-header">
                ${SunIcon}
                <span>Space Weather</span>
              </div>
              <div class="ionosphere-panel__section-content">
                <div class="ionosphere-panel__kp-row">
                  <span class="ionosphere-panel__kp-dot" style="background:${kpColor}"></span>
                  <span class="ionosphere-panel__kp-label">Kp ${spaceWeather.kpIndex.toFixed(1)}</span>
                  <span class="ionosphere-panel__kp-desc">${spaceWeather.kpDescription}</span>
                </div>
                ${spaceWeather.solarFlux !== null ? `
                  <div class="ionosphere-panel__metric">
                    ${ActivityIcon}
                    <span>SFI ${spaceWeather.solarFlux}</span>
                  </div>
                ` : ""}
                ${spaceWeather.xrayFlux ? `
                  <div class="ionosphere-panel__metric">
                    ${RadioIcon}
                    <span>X-ray ${spaceWeather.xrayFlux}</span>
                  </div>
                ` : ""}
                <div class="ionosphere-panel__hf ionosphere-panel__hf--${hfClass}">
                  HF Radio: <strong>${hfCondition}</strong>
                </div>
              </div>
            </div>
          `;
        }

        // TEC Legend section
        if (tecData && tecData.grid.length > 0) {
          tecLegendHtml = `
            <div class="ionosphere-panel__section">
              <div class="ionosphere-panel__section-header">
                ${SatelliteIcon}
                <span>TEC (TECU)</span>
              </div>
              <div class="ionosphere-panel__legend">
                <div class="ionosphere-panel__legend-item">
                  <span class="ionosphere-panel__legend-color" style="background:rgba(59,130,246,0.7)"></span>
                  <span>&lt;10</span>
                </div>
                <div class="ionosphere-panel__legend-item">
                  <span class="ionosphere-panel__legend-color" style="background:rgba(34,197,94,0.7)"></span>
                  <span>10-25</span>
                </div>
                <div class="ionosphere-panel__legend-item">
                  <span class="ionosphere-panel__legend-color" style="background:rgba(234,179,8,0.7)"></span>
                  <span>25-50</span>
                </div>
                <div class="ionosphere-panel__legend-item">
                  <span class="ionosphere-panel__legend-color" style="background:rgba(249,115,22,0.7)"></span>
                  <span>50-75</span>
                </div>
                <div class="ionosphere-panel__legend-item">
                  <span class="ionosphere-panel__legend-color" style="background:rgba(239,68,68,0.7)"></span>
                  <span>&gt;75</span>
                </div>
              </div>
            </div>
          `;
        }

        container.innerHTML = `
          <div class="ionosphere-panel__header">Ionosphere</div>
          <div class="ionosphere-panel__body">
            ${spaceWeatherHtml}
            ${tecLegendHtml}
          </div>
        `;

        L.DomEvent.disableClickPropagation(container);
        L.DomEvent.disableScrollPropagation(container);

        return container;
      },
    });

    const control = new IonosphereControl();
    control.addTo(map);
    controlRef.current = control;

    return () => {
      if (controlRef.current) {
        map.removeControl(controlRef.current);
        controlRef.current = null;
      }
    };
  }, [map, spaceWeather, tecData]);

  return null;
}
