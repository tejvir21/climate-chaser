import { describe, it, expect } from "vitest";
import { deriveAlerts, describeSeverity } from "./alerts";
import type { DailyPoint, HourlyPoint } from "@/types/weather";

function day(date: string, overrides: Partial<DailyPoint> = {}): DailyPoint {
  return {
    date,
    weatherCode: 0,
    weatherText: "Clear sky",
    tempMax: 25,
    tempMin: 15,
    precipitationSum: 0,
    precipitationProbabilityMax: 0,
    windSpeedMax: 10,
    windDirectionDominant: 0,
    sunrise: `${date}T06:30`,
    sunset: `${date}T17:30`,
    ...overrides,
  };
}

describe("deriveAlerts", () => {
  it("emits nothing for mild weather", () => {
    expect(deriveAlerts([day("2026-11-14"), day("2026-11-15")])).toEqual([]);
  });

  it("warns on heavy rain ≥ 64.5 mm", () => {
    const alerts = deriveAlerts([day("2026-11-14", { precipitationSum: 70, precipitationProbabilityMax: 85 })]);
    const rain = alerts.find((a) => a.id.startsWith("rain-heavy"));
    expect(rain).toBeDefined();
    expect(rain!.severity).toBe("watch");
    expect(rain!.source).toBe("model");
  });

  it("escalates to warning for very heavy rain ≥ 115.6 mm", () => {
    const alerts = deriveAlerts([day("2026-11-14", { precipitationSum: 130 })]);
    const rain = alerts.find((a) => a.id.startsWith("rain-very-heavy"));
    expect(rain!.severity).toBe("warning");
  });

  it("flags thunderstorms and heatwaves and cold waves", () => {
    const alerts = deriveAlerts([
      day("2026-11-14", { weatherCode: 95, weatherText: "Thunderstorm" }),
      day("2026-11-15", { tempMax: 41 }),
      day("2026-11-16", { tempMin: 2 }),
    ]);
    expect(alerts.some((a) => a.id.startsWith("storm"))).toBe(true);
    expect(alerts.some((a) => a.id.startsWith("heat") && a.severity === "warning")).toBe(true);
    expect(alerts.some((a) => a.id.startsWith("cold"))).toBe(true);
  });

  it("sorts warnings before watches before advisories", () => {
    const alerts = deriveAlerts([
      day("2026-11-14", { tempMin: 2 }), // watch
      day("2026-11-15", { tempMax: 41 }), // warning
    ]);
    expect(alerts[0].severity).toBe("warning");
  });

  it("flags fog from hourly codes", () => {
    const hourly: HourlyPoint[] = [
      { time: "2026-11-14T06:00", temperature: 12, apparentTemperature: 12, precipitationProbability: 0, precipitation: 0, weatherCode: 45, weatherText: "Fog", isDay: true },
      { time: "2026-11-14T07:00", temperature: 12, apparentTemperature: 12, precipitationProbability: 0, precipitation: 0, weatherCode: 45, weatherText: "Fog", isDay: true },
    ];
    const alerts = deriveAlerts([day("2026-11-14")], hourly);
    expect(alerts.some((a) => a.id.startsWith("fog"))).toBe(true);
  });
});

describe("describeSeverity", () => {
  it("labels all three severities", () => {
    expect(describeSeverity("warning").label).toBe("Warning");
    expect(describeSeverity("watch").label).toBe("Watch");
    expect(describeSeverity("advisory").label).toBe("Advisory");
  });
});
