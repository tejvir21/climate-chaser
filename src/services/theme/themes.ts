/** Weather theme engine — maps condition + day/night (+ near-horizon) to a gradient. */

import type { ThemeKey } from "@/services/weather/wmo";
import { wmoInfo } from "@/services/weather/wmo";

export interface ThemeSpec {
  key: ThemeKey;
  label: string;
  /** Page gradient (from → via → to). */
  from: string;
  via: string;
  to: string;
  accent: string;
  accentGlow: string;
}

const THEMES: Record<ThemeKey, ThemeSpec> = {
  clear: {
    key: "clear",
    label: "Sunny",
    from: "#0f4c81",
    via: "#2d6fb7",
    to: "#e8a94e",
    accent: "#f6c453",
    accentGlow: "rgba(246, 196, 83, 0.45)",
  },
  cloudy: {
    key: "cloudy",
    label: "Cloudy",
    from: "#3b4a5f",
    via: "#54677f",
    to: "#8fa3b8",
    accent: "#cbd5e1",
    accentGlow: "rgba(203, 213, 225, 0.35)",
  },
  fog: {
    key: "fog",
    label: "Foggy",
    from: "#4a5568",
    via: "#5f6f84",
    to: "#9aa7b5",
    accent: "#e2e8f0",
    accentGlow: "rgba(226, 232, 240, 0.3)",
  },
  rain: {
    key: "rain",
    label: "Rainy",
    from: "#0c2740",
    via: "#14385c",
    to: "#1f4e74",
    accent: "#38bdf8",
    accentGlow: "rgba(56, 189, 248, 0.4)",
  },
  snow: {
    key: "snow",
    label: "Snow",
    from: "#405d7a",
    via: "#6684a3",
    to: "#c3d3e2",
    accent: "#e0f2fe",
    accentGlow: "rgba(224, 242, 254, 0.4)",
  },
  storm: {
    key: "storm",
    label: "Thunderstorm",
    from: "#120e2a",
    via: "#241d47",
    to: "#3a2f63",
    accent: "#c084fc",
    accentGlow: "rgba(192, 132, 252, 0.45)",
  },
  night: {
    key: "night",
    label: "Night",
    from: "#050b1f",
    via: "#101a3c",
    to: "#2b2547",
    accent: "#818cf8",
    accentGlow: "rgba(129, 140, 248, 0.4)",
  },
  sunrise: {
    key: "sunrise",
    label: "Sunrise",
    from: "#37294e",
    via: "#8a4a63",
    to: "#e08b4e",
    accent: "#fda4af",
    accentGlow: "rgba(253, 164, 175, 0.4)",
  },
  sunset: {
    key: "sunset",
    label: "Sunset",
    from: "#2c1f3f",
    via: "#7c3a5a",
    to: "#d9693b",
    accent: "#fb923c",
    accentGlow: "rgba(251, 146, 60, 0.45)",
  },
};

export interface ThemeDecision {
  spec: ThemeSpec;
  /** Resolved light/dark appearance given the user's mode. */
  appearance: "light" | "dark";
}

/** Minutes around sunrise/sunset in which the horizon theme takes over. */
const HORIZON_WINDOW_MIN = 50;

export function chooseTheme(input: {
  weatherCode: number;
  isDay: boolean;
  /** Current location time as ISO local string. */
  nowIso: string;
  sunriseIso?: string;
  sunsetIso?: string;
}): ThemeSpec {
  const { weatherCode, isDay, nowIso, sunriseIso, sunsetIso } = input;
  const now = Date.parse(nowIso);

  // Near the horizon the sky itself is the theme, whatever the condition.
  if (Number.isFinite(now)) {
    const sr = sunriseIso ? Date.parse(sunriseIso) : NaN;
    const ss = sunsetIso ? Date.parse(sunsetIso) : NaN;
    if (Number.isFinite(sr) && Math.abs(now - sr) <= HORIZON_WINDOW_MIN * 60_000) {
      return THEMES.sunrise;
    }
    if (Number.isFinite(ss) && Math.abs(now - ss) <= HORIZON_WINDOW_MIN * 60_000) {
      return THEMES.sunset;
    }
  }

  if (!isDay) return THEMES.night;
  return THEMES[wmoInfo(weatherCode, true).theme] ?? THEMES.cloudy;
}

export function resolveAppearance(
  mode: "auto" | "light" | "dark",
  isDay: boolean,
  prefersDark: boolean
): "light" | "dark" {
  if (mode === "light") return "light";
  if (mode === "dark") return "dark";
  // Auto: follow OS preference, then the sun — night always dark.
  if (!isDay && !prefersDark) return "dark";
  return prefersDark ? "dark" : "light";
}

export function themeCssVariables(spec: ThemeSpec): Record<string, string> {
  return {
    "--bg-from": spec.from,
    "--bg-via": spec.via,
    "--bg-to": spec.to,
    "--accent": spec.accent,
    "--accent-glow": spec.accentGlow,
  };
}
