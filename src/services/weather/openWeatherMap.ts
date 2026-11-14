/**
 * OpenWeatherMap — optional secondary provider (current conditions only).
 * Free tier: current weather + 5-day/3-hour forecast. We deliberately do not
 * map OWM onto the full bundle; when OWM answers, the bundle is marked
 * `partial` and the extended forecast renders an explicit limitation note.
 */

import { fetchJson } from "./http";
import type { WeatherBundle, WeatherLocation } from "@/types/weather";
import { computeAstronomy, moonPhaseInfo } from "@/services/astronomy";

const BASE = "https://api.openweathermap.org/data/2.5";

export const OPENWEATHER_META = {
  id: "openweathermap" as const,
  name: "OpenWeatherMap",
  url: "https://openweathermap.org/",
  requiresKey: true,
  attribution: "Weather data by OpenWeatherMap.org",
};

export function openWeatherKey(): string | undefined {
  return (
    import.meta.env.VITE_OPENWEATHER_API_KEY ||
    import.meta.env.VITE_API_key ||
    undefined
  );
}

export function openWeatherEnabled(): boolean {
  return Boolean(openWeatherKey());
}

export async function fetchOpenWeatherSnapshot(
  location: WeatherLocation,
  options: { forceRefresh?: boolean } = {}
): Promise<WeatherBundle> {
  const key = openWeatherKey();
  if (!key) {
    throw new Error("OpenWeatherMap API key not configured");
  }
  const q = `${location.name}${location.countryCode ? `,${location.countryCode}` : ""}`;
  const params = new URLSearchParams({
    q,
    appid: key,
    units: "metric",
  });
  const data = await fetchJson<OpenWeatherCurrentResponse>(
    `${BASE}/weather?${params}`,
    // NOTE: never cached — the URL embeds the API key.
    { timeoutMs: 8000, retries: 1, bypassCache: options.forceRefresh }
  );

  if (!data?.main || !data.weather?.[0]) {
    throw new Error(
      data?.message
        ? `OpenWeatherMap error: ${data.message}`
        : "OpenWeatherMap returned an unexpected payload"
    );
  }

  const nowIso = new Date((data.dt ?? Date.now() / 1000) * 1000).toISOString();
  const astronomy = computeAstronomy(
    data.sys?.sunrise
      ? new Date(data.sys.sunrise * 1000).toISOString()
      : nowIso,
    data.sys?.sunset
      ? new Date(data.sys.sunset * 1000).toISOString()
      : nowIso,
    nowIso
  );
  const moon = moonPhaseInfo(new Date(nowIso));
  astronomy.moonPhase = moon.name;
  astronomy.moonIllumination = moon.illumination;

  return {
    location,
    current: {
      time: nowIso,
      temperature: data.main.temp,
      apparentTemperature: data.main.feels_like,
      humidity: data.main.humidity,
      weatherCode: owmToWmoApprox(data.weather[0].id),
      weatherText: capitalize(data.weather[0].description),
      isDay:
        data.dt != null && data.sys?.sunrise != null && data.sys?.sunset != null
          ? data.dt >= data.sys.sunrise && data.dt <= data.sys.sunset
          : true,
      pressureMsl: data.main.pressure,
      windSpeed: (data.wind?.speed ?? 0) * 3.6, // m/s → km/h
      windDirection: data.wind?.deg ?? 0,
      windGusts:
        data.wind?.gust != null ? data.wind.gust * 3.6 : undefined,
      visibility:
        typeof data.visibility === "number" ? data.visibility : undefined,
      uvIndex: undefined,
      tempMax: data.main.temp_max,
      tempMin: data.main.temp_min,
    },
    hourly: [],
    daily: [],
    astronomy,
    timezone: location.timezone ?? "UTC",
    provider: {
      ...OPENWEATHER_META,
      stale: false,
      fetchedAt: Date.now(),
      partial: true,
    },
  };
}

/** Coarse OWM → WMO mapping for theme/icon purposes only. */
function owmToWmoApprox(owmId: number): number {
  if (owmId >= 200 && owmId < 300) return 95;
  if (owmId >= 300 && owmId < 400) return 53;
  if (owmId >= 500 && owmId < 600) return owmId === 511 ? 66 : 63;
  if (owmId >= 600 && owmId < 700) return 73;
  if (owmId === 701 || owmId === 741) return 45;
  if (owmId >= 700 && owmId < 800) return 48;
  if (owmId === 800) return 0;
  if (owmId === 801) return 1;
  if (owmId === 802) return 2;
  if (owmId === 803) return 3;
  return 3;
}

function capitalize(s: string): string {
  return s.length ? s[0].toUpperCase() + s.slice(1) : s;
}

interface OpenWeatherCurrentResponse {
  dt?: number;
  visibility?: number;
  main?: {
    temp: number;
    feels_like: number;
    temp_min: number;
    temp_max: number;
    pressure: number;
    humidity: number;
  };
  weather?: Array<{ id: number; main: string; description: string }>;
  wind?: { speed: number; deg?: number; gust?: number };
  sys?: { sunrise?: number; sunset?: number };
  message?: string;
}
