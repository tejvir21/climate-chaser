import { describe, it, expect } from "vitest";
import {
  computeIndiaAqi,
  indiaCategory,
  usAqiCategory,
  aqiBandColor,
} from "./aqi";

describe("computeIndiaAqi", () => {
  it("returns null with no pollutant data", () => {
    expect(computeIndiaAqi({})).toBeNull();
  });

  it("computes a Good reading for clean air", () => {
    const result = computeIndiaAqi({ pm25: 10, pm10: 15 });
    expect(result).not.toBeNull();
    expect(result!.aqi).toBeLessThanOrEqual(50);
    expect(result!.category).toBe("Good");
  });

  it("classifies very polluted air as Poor/Very Poor/Severe per CPCB", () => {
    const result = computeIndiaAqi({ pm25: 150 }); // CPCB band 300+
    expect(result).not.toBeNull();
    expect(result!.dominantPollutant).toBe("PM2.5");
    expect(result!.aqi).toBeGreaterThanOrEqual(301);
  });

  it("dominant pollutant is the highest sub-index", () => {
    // PM10 moderate-high; NO2 clean. Dominant must be PM10.
    const result = computeIndiaAqi({ pm10: 260, nitrogenDioxide: 5 });
    expect(result!.dominantPollutant).toBe("PM10");
  });

  it("interpolates linearly inside a breakpoint band", () => {
    // PM2.5 45 µg/m³ → band 30-60, index 51-100: 51 + (15/30)*49 = 75.5 → 76
    const result = computeIndiaAqi({ pm25: 45 });
    expect(result!.subIndices.pm25).toBe(76);
  });

  it("caps the worst band at 500", () => {
    const result = computeIndiaAqi({ pm25: 800 });
    expect(result!.aqi).toBe(500);
  });
});

describe("indiaCategory", () => {
  it("bands per CPCB categories", () => {
    expect(indiaCategory(40).label).toBe("Good");
    expect(indiaCategory(80).label).toBe("Satisfactory");
    expect(indiaCategory(150).label).toBe("Moderate");
    expect(indiaCategory(250).label).toBe("Poor");
    expect(indiaCategory(350).label).toBe("Very Poor");
    expect(indiaCategory(480).label).toBe("Severe");
  });
});

describe("usAqiCategory", () => {
  it("bands per US EPA", () => {
    expect(usAqiCategory(30).label).toBe("Good");
    expect(usAqiCategory(75).label).toBe("Moderate");
    expect(usAqiCategory(120).label).toBe("Unhealthy for sensitive groups");
    expect(usAqiCategory(175).label).toBe("Unhealthy");
    expect(usAqiCategory(275).label).toBe("Very Unhealthy");
    expect(usAqiCategory(400).label).toBe("Hazardous");
  });
});

describe("aqiBandColor", () => {
  it("returns a hex colour for every band 1-6", () => {
    for (const band of [1, 2, 3, 4, 5, 6]) {
      expect(aqiBandColor(band)).toMatch(/^#/);
    }
  });
});
