import { formatTemperature } from "@/utils/units";
import type { TemperatureUnit } from "@/utils/units";

/** Bar showing a day's temp range within the visible week range. */
export function TempRangeBar({
  min,
  max,
  weekMin,
  weekMax,
  unit,
}: {
  min: number;
  max: number;
  weekMin: number;
  weekMax: number;
  unit: TemperatureUnit;
}) {
  const span = Math.max(0.1, weekMax - weekMin);
  const left = ((min - weekMin) / span) * 100;
  const width = Math.max(4, ((max - min) / span) * 100);

  return (
    <div className="flex items-center gap-2">
      <span className="w-8 text-right text-xs font-semibold text-[var(--text-dim)]">
        {formatTemperature(min, unit)}
      </span>
      <div
        className="relative h-1.5 min-w-16 flex-1 overflow-hidden rounded-full bg-black/15 dark:bg-white/15"
        aria-hidden="true"
      >
        <div
          className="absolute h-full rounded-full bg-gradient-to-r from-sky-400 via-amber-300 to-orange-500"
          style={{ left: `${left}%`, width: `${width}%` }}
        />
      </div>
      <span className="w-8 text-xs font-semibold text-[var(--text)]">
        {formatTemperature(max, unit)}
      </span>
    </div>
  );
}
