/** Open-Meteo provider: forecast (current/hourly/daily), AQ, archive, geocoding. */

import { fetchJson } from "./http";
import { wmoInfo } from "./wmo";
import {
  computeAstronomy,
  moonPhaseInfo,
} from "@/services/astronomy";
import type {
  AirQualityBundle,
  DailyPoint,
  HourlyPoint,
  WeatherBundle,
  WeatherLocation,
} from "@/types/weather";

const FORECAST = "https://api.open-meteo.com/v1/forecast";
const AIR_QUALITY = "https://air-quality-api.open-meteo.com/v1/air-quality";
const ARCHIVE = "https://archive-api.open-meteo.com/v1/archive";
const GEOCODING = "https://geocoding-api.open-meteo.com/v1/search";

export const OPEN_METEO_META = {
  id: "open-meteo" as const,
  name: "Open-Meteo",
  url: "https://open-meteo.com/",
  requiresKey: false,
  attribution: "Weather data by Open-Meteo.com (CC BY 4.0)",
};

const CURRENT =
  "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,pressure_msl,wind_speed_10m,wind_direction_10m,wind_gusts_10m";
const HOURLY =
  "temperature_2m,apparent_temperature,precipitation_probability,precipitation,weather_code,visibility,uv_index,wind_speed_10m";
const DAILY =
  "weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_direction_10m_dominant,sunrise,sunset,uv_index_max";

export async function fetchOpenMeteoBundle(
  location: WeatherLocation,
  options: { forceRefresh?: boolean } = {}
): Promise<WeatherBundle> {
  const params = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    current: CURRENT,
    hourly: HOURLY,
    daily: DAILY,
    forecast_days: "16",
    timezone: "auto",
  });
  const data = await fetchJson<OpenMeteoForecastResponse>(
    `${FORECAST}?${params}`,
    {
      timeoutMs: 8000,
      retries: 2,
      cacheTtlMs: 10 * 60 * 1000,
      bypassCache: options.forceRefresh,
    }
  );
  return normalizeForecast(data, location);
}

export async function fetchOpenMeteoAirQuality(
  location: WeatherLocation,
  options: { forceRefresh?: boolean } = {}
): Promise<AirQualityBundle> {
  const params = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    current:
      "us_aqi,european_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone",
    hourly: "us_aqi,pm2_5,pm10",
    forecast_days: "2",
    timezone: "auto",
  });
  const data = await fetchJson<OpenMeteoAirQualityResponse>(
    `${AIR_QUALITY}?${params}`,
    {
      timeoutMs: 8000,
      retries: 2,
      cacheTtlMs: 10 * 60 * 1000,
      bypassCache: options.forceRefresh,
    }
  );
  return normalizeAirQuality(data);
}

export async function searchOpenMeteoLocations(
  query: string,
  count = 8
): Promise<WeatherLocation[]> {
  const params = new URLSearchParams({
    name: query.trim(),
    count: String(count),
    language: "en",
    format: "json",
  });
  const data = await fetchJson<OpenMeteoGeocodingResponse>(
    `${GEOCODING}?${params}`,
    { timeoutMs: 6000, retries: 2, cacheTtlMs: 7 * 24 * 3600 * 1000 }
  );
  const results = data.results ?? [];
  const locations = results.map(normalizeLocation);
  // India-first: stable sort, Indian matches first at same rank.
  return [...locations].sort((a, b) => {
    const aIndia = a.countryCode === "IN" ? 0 : 1;
    const bIndia = b.countryCode === "IN" ? 0 : 1;
    if (aIndia !== bIndia) return aIndia - bIndia;
    return (b.population ?? 0) - (a.population ?? 0);
  });
}

export interface ArchiveDailyRow {
  date: string;
  tempMax: number;
  tempMin: number;
  precipitation: number;
}

export async function fetchOpenMeteoArchive(
  location: WeatherLocation,
  years: number
): Promise<ArchiveDailyRow[]> {
  const end = new Date();
  const start = new Date(end);
  start.setFullYear(start.getFullYear() - years);
  const params = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    start_date: toIsoDate(start),
    end_date: toIsoDate(end),
    daily: "temperature_2m_max,temperature_2m_min,precipitation_sum",
    timezone: "auto",
  });
  const data = await fetchJson<OpenMeteoArchiveResponse>(
    `${ARCHIVE}?${params}`,
    // Archive data is immutable per day; cache for 24h.
    { timeoutMs: 12000, retries: 2, cacheTtlMs: 24 * 3600 * 1000 }
  );
  const d = data.daily;
  if (!d?.time) return [];
  const rows: ArchiveDailyRow[] = [];
  for (let i = 0; i < d.time.length; i++) {
    const tMax = d.temperature_2m_max?.[i];
    const tMin = d.temperature_2m_min?.[i];
    if (typeof tMax !== "number" || typeof tMin !== "number") continue;
    rows.push({
      date: d.time[i],
      tempMax: tMax,
      tempMin: tMin,
      precipitation: d.precipitation_sum?.[i] ?? 0,
    });
  }
  return rows;
}

