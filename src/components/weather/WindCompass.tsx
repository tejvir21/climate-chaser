import { degreesToCardinal } from "@/utils/units";

/** SVG compass with a needle pointing in the wind direction (meteorological: direction wind blows FROM). */
export function WindCompass({ degrees, size = 96 }: { degrees: number; size?: number }) {
  const normalized = ((degrees % 360) + 360) % 360;
  const cardinal = degreesToCardinal(normalized);
  return (
    <div
      role="img"
      aria-label={`Wind direction ${cardinal} (${Math.round(normalized)} degrees, direction the wind is coming from)`}
      className="flex flex-col items-center"
    >
      <svg width={size} height={size} viewBox="0 0 100 100" className="overflow-visible">
        <circle cx="50" cy="50" r="46" fill="var(--surface-2)" stroke="var(--surface-border)" strokeWidth="1.5" />
        {["N", "E", "S", "W"].map((label, i) => {
          const angle = (i * 90 * Math.PI) / 180;
          const x = 50 + 36 * Math.sin(angle);
          const y = 50 - 36 * Math.cos(angle) + 4;
          return (
            <text
              key={label}
              x={x}
              y={y}
              textAnchor="middle"
              fontSize="12"
              fontWeight="700"
              fill={label === "N" ? "var(--accent)" : "var(--text-dim)"}
            >
              {label}
            </text>
          );
        })}
        <g transform={`rotate(${normalized} 50 50)`}>
          <polygon points="50,14 56,50 50,44 44,50" fill="var(--accent)" stroke="rgba(0,0,0,0.25)" strokeWidth="0.8" />
          <polygon points="50,86 55,52 50,56 45,52" fill="var(--text-dim)" opacity="0.7" />
        </g>
        <circle cx="50" cy="50" r="4" fill="var(--text)" />
      </svg>
      <span className="mt-1 text-xs font-bold text-[var(--text-dim)]">
        {cardinal} · {Math.round(normalized)}°
      </span>
    </div>
  );
}
