import { describe, it, expect } from "vitest";
import {
  formatTemperature,
  formatWind,
  formatVisibility,
  formatAge,
  formatClock,
  degreesToCardinal,
  toFahrenheit,
  formatPrecipitation,
} from "./units";

describe("formatTemperature", () => {
  it("rounds Celsius and appends degree", () => {
    expect(formatTemperature(28.6, "c")).toBe("29°");
    expect(formatTemperature(-3.2, "c")).toBe("-3°");
  });
  it("converts to Fahrenheit", () => {
    expect(toFahrenheit(0)).toBe(32);
    expect(toFahrenheit(100)).toBe(212);
    expect(formatTemperature(0, "f")).toBe("32°");
  });
});

describe("formatWind", () => {
  it("keeps km/h by default", () => {
    expect(formatWind(14.2, "kmh")).toBe("14 km/h");
  });
  it("converts to mph", () => {
    expect(formatWind(16.0934, "mph")).toBe("10 mph");
  });
});

describe("formatVisibility", () => {
  it("shows metres under 1 km, kilometres above", () => {
    expect(formatVisibility(500)).toBe("500 m");
    expect(formatVisibility(2600)).toBe("2.6 km");
    expect(formatVisibility(undefined)).toBe("—");
  });
});

describe("formatPrecipitation", () => {
  it("fixes to one decimal in mm", () => {
    expect(formatPrecipitation(1.234)).toBe("1.2 mm");
    expect(formatPrecipitation(0)).toBe("0.0 mm");
  });
});

describe("formatAge", () => {
  const now = 1_800_000_000_000;
  it("reports just now under a minute", () => {
    expect(formatAge(now - 30_000, now)).toBe("just now");
  });
  it("reports minutes and hours", () => {
    expect(formatAge(now - 5 * 60_000, now)).toBe("5 min ago");
    expect(formatAge(now - 3 * 3600_000, now)).toBe("3 h ago");
    expect(formatAge(now - 2 * 86400_000, now)).toBe("2 d ago");
  });
});

describe("formatClock", () => {
  it("renders 24h local wall time", () => {
    expect(formatClock("2026-11-13T16:15", "24h")).toBe("16:15");
    expect(formatClock("2026-11-13T05:07", "24h")).toBe("05:07");
  });
  it("renders 12h with AM/PM", () => {
    expect(formatClock("2026-11-13T16:15", "12h")).toBe("4:15 PM");
    expect(formatClock("2026-11-13T00:15", "12h")).toBe("12:15 AM");
    expect(formatClock("2026-11-13T12:15", "12h")).toBe("12:15 PM");
  });
});

describe("degreesToCardinal", () => {
  it("maps angles to 16-wind compass points", () => {
    expect(degreesToCardinal(0)).toBe("N");
    expect(degreesToCardinal(90)).toBe("E");
    expect(degreesToCardinal(180)).toBe("S");
    expect(degreesToCardinal(270)).toBe("W");
    expect(degreesToCardinal(225)).toBe("SW");
    expect(degreesToCardinal(360)).toBe("N");
  });
});
