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
