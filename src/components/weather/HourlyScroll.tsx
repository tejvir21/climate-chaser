import { Droplets } from "lucide-react";
import type { HourlyPoint } from "@/types/weather";
import { formatClock, formatTemperature } from "@/utils/units";
import type { TemperatureUnit, TimeFormat } from "@/utils/units";
import { WeatherIcon } from "./WeatherIcon";

export function HourlyScroll({
  hourly,
  nowIsoLocal,
  unit,
  timeFormat,
  hours = 24,
}: {
  hourly: HourlyPoint[];
  nowIsoLocal: string;
  unit: TemperatureUnit;
  timeFormat: TimeFormat;
  hours?: number;
}) {
  const nowMs = Date.parse(nowIsoLocal);
  const upcoming = hourly
    .filter((h) => Date.parse(h.time) >= nowMs - 30 * 60 * 1000)
    .slice(0, hours);

  if (upcoming.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-[var(--text-dim)]">
        No hourly data available from the provider.
      </p>
    );
  }

  return (
    <div
      className="-mx-1 flex gap-2 overflow-x-auto scrollbar-thin px-1 pb-2"
      role="list"
      aria-label="Hourly forecast"
    >
      {upcoming.map((hour) => {
        const showPrecip = hour.precipitationProbability >= 20;
        return (
          <div
            key={hour.time}
            role="listitem"
            className="flex w-[74px] shrink-0 flex-col items-center gap-1 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-2)] px-1.5 py-2.5"
          >
            <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-dim)]">
              {formatClock(hour.time, timeFormat)}
            </span>
            <WeatherIcon code={hour.weatherCode} isDay={hour.isDay} size={26} className="text-[var(--accent)]" />
            <span className="text-sm font-extrabold text-[var(--text)]">
              {formatTemperature(hour.temperature, unit)}
            </span>
            <span
              className={`flex items-center gap-0.5 text-[10px] font-semibold ${
                showPrecip ? "text-sky-400" : "text-transparent"
              }`}
              aria-hidden={!showPrecip}
            >
              <Droplets size={10} aria-hidden="true" />
              {hour.precipitationProbability}%
            </span>
          </div>
        );
      })}
    </div>
  );
}
