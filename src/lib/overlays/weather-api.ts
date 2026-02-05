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

export function getWeatherTileUrl(
  layer: WeatherLayer,
  apiKey: string
): string {
  return `https://tile.openweathermap.org/map/${layer}/{z}/{x}/{y}.png?appid=${apiKey}`;
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

const OWM_CURRENT_URL = "https://api.openweathermap.org/data/2.5/weather";

export async function fetchCurrentWeather(
  lat: number,
  lon: number,
  apiKey: string
): Promise<CurrentWeatherData> {
  const url = `${OWM_CURRENT_URL}?lat=${lat}&lon=${lon}&appid=${encodeURIComponent(apiKey)}&units=metric`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Weather API error: ${res.status}`);
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
  lon: number,
  apiKey: string,
): Promise<WeatherSnapshot | null> {
  try {
    const data = await fetchCurrentWeather(lat, lon, apiKey);
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
