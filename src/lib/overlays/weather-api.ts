export type WeatherLayer =
  | "precipitation_new"
  | "clouds_new"
  | "pressure_new"
  | "wind_new"
  | "temp_new";

export type WeatherLayerConfig = {
  id: WeatherLayer;
  label: string;
  defaultOpacity: number;
};

export const WEATHER_LAYERS: WeatherLayerConfig[] = [
  { id: "precipitation_new", label: "Precipitation", defaultOpacity: 0.6 },
  { id: "clouds_new", label: "Clouds", defaultOpacity: 0.5 },
  { id: "temp_new", label: "Temperature", defaultOpacity: 0.5 },
  { id: "wind_new", label: "Wind", defaultOpacity: 0.5 },
  { id: "pressure_new", label: "Pressure", defaultOpacity: 0.4 },
];

/**
 * Get weather tile URL through our secure proxy.
 * API key is handled server-side - never exposed to client.
 */
export function getWeatherTileUrl(layer: WeatherLayer): string {
  return `/api/weather/tiles/${layer}/{z}/{x}/{y}`;
}

// ── Current weather data (OWM /data/2.5/weather) ──

export type CurrentWeatherData = {
  weather: Array<{
    id: number;
    main: string;
    description: string;
    icon: string;
  }>;
  main: {
    temp: number;
    feels_like: number;
    temp_min: number;
    temp_max: number;
    pressure: number;
    humidity: number;
  };
  visibility: number;
  wind: {
    speed: number;
    deg: number;
    gust?: number;
  };
  clouds: {
    all: number;
  };
  rain?: { "1h"?: number; "3h"?: number };
  snow?: { "1h"?: number; "3h"?: number };
  sys: {
    sunrise: number;
    sunset: number;
  };
  name: string;
  dt: number;
};

/**
 * Fetch current weather through our secure proxy.
 * API key is handled server-side - never exposed to client.
 */
export async function fetchCurrentWeather(
  lat: number,
  lon: number
): Promise<CurrentWeatherData> {
  const url = `/api/weather/current?lat=${lat}&lon=${lon}`;
  const res = await fetch(url);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Weather API error: ${res.status}`);
  }
  return (await res.json()) as CurrentWeatherData;
}

// ── Slim snapshot for persistent storage ──

export type WeatherSnapshot = {
  temp: number;
  feels_like: number;
  humidity: number;
  pressure: number;
  wind_speed: number;
  wind_deg: number;
  clouds: number;
  visibility: number;
  description: string;
  icon: string;
  dt: number;
};

export async function fetchWeatherSnapshot(
  lat: number,
  lon: number
): Promise<WeatherSnapshot | null> {
  try {
    const data = await fetchCurrentWeather(lat, lon);
    return {
      temp: data.main.temp,
      feels_like: data.main.feels_like,
      humidity: data.main.humidity,
      pressure: data.main.pressure,
      wind_speed: data.wind.speed,
      wind_deg: data.wind.deg,
      clouds: data.clouds.all,
      visibility: data.visibility,
      description: data.weather[0].description,
      icon: data.weather[0].icon,
      dt: data.dt,
    };
  } catch {
    return null;
  }
}

// ── Helpers ──

export function getWeatherIconUrl(iconCode: string): string {
  return `https://openweathermap.org/img/wn/${iconCode}.png`;
}

export function windDegToDirection(deg: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(deg / 45) % 8];
}

export function msToKmh(ms: number): number {
  return Math.round(ms * 3.6);
}

// ── Server-side functions (for use in API routes) ──
// These call OWM directly with the API key - DO NOT use in client code

const OWM_CURRENT_URL = "https://api.openweathermap.org/data/2.5/weather";

/**
 * Server-side only: Fetch current weather directly from OWM.
 * Use this in API routes that already have access to the API key.
 */
export async function fetchCurrentWeatherServer(
  lat: number,
  lon: number,
  apiKey: string
): Promise<CurrentWeatherData> {
  const url = `${OWM_CURRENT_URL}?lat=${lat}&lon=${lon}&appid=${encodeURIComponent(apiKey)}&units=metric`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Weather API error: ${res.status}`);
  return (await res.json()) as CurrentWeatherData;
}

/**
 * Server-side only: Fetch weather snapshot directly from OWM.
 * Use this in API routes that already have access to the API key.
 */
export async function fetchWeatherSnapshotServer(
  lat: number,
  lon: number,
  apiKey: string
): Promise<WeatherSnapshot | null> {
  try {
    const data = await fetchCurrentWeatherServer(lat, lon, apiKey);
    return {
      temp: data.main.temp,
      feels_like: data.main.feels_like,
      humidity: data.main.humidity,
      pressure: data.main.pressure,
      wind_speed: data.wind.speed,
      wind_deg: data.wind.deg,
      clouds: data.clouds.all,
      visibility: data.visibility,
      description: data.weather[0].description,
      icon: data.weather[0].icon,
      dt: data.dt,
    };
  } catch {
    return null;
  }
}
