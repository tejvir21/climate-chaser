/** Normalized weather domain model. UI consumes only these types. */

export type ProviderId = "open-meteo" | "openweathermap" | "cache";

export interface WeatherLocation {
  /** Stable id from the geocoding provider (e.g. Open-Meteo id). */
  id: string;
  name: string;
  country: string;
  countryCode?: string;
  admin1?: string;
  latitude: number;
  longitude: number;
  elevation?: number;
  timezone?: string;
  population?: number;
}

export interface ProviderMeta {
  id: ProviderId;
  name: string;
  url: string;
  requiresKey: boolean;
  attribution: string;
  /** True when this payload came fully or partially from cache/fallback. */
  stale: boolean;
  /** Epoch ms of when the data was fetched from the origin provider. */
  fetchedAt: number;
  /** True when only "current" is available (secondary provider). */
  partial: boolean;
}

export interface CurrentWeather {
  time: string; // ISO local time at the location
  temperature: number; // °C
  apparentTemperature: number; // °C
  humidity: number; // %
  weatherCode: number; // WMO code
  weatherText: string;
  isDay: boolean;
  pressureMsl: number; // hPa
  windSpeed: number; // km/h
  windDirection: number; // degrees
  windGusts?: number; // km/h
  /** Visibility in metres; undefined when provider does not supply it. */
  visibility?: number;
  /** UV index at current hour; undefined when unavailable. */
  uvIndex?: number;
  /** High/low for the current day (°C); undefined when unavailable. */
  tempMax?: number;
  tempMin?: number;
}

export interface HourlyPoint {
  time: string;
  temperature: number;
  apparentTemperature: number;
  precipitationProbability: number; // %
  precipitation: number; // mm
  weatherCode: number;
  weatherText: string;
  visibility?: number;
  uvIndex?: number;
  windSpeed?: number; // km/h
  isDay: boolean;
}

export interface DailyPoint {
  date: string; // YYYY-MM-DD (location-local)
  weatherCode: number;
  weatherText: string;
  tempMax: number;
  tempMin: number;
  apparentMax?: number;
  apparentMin?: number;
  precipitationSum: number; // mm
  precipitationProbabilityMax: number; // %
  windSpeedMax: number; // km/h
  windDirectionDominant: number; // degrees
  uvIndexMax?: number;
  sunrise: string; // ISO local
  sunset: string;
}

export interface Astronomy {
  sunrise: string;
  sunset: string;
  /** Minutes of daylight. */
  daylightMinutes: number;
  /** 0..1 progress of the sun across the sky right now (clamped). */
  sunProgress: number | null;
  /** Approximate moon phase name + illumination 0..100. */
  moonPhase: string;
  moonIllumination: number;
}

export interface AirQualityCurrent {
  time: string;
  usAqi?: number;
  europeanAqi?: number;
  /** Indian National AQI computed from modelled concentrations (CPCB). */
  indiaAqi?: number;
  dominantPollutant?: string;
  pm25?: number; // µg/m³
  pm10?: number;
  carbonMonoxide?: number; // µg/m³
  nitrogenDioxide?: number;
  sulphurDioxide?: number;
  ozone?: number;
}

export interface AirQualityHourlyPoint {
  time: string;
  usAqi?: number;
  pm25?: number;
  pm10?: number;
}

export interface AirQualityBundle {
  current: AirQualityCurrent;
  hourly: AirQualityHourlyPoint[];
  provider: ProviderMeta;
}

export interface WeatherBundle {
  location: WeatherLocation;
  current: CurrentWeather;
  hourly: HourlyPoint[];
  daily: DailyPoint[];
  astronomy: Astronomy;
  timezone: string;
  provider: ProviderMeta;
}

export interface WeatherError {
  message: string;
  /** Which providers were attempted, in order. */
  attempted: ProviderId[];
  /** True when stale cached data is shown alongside this error. */
  staleShown: boolean;
}
