import { describe, it, expect } from "vitest";
import { wmoInfo, isThunderstorm, isSnow, isRainLike } from "./wmo";

describe("wmoInfo", () => {
  it("maps clear sky day/night", () => {
    expect(wmoInfo(0, true).theme).toBe("clear");
    expect(wmoInfo(0, false).theme).toBe("night");
    expect(wmoInfo(0, false).icon).toBe("moon");
  });

  it("maps common weather codes", () => {
    expect(wmoInfo(3).text).toBe("Overcast");
    expect(wmoInfo(45).theme).toBe("fog");
    expect(wmoInfo(61).theme).toBe("rain");
    expect(wmoInfo(71).theme).toBe("snow");
    expect(wmoInfo(95).theme).toBe("storm");
  });

  it("falls back for unknown codes", () => {
    expect(wmoInfo(999).text).toBe("Overcast");
    expect(wmoInfo(undefined).text).toBe("Overcast");
  });

  it("helper predicates", () => {
    expect(isThunderstorm(95)).toBe(true);
    expect(isThunderstorm(61)).toBe(false);
    expect(isSnow(73)).toBe(true);
    expect(isSnow(61)).toBe(false);
    expect(isRainLike(80)).toBe(true);
    expect(isRainLike(71)).toBe(false);
  });
});
