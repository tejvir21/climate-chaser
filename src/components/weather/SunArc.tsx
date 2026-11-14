import { Sunrise, Sunset } from "lucide-react";
import { formatClock } from "@/utils/units";
import type { TimeFormat } from "@/utils/units";

/** Sun-path arc showing sunrise, sunset and current sun position. */
export function SunArc({
  sunrise,
  sunset,
  progress,
  timeFormat,
}: {
  sunrise: string;
  sunset: string;
  progress: number | null;
  timeFormat: TimeFormat;
}) {
  const pct = progress == null ? null : Math.round(progress * 100);
  // Arc from (10,80) to (110,80), apex at (60,20).
  const cx = 60 - 50 * Math.cos((progress ?? 0) * Math.PI);
  const cy = 80 - 60 * Math.sin((progress ?? 0) * Math.PI);

  return (
    <div className="flex flex-col items-center gap-1">
      <svg viewBox="0 0 120 88" className="w-40" role="img" aria-label="Sun path between sunrise and sunset">
        <path d="M10 80 A 55 55 0 0 1 110 80" fill="none" stroke="var(--surface-border)" strokeWidth="2" strokeDasharray="3 3" />
        <line x1="4" y1="80" x2="116" y2="80" stroke="var(--surface-border)" strokeWidth="1.5" />
        {progress != null && progress > 0 && progress < 1 && (
          <>
            <path
              d={`M10 80 A 55 55 0 0 1 ${cx.toFixed(1)} ${cy.toFixed(1)}`}
              fill="none"
              stroke="var(--accent)"
              strokeWidth="2.5"
              opacity="0.85"
            />
            <circle cx={cx} cy={cy} r="6" fill="var(--accent)" stroke="rgba(0,0,0,0.2)" strokeWidth="1.2" />
          </>
        )}
      </svg>
      <div className="flex w-full items-center justify-between text-[11px] font-semibold text-[var(--text-dim)]">
        <span className="inline-flex items-center gap-1">
          <Sunrise size={12} aria-hidden="true" />
          {formatClock(sunrise, timeFormat)}
        </span>
        {pct != null && <span>{pct}%</span>}
        <span className="inline-flex items-center gap-1">
          {formatClock(sunset, timeFormat)}
          <Sunset size={12} aria-hidden="true" />
        </span>
      </div>
    </div>
  );
}