/* ---------------------------------------------------------- */
/*  Normalisation                                              */
/* ---------------------------------------------------------- */

function normalizeLocation(r: OpenMeteoGeocodingResult): WeatherLocation {
  return {
    id: String(r.id),
    name: r.name,
    country: r.country,
    countryCode: r.country_code,
    admin1: r.admin1,
    latitude: r.latitude,
    longitude: r.longitude,
    elevation: r.elevation,
    timezone: r.timezone,
    population: r.population,
  };
}

function normalizeForecast(
  data: OpenMeteoForecastResponse,
  location: WeatherLocation
): WeatherBundle {
  const c = data.current;
  const h = data.hourly;
  const d = data.daily;
  if (!c || !h?.time || !d?.time) {
    throw new Error("Open-Meteo returned an unexpected payload shape");
  }

  const hourly: HourlyPoint[] = h.time.map((time, i) => {
    const code = h.weather_code?.[i];
    const isDay = hourIsDay(
      time,
      d.time ?? [],
      d.sunrise ?? [],
      d.sunset ?? []
    );
    return {
      time,
      temperature: num(h.temperature_2m?.[i]),
      apparentTemperature: num(h.apparent_temperature?.[i]),
      precipitationProbability: num(h.precipitation_probability?.[i], 0),
      precipitation: num(h.precipitation?.[i], 0),
      weatherCode: code ?? 3,
      weatherText: wmoInfo(code).text,
      visibility: num(h.visibility?.[i], undefined),
      uvIndex: num(h.uv_index?.[i], undefined),
      windSpeed: num(h.wind_speed_10m?.[i], undefined),
      isDay,
    };
  });

  const daily: DailyPoint[] = d.time.map((date, i) => {
    const code = d.weather_code?.[i];
    return {
      date,
      weatherCode: code ?? 3,
      weatherText: wmoInfo(code).text,
      tempMax: num(d.temperature_2m_max?.[i]),
      tempMin: num(d.temperature_2m_min?.[i]),
      apparentMax: num(d.apparent_temperature_max?.[i], undefined),
      apparentMin: num(d.apparent_temperature_min?.[i], undefined),
      precipitationSum: num(d.precipitation_sum?.[i], 0),
      precipitationProbabilityMax: num(d.precipitation_probability_max?.[i], 0),
      windSpeedMax: num(d.wind_speed_10m_max?.[i], 0),
      windDirectionDominant: num(d.wind_direction_10m_dominant?.[i], 0),
      uvIndexMax: num(d.uv_index_max?.[i], undefined),
      sunrise: d.sunrise?.[i] ?? "",
      sunset: d.sunset?.[i] ?? "",
    };
  });

  const nowIdx = closestHourIndex(h.time, c.time);
  const currentCode = c.weather_code ?? 3;
  const todayDaily = daily[0];
  const isDay = c.is_day === 1;

  const moon = moonPhaseInfo(new Date(`${c.time}Z`));
  const astronomy = computeAstronomy(
    todayDaily?.sunrise ?? c.time,
    todayDaily?.sunset ?? c.time,
    c.time
  );
  astronomy.moonPhase = moon.name;
  astronomy.moonIllumination = moon.illumination;

  return {
    location,
    current: {
      time: c.time,
      temperature: num(c.temperature_2m),
      apparentTemperature: num(c.apparent_temperature),
      humidity: num(c.relative_humidity_2m),
      weatherCode: currentCode,
      weatherText: wmoInfo(currentCode, isDay).text,
      isDay,
      pressureMsl: num(c.pressure_msl),
      windSpeed: num(c.wind_speed_10m),
      windDirection: num(c.wind_direction_10m),
      windGusts: num(c.wind_gusts_10m, undefined),
      visibility: num(h.visibility?.[nowIdx], undefined),
      uvIndex: num(h.uv_index?.[nowIdx], undefined),
      tempMax: todayDaily?.tempMax,
      tempMin: todayDaily?.tempMin,
    },
    hourly,
    daily,
    astronomy,
    timezone: data.timezone ?? location.timezone ?? "UTC",
    provider: {
      ...OPEN_METEO_META,
      stale: false,
      fetchedAt: Date.now(),
      partial: false,
    },
  };
}

