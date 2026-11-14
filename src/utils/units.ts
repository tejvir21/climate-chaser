/** Unit conversion and formatting helpers. Store always uses metric. */

export type TemperatureUnit = "c" | "f";
export type WindSpeedUnit = "kmh" | "mph";
export type TimeFormat = "12h" | "24h";

export function toFahrenheit(celsius: number): number {
  return (celsius * 9) / 5 + 32;
}

export function formatTemperature(celsius: number, unit: TemperatureUnit): string {
  const value = unit === "f" ? toFahrenheit(celsius) : celsius;
  return `${Math.round(value)}°`;
}

export function formatTemperatureExact(
  celsius: number,
  unit: TemperatureUnit
): string {
  const value = unit === "f" ? toFahrenheit(celsius) : celsius;
  return `${(Math.round(value * 10) / 10).toFixed(1)}°`;
}

export function formatWind(kmh: number, unit: WindSpeedUnit): string {
  if (unit === "mph") {
    return `${Math.round(kmh / 1.60934)} mph`;
  }
  return `${Math.round(kmh)} km/h`;
}

export function formatPrecipitation(mm: number): string {
  return `${(Math.round(mm * 10) / 10).toFixed(1)} mm`;
}

export function formatVisibility(metres: number | undefined): string {
  if (metres == null) return "—";
  if (metres >= 1000) return `${(metres / 1000).toFixed(1)} km`;
  return `${Math.round(metres)} m`;
}

/** "Updated 3 min ago" style relative times. */
export function formatAge(epochMs: number, now = Date.now()): string {
  const seconds = Math.max(0, Math.floor((now - epochMs) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  return `${days} d ago`;
}

export function formatClock(
  isoLocal: string,
  format: TimeFormat
): string {
  // isoLocal is an ISO string WITHOUT timezone, i.e. wall-clock at the
  // location (e.g. 2026-11-13T16:15). Format literally, no TZ shifting.
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(isoLocal);
  if (!m) return "";
  const [, , , , hh, mm] = m;
  let hour = Number(hh);
  const minute = mm;
  if (format === "24h") {
    return `${String(hour).padStart(2, "0")}:${minute}`;
  }
  const suffix = hour >= 12 ? "PM" : "AM";
  hour = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour}:${minute} ${suffix}`;
}

export function weekdayShort(dateIso: string): string {
  const d = new Date(`${dateIso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateIso;
  return d.toLocaleDateString("en-IN", { weekday: "short" });
}

export function dayMonthShort(dateIso: string): string {
  const d = new Date(`${dateIso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateIso;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function degreesToCardinal(deg: number): string {
  const dirs = [
    "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
    "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW",
  ];
  const index = Math.round(((deg % 360) + 360) % 360 / 22.5) % 16;
  return dirs[index];
}
