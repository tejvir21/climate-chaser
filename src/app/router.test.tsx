import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { useClimateStore, DEFAULT_LOCATION } from "@/store/useClimateStore";
import { routes } from "@/app/router";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function isoLocalAt(offsetHours: number, dateOffsetDays = 0): string {
  const d = new Date(Date.now() + offsetHours * 3600_000 + dateOffsetDays * 86400_000);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:00`;
}

function openMeteoPayload() {
  const nowHour = isoLocalAt(0);
  const hourlyTimes = Array.from({ length: 48 }, (_, i) => isoLocalAt(i));
  const dailyTimes = Array.from({ length: 16 }, (_, i) => isoLocalAt(0, i).slice(0, 10));
  return {
    timezone: "Asia/Kolkata",
    current: {
      time: nowHour,
      is_day: 1,
      weather_code: 1,
      temperature_2m: 28.2,
      relative_humidity_2m: 52,
      apparent_temperature: 29.3,
      pressure_msl: 1014.8,
      wind_speed_10m: 6.4,
      wind_direction_10m: 310,
      wind_gusts_10m: 15.1,
    },
    hourly: {
      time: hourlyTimes,
      temperature_2m: hourlyTimes.map(() => 28),
      apparent_temperature: hourlyTimes.map(() => 29),
      precipitation_probability: hourlyTimes.map(() => 5),
      precipitation: hourlyTimes.map(() => 0),
      weather_code: hourlyTimes.map(() => 1),
      visibility: hourlyTimes.map(() => 8000),
      uv_index: hourlyTimes.map(() => 2),
      wind_speed_10m: hourlyTimes.map(() => 6),
    },
    daily: {
      time: dailyTimes,
      weather_code: dailyTimes.map(() => 1),
      temperature_2m_max: dailyTimes.map(() => 29),
      temperature_2m_min: dailyTimes.map(() => 17),
      apparent_temperature_max: dailyTimes.map(() => 30),
      apparent_temperature_min: dailyTimes.map(() => 18),
      precipitation_sum: dailyTimes.map(() => 0),
      precipitation_probability_max: dailyTimes.map(() => 5),
      wind_speed_10m_max: dailyTimes.map(() => 9),
      wind_direction_10m_dominant: dailyTimes.map(() => 313),
      uv_index_max: dailyTimes.map(() => 4),
      sunrise: dailyTimes.map((d) => `${d}T06:41`),
      sunset: dailyTimes.map((d) => `${d}T17:27`),
    },
  };
}

function airQualityPayload() {
  return {
    timezone: "Asia/Kolkata",
    current: {
      time: isoLocalAt(0),
      us_aqi: 120,
      european_aqi: 40,
      pm10: 60,
      pm2_5: 35,
      carbon_monoxide: 400,
      nitrogen_dioxide: 30,
      sulphur_dioxide: 10,
      ozone: 90,
    },
    hourly: { time: [isoLocalAt(0)], us_aqi: [120], pm2_5: [35], pm10: [60] },
  };
}

function stubFetch() {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("air-quality-api.open-meteo.com")) {
      return { ok: true, status: 200, json: async () => airQualityPayload() } as Response;
    }
    if (url.includes("api.open-meteo.com")) {
      return { ok: true, status: 200, json: async () => openMeteoPayload() } as Response;
    }
    throw new Error(`Unexpected URL in test: ${url}`);
  });
}

beforeEach(() => {
  localStorage.clear();
  useClimateStore.setState({
    settings: useClimateStore.getState().settings,
    location: { ...DEFAULT_LOCATION },
    favorites: [],
    recents: [],
  });
  vi.stubGlobal("fetch", stubFetch());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function renderAt(path: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}

describe("App shell + dashboard", () => {
  it("renders the dashboard with live weather for Noida", async () => {
    renderAt("/");
    // Heading with the location name appears once data lands.
    expect(
      await screen.findByRole("heading", { name: "Noida", level: 1 })
    ).toBeInTheDocument();
    // Hero shows the condition text from the (mocked) provider.
    expect((await screen.findAllByText(/Mainly clear/i)).length).toBeGreaterThan(0);
    // Attribution footer/badge is present (Open-Meteo named somewhere).
    expect(screen.getAllByText(/Open-Meteo/i).length).toBeGreaterThan(0);
  });

  it("serves the 404 page for unknown routes", async () => {
    renderAt("/not-a-real-page");
    expect(await screen.findByText(/Lost in the forecast/i)).toBeInTheDocument();
  });
});