function normalizeAirQuality(
  data: OpenMeteoAirQualityResponse
): AirQualityBundle {
  const c = data.current;
  const h = data.hourly;
  if (!c) throw new Error("Open-Meteo air-quality returned an unexpected payload");

  const hourly = (h?.time ?? []).map((time, i) => ({
    time,
    usAqi: num(h?.us_aqi?.[i], undefined),
    pm25: num(h?.pm2_5?.[i], undefined),
    pm10: num(h?.pm10?.[i], undefined),
  }));

  return {
    current: {
      time: c.time,
      usAqi: num(c.us_aqi, undefined),
      europeanAqi: num(c.european_aqi, undefined),
      pm25: num(c.pm2_5, undefined),
      pm10: num(c.pm10, undefined),
      carbonMonoxide: num(c.carbon_monoxide, undefined),
      nitrogenDioxide: num(c.nitrogen_dioxide, undefined),
      sulphurDioxide: num(c.sulphur_dioxide, undefined),
      ozone: num(c.ozone, undefined),
    },
    hourly,
    provider: {
      ...OPEN_METEO_META,
      name: "Open-Meteo Air Quality",
      stale: false,
      fetchedAt: Date.now(),
      partial: false,
    },
  };
}

/* ---------------------------------------------------------- */
/*  Raw payload types (only fields we consume)                 */
/* ---------------------------------------------------------- */

interface OpenMeteoForecastResponse {
  timezone?: string;
  current?: {
    time: string;
    is_day?: number;
    weather_code?: number;
    temperature_2m?: number;
    relative_humidity_2m?: number;
    apparent_temperature?: number;
    pressure_msl?: number;
    wind_speed_10m?: number;
    wind_direction_10m?: number;
    wind_gusts_10m?: number;
  };
  hourly?: {
    time: string[];
    temperature_2m?: (number | null)[];
    apparent_temperature?: (number | null)[];
    precipitation_probability?: (number | null)[];
    precipitation?: (number | null)[];
    weather_code?: (number | null)[];
    visibility?: (number | null)[];
    uv_index?: (number | null)[];
    wind_speed_10m?: (number | null)[];
  };
  daily?: {
    time: string[];
    weather_code?: (number | null)[];
    temperature_2m_max?: (number | null)[];
    temperature_2m_min?: (number | null)[];
    apparent_temperature_max?: (number | null)[];
    apparent_temperature_min?: (number | null)[];
    precipitation_sum?: (number | null)[];
    precipitation_probability_max?: (number | null)[];
    wind_speed_10m_max?: (number | null)[];
    wind_direction_10m_dominant?: (number | null)[];
    uv_index_max?: (number | null)[];
    sunrise?: string[];
    sunset?: string[];
  };
}

interface OpenMeteoAirQualityResponse {
  current?: {
    time: string;
    us_aqi?: number;
    european_aqi?: number;
    pm10?: number;
    pm2_5?: number;
    carbon_monoxide?: number;
    nitrogen_dioxide?: number;
    sulphur_dioxide?: number;
    ozone?: number;
  };
  hourly?: {
    time: string[];
    us_aqi?: (number | null)[];
    pm2_5?: (number | null)[];
    pm10?: (number | null)[];
  };
}

interface OpenMeteoGeocodingResponse {
  results?: OpenMeteoGeocodingResult[];
}

interface OpenMeteoGeocodingResult {
  id: number;
  name: string;
  country: string;
  country_code?: string;
  admin1?: string;
  latitude: number;
  longitude: number;
  elevation?: number;
  population?: number;
  timezone?: string;
}

interface OpenMeteoArchiveResponse {
  daily?: {
    time: string[];
    temperature_2m_max?: (number | null)[];
    temperature_2m_min?: (number | null)[];
    precipitation_sum?: (number | null)[];
  };
}

/* ---------------------------------------------------------- */
/*  Small helpers                                              */
/* ---------------------------------------------------------- */

function num(value: number | null | undefined): number;
function num(value: number | null | undefined, fallback: number): number;
function num(value: number | null | undefined, fallback: undefined): number | undefined;
function num(
  value: number | null | undefined,
  fallback: number | undefined = 0
): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return fallback;
}

function closestHourIndex(times: string[], targetIso: string): number {
  const target = Date.parse(targetIso);
  if (Number.isNaN(target)) return 0;
  let best = 0;
  let bestDelta = Infinity;
  for (let i = 0; i < times.length; i++) {
    const delta = Math.abs(Date.parse(times[i]) - target);
    if (delta < bestDelta) {
      bestDelta = delta;
      best = i;
    }
  }
  return best;
}

/** Per-hour day/night test using the matching daily sunrise/sunset. */
function hourIsDay(
  time: string,
  dailyDates: string[],
  sunrises: string[],
  sunsets: string[]
): boolean {
  const date = time.slice(0, 10);
  const idx = dailyDates.indexOf(date);
  const sunrise = idx >= 0 ? sunrises[idx] : undefined;
  const sunset = idx >= 0 ? sunsets[idx] : undefined;
  if (sunrise && sunset) {
    const t = Date.parse(time);
    return t >= Date.parse(sunrise) && t <= Date.parse(sunset);
  }
  const hour = Number(time.slice(11, 13));
  if (Number.isNaN(hour)) return true;
  return hour >= 6 && hour < 19;
}

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
