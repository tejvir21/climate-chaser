/** WMO weather interpretation codes (Open-Meteo uses WMO 4677). */

export type ThemeKey =
  | "clear"
  | "cloudy"
  | "fog"
  | "rain"
  | "snow"
  | "storm"
  | "night"
  | "sunrise"
  | "sunset";

export interface WmoInfo {
  text: string;
  icon:
    | "sun"
    | "cloud-sun"
    | "cloud"
    | "cloud-fog"
    | "cloud-drizzle"
    | "cloud-rain"
    | "cloud-snow"
    | "cloud-lightning"
    | "cloud-hail"
    | "cloud-moon"
    | "moon";
  theme: ThemeKey;
}

const TABLE: Record<number, WmoInfo> = {
  0: { text: "Clear sky", icon: "sun", theme: "clear" },
  1: { text: "Mainly clear", icon: "sun", theme: "clear" },
  2: { text: "Partly cloudy", icon: "cloud-sun", theme: "cloudy" },
  3: { text: "Overcast", icon: "cloud", theme: "cloudy" },
  45: { text: "Fog", icon: "cloud-fog", theme: "fog" },
  48: { text: "Depositing rime fog", icon: "cloud-fog", theme: "fog" },
  51: { text: "Light drizzle", icon: "cloud-drizzle", theme: "rain" },
  53: { text: "Moderate drizzle", icon: "cloud-drizzle", theme: "rain" },
  55: { text: "Dense drizzle", icon: "cloud-drizzle", theme: "rain" },
  56: { text: "Light freezing drizzle", icon: "cloud-drizzle", theme: "rain" },
  57: { text: "Dense freezing drizzle", icon: "cloud-drizzle", theme: "rain" },
  61: { text: "Slight rain", icon: "cloud-rain", theme: "rain" },
  63: { text: "Moderate rain", icon: "cloud-rain", theme: "rain" },
  65: { text: "Heavy rain", icon: "cloud-rain", theme: "rain" },
  66: { text: "Light freezing rain", icon: "cloud-rain", theme: "rain" },
  67: { text: "Heavy freezing rain", icon: "cloud-rain", theme: "rain" },
  71: { text: "Slight snowfall", icon: "cloud-snow", theme: "snow" },
  73: { text: "Moderate snowfall", icon: "cloud-snow", theme: "snow" },
  75: { text: "Heavy snowfall", icon: "cloud-snow", theme: "snow" },
  77: { text: "Snow grains", icon: "cloud-snow", theme: "snow" },
  80: { text: "Slight rain showers", icon: "cloud-rain", theme: "rain" },
  81: { text: "Moderate rain showers", icon: "cloud-rain", theme: "rain" },
  82: { text: "Violent rain showers", icon: "cloud-rain", theme: "rain" },
  85: { text: "Slight snow showers", icon: "cloud-snow", theme: "snow" },
  86: { text: "Heavy snow showers", icon: "cloud-snow", theme: "snow" },
  95: { text: "Thunderstorm", icon: "cloud-lightning", theme: "storm" },
  96: { text: "Thunderstorm with slight hail", icon: "cloud-hail", theme: "storm" },
  99: { text: "Thunderstorm with heavy hail", icon: "cloud-hail", theme: "storm" },
};

export function wmoInfo(code: number | undefined | null, isDay = true): WmoInfo {
  const base = (code != null && TABLE[code]) || TABLE[3];
  if (!isDay) {
    // Night variants of clear/partly cloudy icons
    if (base.icon === "sun") return { ...base, icon: "moon", theme: "night" };
    if (base.icon === "cloud-sun") {
      return { ...base, icon: "cloud-moon", theme: "night" };
    }
    if (base.theme === "clear") return { ...base, theme: "night" };
  }
  return base;
}

export function isThunderstorm(code: number): boolean {
  return code >= 95 && code <= 99;
}

export function isSnow(code: number): boolean {
  return (code >= 71 && code <= 77) || code === 85 || code === 86;
}

export function isRainLike(code: number): boolean {
  return (
    (code >= 51 && code <= 67) ||
    (code >= 80 && code <= 82) ||
    (code >= 95 && code <= 99)
  );
}
