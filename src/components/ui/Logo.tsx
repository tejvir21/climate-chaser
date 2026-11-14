import { Link } from "react-router-dom";

/** Climate Chaser logomark — sun over horizon waves, all CSS/SVG, no image dependency. */
export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      to="/"
      aria-label="Climate Chaser — home"
      className="flex min-w-0 items-center gap-2.5 rounded-xl px-1 py-1.5"
    >
      <svg
        width="34"
        height="34"
        viewBox="0 0 48 48"
        role="img"
        aria-hidden="true"
        className="shrink-0 drop-shadow"
      >
        <defs>
          <linearGradient id="cc-sky" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#38bdf8" />
            <stop offset="1" stopColor="#1d4ed8" />
          </linearGradient>
          <linearGradient id="cc-sun" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fde68a" />
            <stop offset="1" stopColor="#f59e0b" />
          </linearGradient>
        </defs>
        <rect x="2" y="2" width="44" height="44" rx="12" fill="url(#cc-sky)" />
        <circle cx="24" cy="26" r="9" fill="url(#cc-sun)" />
        <path d="M6 30h36" stroke="#0ea5e9" strokeOpacity="0.5" strokeWidth="1.5" strokeDasharray="3 3" />
        <path d="M8 35c5 2.4 9-2.4 14 0s9-2.4 14 0 6-1.6 8-0.8" fill="none" stroke="#e0f2fe" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
      {!compact && (
        <span className="min-w-0 leading-tight">
          <span className="block text-[15px] font-extrabold tracking-tight text-white">
            Climate Chaser
          </span>
          <span className="block text-[10px] font-semibold uppercase tracking-widest text-sky-200/70">
            Weather Intelligence
          </span>
        </span>
      )}
    </Link>
  );
}
