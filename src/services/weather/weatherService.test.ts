import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getWeatherBundle } from "./weatherService";
import type { WeatherLocation } from "@/types/weather";

const LOCATION: WeatherLocation = {
  id: "test-noida",
  name: "Noida",
  country: "India",
  countryCode: "IN",
  latitude: 28.58,
  longitude: 77.33,
  timezone: "Asia/Kolkata",
};

/** Minimal valid Open-Meteo forecast payload. */
function openMeteoPayload() {
  return {
    timezone: "Asia/Kolkata",
    current: {
      time: "2026-11-13T16:00",
      is_day: 1,
      weather_code: 1,
      temperature_2m: 27.5,
      relative_humidity_2m: 55,
      apparent_temperature: 29.1,
      pressure_msl: 1014.5,
      wind_speed_10m: 6.4,
      wind_direction_10m: 310,
      wind_gusts_10m: 15,
    },
    hourly: {
      time: ["2026-11-13T16:00"],
      temperature_2m: [27.5],
      apparent_temperature: [29.1],
      precipitation_probability: [5],
      precipitation: [0],
      weather_code: [1],
      visibility: [8000],
      uv_index: [2],
      wind_speed_10m: [6.4],
    },
    daily: {
      time: ["2026-11-13"],
      weather_code: [1],
      temperature_2m_max: [29],
      temperature_2m_min: [17],
      apparent_temperature_max: [30],
      apparent_temperature_min: [18],
      precipitation_sum: [0],
      precipitation_probability_max: [5],
      wind_speed_10m_max: [9],
      wind_direction_10m_dominant: [313],
      uv_index_max: [4.2],
      sunrise: ["2026-11-13T06:41"],
      sunset: ["2026-11-13T17:27"],
    },
  };
}

function owmPayload() {
  return {
    dt: Math.floor(Date.now() / 1000),
    visibility: 6000,
    main: {
      temp: 26.5,
      feels_like: 27.2,
      temp_min: 24,
      temp_max: 28,
      pressure: 1013,
      humidity: 60,
    },
    weather: [{ id: 800, main: "Clear", description: "clear sky" }],
    wind: { speed: 3.5, deg: 300, gust: 5 },
    sys: {
      sunrise: Math.floor(Date.now() / 1000) - 3600,
      sunset: Math.floor(Date.now() / 1000) + 3600,
    },
  };
}

function mockFetchOnce(payload: unknown, ok: boolean, status = 200) {
  return vi.fn(async () => ({
    ok,
    status,
    json: async () => payload,
  })) as unknown as typeof fetch;
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("getWeatherBundle", () => {
  it("uses Open-Meteo as primary provider", async () => {
    vi.stubGlobal("fetch", mockFetchOnce(openMeteoPayload(), true));
    const result = await getWeatherBundle(LOCATION, { forceRefresh: true });
    expect(result.bundle.provider.id).toBe("open-meteo");
    expect(result.bundle.provider.stale).toBe(false);
    expect(result.bundle.current.temperature).toBe(27.5);
    expect(result.bundle.daily).toHaveLength(1);
  });

  it("falls back to OpenWeatherMap when Open-Meteo fails", async () => {
    vi.stubEnv("VITE_OPENWEATHER_API_KEY", "test-owm-key");
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockImplementation(async (url: string) => {
          if (url.includes("open-meteo.com")) {
            return { ok: false, status: 503, json: async () => ({}) };
          }
          if (url.includes("openweathermap.org")) {
            return { ok: true, status: 200, json: async () => owmPayload() };
          }
          throw new Error(`Unexpected URL ${url}`);
        })
    );
    const result = await getWeatherBundle(LOCATION, { forceRefresh: true });
    expect(result.bundle.provider.id).toBe("openweathermap");
    expect(result.bundle.provider.partial).toBe(true);
    expect(result.bundle.current.weatherText).toBe("Clear sky");
  });

  it("serves stale cached data when every provider fails and cache exists", async () => {
    // Seed the last-good cache with a successful primary fetch.
    vi.stubGlobal("fetch", mockFetchOnce(openMeteoPayload(), true));
    await getWeatherBundle(LOCATION, { forceRefresh: true });

    // Now break the network entirely.
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 503, json: async () => ({}) }))
    );
    const result = await getWeatherBundle(LOCATION, { forceRefresh: true });
    expect(result.fromCache).toBe(true);
    expect(result.bundle.provider.stale).toBe(true);
    expect(result.bundle.current.temperature).toBe(27.5);
  });

  it("throws with attempted providers when providers fail and no cache exists", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 503, json: async () => ({}) }))
    );
    await expect(
      getWeatherBundle(LOCATION, { forceRefresh: true })
    ).rejects.toThrow(/Couldn't load weather/);
  });

  it("does not consult OpenWeatherMap when provider preference is open-meteo", async () => {
    vi.stubEnv("VITE_OPENWEATHER_API_KEY", "test-owm-key");
    const fetchMock = vi.fn(async () => ({
      ok: false,
      status: 503,
      json: async () => ({}),
    }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      getWeatherBundle(LOCATION, { forceRefresh: true, prefer: "open-meteo" })
    ).rejects.toThrow();
    // Only the Open-Meteo endpoint may be hit â€” never OWM.
    for (const call of fetchMock.mock.calls as unknown[][]) {
      expect(String(call[0])).not.toContain("openweathermap.org");
    }
  });

  it("openweathermap preference throws when OWM fails (no silent fallback)", async () => {
    vi.stubEnv("VITE_OPENWEATHER_API_KEY", "test-owm-key");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) }))
    );
    await expect(
      getWeatherBundle(LOCATION, { forceRefresh: true, prefer: "openweathermap" })
    ).rejects.toThrow();
  });
});

