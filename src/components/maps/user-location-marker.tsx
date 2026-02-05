"use client";

import { useMemo } from "react";
import { Marker, Popup } from "react-leaflet";
import L from "leaflet";
import type { CurrentWeatherData } from "@/lib/overlays/weather-api";
import {
  getWeatherIconUrl,
  windDegToDirection,
  msToKmh,
} from "@/lib/overlays/weather-api";

type DotVariant = "blue" | "yellow";

export type UserLocationMarkerProps = {
  position: [number, number];
  weather: CurrentWeatherData | null;
  locationLabel: string;
  reportLabel: string;
  onReportIncident?: () => void;
};

export type PinLocationMarkerProps = {
  position: [number, number];
  weather: CurrentWeatherData | null;
  locationLabel: string;
  reportLabel: string;
};

function buildAmbientHtml(
  w: CurrentWeatherData,
  variant: DotVariant
): string {
  const temp = Math.round(w.main.temp);
  const iconUrl = getWeatherIconUrl(w.weather[0].icon);
  const wind = msToKmh(w.wind.speed);
  const humidity = w.main.humidity;
  const mod = variant === "yellow" ? " sentinela-location--yellow" : "";

  return `
    <div class="sentinela-location${mod}">
      <div class="sentinela-location__dot"></div>
      <div class="sentinela-location__pulse"></div>
      <div class="sentinela-location__label sentinela-location__label--temp">
        <img src="${iconUrl}" alt="" class="sentinela-location__icon" />
        <span>${temp}&deg;</span>
      </div>
      <div class="sentinela-location__label sentinela-location__label--wind">
        ${wind}<small>km/h</small>
      </div>
      <div class="sentinela-location__label sentinela-location__label--humidity">
        ${humidity}<small>%</small>
      </div>
    </div>
  `;
}

function buildPlainHtml(variant: DotVariant): string {
  const mod = variant === "yellow" ? " sentinela-location--yellow" : "";
  return `
    <div class="sentinela-location${mod}">
      <div class="sentinela-location__dot"></div>
      <div class="sentinela-location__pulse"></div>
    </div>
  `;
}

function buildIcon(weather: CurrentWeatherData | null, variant: DotVariant) {
  const html = weather
    ? buildAmbientHtml(weather, variant)
    : buildPlainHtml(variant);
  const size = weather ? 120 : 24;
  const anchor = size / 2;
  return L.divIcon({
    className: "sentinela-location-marker",
    html,
    iconSize: L.point(size, size),
    iconAnchor: L.point(anchor, anchor),
  });
}

export function WeatherPopupContent({
  weather,
  locationLabel,
  reportLabel,
  onReportIncident,
}: {
  weather: CurrentWeatherData | null;
  locationLabel: string;
  reportLabel: string;
  onReportIncident?: () => void;
}) {
  if (!weather) {
    return (
      <div style={{ display: "grid", gap: "6px" }}>
        <span style={{ fontSize: "14px", fontWeight: 500 }}>
          {locationLabel}
        </span>
        {onReportIncident && (
          <button
            onClick={onReportIncident}
            style={{
              fontSize: "13px",
              fontWeight: 500,
              padding: "4px 12px",
              borderRadius: "6px",
              border: "none",
              backgroundColor: "#18181b",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            {reportLabel}
          </button>
        )}
      </div>
    );
  }

  const temp = Math.round(weather.main.temp);
  const feelsLike = Math.round(weather.main.feels_like);
  const tempMin = Math.round(weather.main.temp_min);
  const tempMax = Math.round(weather.main.temp_max);
  const description = weather.weather[0].description;
  const iconUrl = getWeatherIconUrl(weather.weather[0].icon);
  const wind = msToKmh(weather.wind.speed);
  const windDir = windDegToDirection(weather.wind.deg);
  const gust = weather.wind.gust ? msToKmh(weather.wind.gust) : null;
  const humidity = weather.main.humidity;
  const pressure = weather.main.pressure;
  const visibility = (weather.visibility / 1000).toFixed(1);
  const clouds = weather.clouds.all;
  const sunrise = new Date(
    weather.sys.sunrise * 1000
  ).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const sunset = new Date(
    weather.sys.sunset * 1000
  ).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div
      style={{
        display: "grid",
        gap: "8px",
        minWidth: "200px",
        maxWidth: "260px",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <img
          src={iconUrl}
          alt={description}
          style={{ width: "40px", height: "40px", marginLeft: "-4px" }}
        />
        <div>
          <div
            style={{ fontSize: "18px", fontWeight: 600, lineHeight: 1.1 }}
          >
            {temp}&deg;C
          </div>
          <div
            style={{
              fontSize: "12px",
              color: "#71717a",
              textTransform: "capitalize",
            }}
          >
            {description}
          </div>
        </div>
      </div>

      {/* Details grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "2px 16px",
          fontSize: "12px",
        }}
      >
        <div>
          Feels like{" "}
          <span style={{ fontWeight: 500 }}>{feelsLike}&deg;</span>
        </div>
        <div>
          Humidity{" "}
          <span style={{ fontWeight: 500 }}>{humidity}%</span>
        </div>
        <div>
          Min/Max{" "}
          <span style={{ fontWeight: 500 }}>
            {tempMin}&deg;/{tempMax}&deg;
          </span>
        </div>
        <div>
          Pressure{" "}
          <span style={{ fontWeight: 500 }}>{pressure} hPa</span>
        </div>
        <div>
          Wind{" "}
          <span style={{ fontWeight: 500 }}>
            {wind} km/h {windDir}
          </span>
        </div>
        <div>
          Clouds <span style={{ fontWeight: 500 }}>{clouds}%</span>
        </div>
        {gust != null && (
          <div>
            Gusts{" "}
            <span style={{ fontWeight: 500 }}>{gust} km/h</span>
          </div>
        )}
        <div>
          Visibility{" "}
          <span style={{ fontWeight: 500 }}>{visibility} km</span>
        </div>
      </div>

      {/* Sunrise / Sunset */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: "11px",
          color: "#71717a",
          borderTop: "1px solid #e4e4e7",
          paddingTop: "4px",
        }}
      >
        <span>Sunrise {sunrise}</span>
        <span>Sunset {sunset}</span>
      </div>

      {/* Report button */}
      {onReportIncident && (
        <button
          onClick={onReportIncident}
          style={{
            width: "100%",
            fontSize: "13px",
            fontWeight: 500,
            padding: "6px 12px",
            borderRadius: "6px",
            border: "none",
            backgroundColor: "#18181b",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          {reportLabel}
        </button>
      )}
    </div>
  );
}

export function UserLocationMarker({
  position,
  weather,
  locationLabel,
  reportLabel,
  onReportIncident,
}: UserLocationMarkerProps) {
  const icon = useMemo(() => buildIcon(weather, "blue"), [weather]);

  return (
    <Marker position={position} icon={icon} zIndexOffset={1000}>
      <Popup>
        <WeatherPopupContent
          weather={weather}
          locationLabel={locationLabel}
          reportLabel={reportLabel}
          onReportIncident={onReportIncident}
        />
      </Popup>
    </Marker>
  );
}

export function PinLocationMarker({
  position,
  weather,
  locationLabel,
  reportLabel,
}: PinLocationMarkerProps) {
  const icon = useMemo(() => buildIcon(weather, "yellow"), [weather]);

  return (
    <Marker position={position} icon={icon} zIndexOffset={900}>
      <Popup>
        <WeatherPopupContent
          weather={weather}
          locationLabel={locationLabel}
          reportLabel={reportLabel}
        />
      </Popup>
    </Marker>
  );
}
