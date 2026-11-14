import { describe, it, expect } from "vitest";
import { assessTrip, tripSpanDays, primaryConcern } from "./travel";
import type { DailyPoint } from "@/types/weather";

function day(date: string, overrides: Partial<DailyPoint> = {}): DailyPoint {
  return {
    date,
    weatherCode: 0,
    weatherText: "Clear sky",
    tempMax: 30,
    tempMin: 20,
    precipitationSum: 0,
    precipitationProbabilityMax: 10,
    windSpeedMax: 12,
    windDirectionDominant: 0,
    sunrise: `${date}T06:30`,
    sunset: `${date}T17:30`,
    ...overrides,
  };
}

describe("assessTrip", () => {
  const rows = [
    day("2026-11-14", { tempMax: 33, tempMin: 24 }),
    day("2026-11-15", { tempMax: 34, tempMin: 25, precipitationSum: 12, precipitationProbabilityMax: 80 }),
    day("2026-11-16", { tempMax: 31, tempMin: 23 }),
  ];

  it("summarizes highs, lows, rain totals and coverage", () => {
    const result = assessTrip(rows, "2026-11-14", "2026-11-16");
    expect(result).not.toBeNull();
    expect(result!.daysCovered).toBe(3);
    expect(result!.maxTemp).toBe(34);
    expect(result!.minTemp).toBe(23);
    expect(result!.totalRainMm).toBe(12);
    expect(result!.maxRainProbability).toBe(80);
    expect(result!.rainyDays).toBe(1);
  });

  it("suggests an umbrella when rain is likely", () => {
    const result = assessTrip(rows, "2026-11-14", "2026-11-16");
    expect(result!.tips.join(" ")).toMatch(/umbrella/i);
  });

  it("ignores dates outside the window", () => {
    const result = assessTrip(rows, "2026-11-15", "2026-11-15");
    expect(result!.daysCovered).toBe(1);
    expect(result!.maxTemp).toBe(34);
  });

  it("returns null when no forecast overlaps the trip window", () => {
    expect(assessTrip(rows, "2027-01-01", "2027-01-05")).toBeNull();
  });

  it("flags storm days and heat", () => {
    const stormy = [
      day("2026-11-14", { weatherCode: 95, weatherText: "Thunderstorm", tempMax: 41 }),
    ];
    const asap = assessTrip(stormy, "2026-11-14", "2026-11-14");
    expect(asap!.stormyDays).toBe(1);
    expect(asap!.tips.join(" ")).toMatch(/thunderstorm/i);
    expect(primaryConcern(asap!)).toBe("Storms likely");
  });
});

describe("tripSpanDays", () => {
  it("counts inclusively", () => {
    expect(tripSpanDays("2026-11-14", "2026-11-14")).toBe(1);
    expect(tripSpanDays("2026-11-14", "2026-11-16")).toBe(3);
  });
});

describe("primaryConcern", () => {
  it("returns null for mild trips", () => {
    const result = assessTrip([day("2026-11-14")], "2026-11-14", "2026-11-14");
    expect(primaryConcern(result!)).toBeNull();
  });
});
