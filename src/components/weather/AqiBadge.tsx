import { Link } from "react-router-dom";
import { computeIndiaAqi, usAqiCategory, aqiBandColor } from "@/utils/aqi";
import type { AirQualityCurrent } from "@/types/weather";

/** Compact US-EPA AQI chip with a link to the full AQ dashboard. */
export function AqiChip({ current }: { current?: AirQualityCurrent | null }) {
  if (!current || current.usAqi == null) {
    return (
      <Link
        to="/air-quality"
        className="inline-flex items-center gap-2 rounded-full border border-[var(--surface-border)] bg-[var(--surface-2)] px-3 py-1.5 text-xs font-semibold text-[var(--text-dim)] hover:bg-black/5 dark:hover:bg-white/10"
      >
        AQI unavailable →
      </Link>
    );
  }
  const us = usAqiCategory(Math.round(current.usAqi));
  const india = computeIndiaAqi(current);
  return (
    <Link
      to="/air-quality"
      className="inline-flex items-center gap-2 rounded-full border border-[var(--surface-border)] bg-[var(--surface-2)] py-1.5 pl-2 pr-3 text-xs font-semibold transition hover:bg-black/5 dark:hover:bg-white/10"
      aria-label={`Air quality index ${Math.round(current.usAqi)} (US EPA), ${us.label}. Open air quality dashboard.`}
    >
      <span
        aria-hidden="true"
        className="h-3 w-3 rounded-full"
        style={{ background: aqiBandColor(us.band) }}
      />
      <span className="text-[var(--text)]">
        AQI {Math.round(current.usAqi)}
      </span>
      <span className="text-[var(--text-dim)]">{us.label}</span>
      {india && (
        <span className="hidden text-[var(--text-dim)] sm:inline">
          · IN {india.aqi} {india.category}
        </span>
      )}
    </Link>
  );
}
