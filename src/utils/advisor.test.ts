import { describe, it, expect } from "vitest";
import { advise } from "./advisor";

const mild = {
  tempC: 24,
  feelsLikeC: 24,
  rainProbability: 0,
  precipMm: 0,
  windKmh: 8,
  uvIndex: 2,
  humidity: 45,
  usAqi: 30,
};

describe("advise", () => {
  it("rates comfortable conditions as Great for every activity", () => {
    for (const activity of ["walking", "running", "cycling", "sports", "travel", "outdoor"] as const) {
      expect(advise(activity, mild).label).toBe("Great");
      expect(advise(activity, mild).score).toBeGreaterThanOrEqual(75);
    }
  });

  it("penalises heavy rain heavily for cycling", () => {
    const advice = advise("cycling", { ...mild, rainProbability: 80, precipMm: 12 });
    expect(advice.score).toBeLessThan(75);
    expect(advice.reasons.join(" ")).toMatch(/rain/i);
  });

  it("warns about dangerous heat for running", () => {
    const advice = advise("running", { ...mild, feelsLikeC: 40 });
    expect(advice.score).toBeLessThanOrEqual(70);
    expect(advice.reasons.join(" ")).toMatch(/heat/i);
  });

  it("flags very poor air quality for sports", () => {
    const advice = advise("sports", { ...mild, usAqi: 320 });
    expect(advice.score).toBeLessThanOrEqual(65);
    expect(advice.reasons.join(" ")).toMatch(/pollution/i);
  });

  it("flags strong wind for cycling more than for walking", () => {
    const cycling = advise("cycling", { ...mild, windKmh: 42 });
    const walking = advise("walking", { ...mild, windKmh: 42 });
    expect(cycling.score).toBeLessThan(walking.score);
  });

  it("always returns at least one reason", () => {
    expect(advise("walking", mild).reasons.length).toBeGreaterThan(0);
  });

  it("clamps scores to 0..100", () => {
    const brutal = advise("sports", {
      tempC: 41,
      feelsLikeC: 44,
      rainProbability: 100,
      precipMm: 60,
      windKmh: 90,
      uvIndex: 11,
      humidity: 95,
      usAqi: 450,
    });
    expect(brutal.score).toBeGreaterThanOrEqual(0);
    expect(brutal.score).toBeLessThanOrEqual(100);
    expect(brutal.label).toBe("Poor");
  });
});
