import { Droplets, Wind, Sun } from "lucide-react";
import type { DailyPoint } from "@/types/weather";
import { dayMonthShort, weekdayShort, degreesToCardinal } from "@/utils/units";
import type { TemperatureUnit } from "@/utils/units";
import { WeatherIcon } from "./WeatherIcon";
import { TempRangeBar } from "./TempRangeBar";

export function DailyList({
  daily,
  unit,
  days = 7,
  onSelectDay,
  selectedDate,
}: {
  daily: DailyPoint[];
  unit: TemperatureUnit;
  days?: number;
  onSelectDay?: (date: string) => void;
  selectedDate?: string | null;
}) {
  const slice = daily.slice(0, days);
  if (slice.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-[var(--text-dim)]">
        No daily forecast available from the provider.
      </p>
    );
  }
  const weekMin = Math.min(...slice.map((d) => d.tempMin));
  const weekMax = Math.max(...slice.map((d) => d.tempMax));

  return (
    <ul className="divide-y divide-[var(--surface-border)]">
      {slice.map((day) => {
        const selected = selectedDate === day.date;
        const interactive = Boolean(onSelectDay);
        const inner = (
          <>
            <div className="flex w-20 shrink-0 flex-col">
              <span className="text-sm font-bold text-[var(--text)]">{weekdayShort(day.date)}</span>
              <span className="text-[10px] font-semibold text-[var(--text-dim)]">{dayMonthShort(day.date)}</span>
            </div>
            <WeatherIcon code={day.weatherCode} size={22} className="shrink-0 text-[var(--accent)]" />
            <span className="hidden w-28 shrink-0 truncate text-[11px] text-[var(--text-dim)] md:block" title={day.weatherText}>
              {day.weatherText}
            </span>
            <span className="flex w-11 shrink-0 items-center gap-0.5 text-[11px] font-bold text-sky-400" title="Probability of precipitation">
              <Droplets size={11} aria-hidden="true" />
              {day.precipitationProbabilityMax}%
            </span>
            <div className="min-w-0 flex-1">
              <TempRangeBar min={day.tempMin} max={day.tempMax} weekMin={weekMin} weekMax={weekMax} unit={unit} />
            </div>
            <span className="hidden w-14 shrink-0 items-center justify-end gap-0.5 text-[11px] text-[var(--text-dim)] sm:flex" title={`Dominant wind ${degreesToCardinal(day.windDirectionDominant)}, max ${Math.round(day.windSpeedMax)} km/h`}>
              <Wind size={11} aria-hidden="true" />
              {Math.round(day.windSpeedMax)}
            </span>
            {day.uvIndexMax != null && (
              <span className="hidden w-9 shrink-0 items-center justify-end gap-0.5 text-[11px] text-amber-500 md:flex" title={`UV index max ${day.uvIndexMax.toFixed(1)}`}>
                <Sun size={11} aria-hidden="true" />
                {Math.round(day.uvIndexMax)}
              </span>
            )}
          </>
        );

        const base =
          "flex w-full items-center gap-2 px-2 py-2.5 text-left transition-colors sm:gap-3 sm:px-3";
        const state = selected
          ? "bg-[var(--accent)]/15"
          : interactive
            ? "hover:bg-black/5 dark:hover:bg-white/5"
            : "";

        return (
          <li key={day.date}>
            {interactive ? (
              <button
                type="button"
                onClick={() => onSelectDay?.(day.date)}
                aria-pressed={selected}
                className={`${base} ${state} rounded-xl`}
              >
                {inner}
              </button>
            ) : (
              <div className={`${base} ${state}`}>{inner}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
