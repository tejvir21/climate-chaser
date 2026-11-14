import {
  Sun,
  Moon,
  Monitor,
  Trash2,
  Star,
  Database,
  ExternalLink,
  KeyRound,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import pkg from "../../package.json";
import { useClimateStore, DEFAULT_LOCATION } from "@/store/useClimateStore";
import { openWeatherEnabled } from "@/services/weather/openWeatherMap";
import { imdStatus } from "@/services/weather/imd";
import { Card, SegmentedControl, Button, Badge } from "@/components/ui/primitives";
import type { ThemeMode } from "@/store/useClimateStore";

export default function Settings() {
  const {
    settings,
    setSetting,
    favorites,
    removeFavorite,
    clearRecents,
    recents,
  } = useClimateStore();

  const imd = imdStatus();

  function clearCachedWeather() {
    let removed = 0;
    try {
      const keys = Object.keys(localStorage).filter((k) =>
        k.startsWith("climate-chaser:")
      );
      // Keep the persisted store itself; only clear caches and last-good snapshots.
      for (const key of keys) {
        if (key.startsWith("climate-chaser:store:")) continue;
        localStorage.removeItem(key);
        removed += 1;
      }
    } catch {
      /* storage unavailable */
    }
    toast.success(
      removed > 0
        ? `Cleared ${removed} cached entr${removed === 1 ? "y" : "ies"}`
        : "Nothing cached to clear"
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-[var(--text)] sm:text-3xl">
          Settings
        </h1>
        <p className="mt-1 text-sm text-[var(--text-dim)]">
          Units, appearance, data sources and storage. Everything is stored locally in
          your browser.
        </p>
      </div>

      {/* Units */}
      <Card as="section" className="space-y-4 p-4 sm:p-5" aria-labelledby="units-heading">
        <h2 id="units-heading" className="text-base font-extrabold text-[var(--text)]">
          Units & formats
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--text-dim)]">
              Temperature
            </p>
            <SegmentedControl
              ariaLabel="Temperature unit"
              options={[
                { value: "c", label: "°C" },
                { value: "f", label: "°F" },
              ]}
              value={settings.unit}
              onChange={(unit) => setSetting("unit", unit)}
            />
          </div>
          <div>
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--text-dim)]">
              Wind speed
            </p>
            <SegmentedControl
              ariaLabel="Wind speed unit"
              options={[
                { value: "kmh", label: "km/h" },
                { value: "mph", label: "mph" },
              ]}
              value={settings.windUnit}
              onChange={(windUnit) => setSetting("windUnit", windUnit)}
            />
          </div>
          <div>
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--text-dim)]">
              Clock
            </p>
            <SegmentedControl
              ariaLabel="Time format"
              options={[
                { value: "24h", label: "24-hour" },
                { value: "12h", label: "12-hour" },
              ]}
              value={settings.timeFormat}
              onChange={(timeFormat) => setSetting("timeFormat", timeFormat)}
            />
          </div>
        </div>
        <p className="text-[11px] text-[var(--text-dim)]">
          India conventions: Celsius, km/h, millimetres, 24-hour clock by default.
        </p>
      </Card>

      {/* Appearance */}
      <Card as="section" className="space-y-4 p-4 sm:p-5" aria-labelledby="appearance-heading">
        <h2 id="appearance-heading" className="text-base font-extrabold text-[var(--text)]">
          Appearance
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <SegmentedControl
            ariaLabel="Theme mode"
            options={[
              { value: "auto", label: "Auto" },
              { value: "light", label: "Light" },
              { value: "dark", label: "Dark" },
            ] as Array<{ value: ThemeMode; label: string }>}
            value={settings.themeMode}
            onChange={(themeMode) => setSetting("themeMode", themeMode)}
          />
          <span className="flex items-center gap-2 text-xs text-[var(--text-dim)]">
            {settings.themeMode === "light" ? <Sun size={14} aria-hidden /> : settings.themeMode === "dark" ? <Moon size={14} aria-hidden /> : <Monitor size={14} aria-hidden />}
            Auto follows your system and darkens at night.
          </span>
        </div>
        <p className="text-[11px] text-[var(--text-dim)]">
          Page gradients follow the actual weather at your selected location — sunny,
          cloudy, rain, storm, snow, night and near-sunrise/sunset palettes.
        </p>
      </Card>

      {/* Data sources */}
      <Card as="section" className="space-y-4 p-4 sm:p-5" aria-labelledby="sources-heading">
        <h2 id="sources-heading" className="flex items-center gap-2 text-base font-extrabold text-[var(--text)]">
          <Database size={17} aria-hidden /> Data sources
        </h2>

        <div>
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--text-dim)]">
            Provider preference
          </p>
          <SegmentedControl
            ariaLabel="Weather provider"
            options={[
              { value: "auto", label: "Auto (recommended)" },
              { value: "open-meteo", label: "Open-Meteo only" },
              { value: "openweathermap", label: "OpenWeatherMap only" },
            ]}
            value={settings.provider}
            onChange={(provider) => setSetting("provider", provider)}
          />
          <p className="mt-1.5 text-[11px] text-[var(--text-dim)]">
            Auto: Open-Meteo first; on failure, falls back to OpenWeatherMap (current
            conditions only), then to a clearly-labelled cached snapshot.
          </p>
        </div>

        <div className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-2)] p-3 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-bold text-[var(--text)]">OpenWeatherMap API key</span>
            <Badge tone={openWeatherEnabled() ? "good" : "warn"}>
              {openWeatherEnabled() ? "Configured" : "Not configured"}
            </Badge>
          </div>
          <p className="mt-1.5 flex items-start gap-1.5 text-[var(--text-dim)]">
            <KeyRound size={12} className="mt-0.5 shrink-0" aria-hidden />
            Keys live in <code>VITE_OPENWEATHER_API_KEY</code> in <code>.env</code> (never
            committed). Anything prefixed <code>VITE_</code> is public in the browser bundle —
            OpenWeatherMap free-tier keys are designed for this, but do not reuse a paid key.
          </p>
        </div>

        <div className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-2)] p-3 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-bold text-[var(--text)]">IMD district warnings</span>
            <Badge tone={imd.enabled ? "good" : "warn"}>
              {imd.enabled ? "Configured" : "Pending"}
            </Badge>
          </div>
          <p className="mt-1.5 text-[var(--text-dim)]">{imd.reason}</p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-[var(--text)]">Cached weather data</p>
            <p className="text-[11px] text-[var(--text-dim)]">
              Clears the last-known snapshots and API cache stored in this browser.
            </p>
          </div>
          <Button variant="outline" onClick={clearCachedWeather}>
            <Trash2 size={15} aria-hidden /> Clear cache
          </Button>
        </div>
      </Card>

      {/* Favorites & recents */}
      <Card as="section" className="space-y-4 p-4 sm:p-5" aria-labelledby="fav-heading">
        <h2 id="fav-heading" className="text-base font-extrabold text-[var(--text)]">
          Favorites & recents
        </h2>

        <div>
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-dim)]">
              Favorites ({favorites.length})
            </p>
          </div>
          {favorites.length === 0 ? (
            <p className="mt-1 text-xs text-[var(--text-dim)]">
              No favorites yet — tap the star on the dashboard.
            </p>
          ) : (
            <ul className="mt-1.5 grid gap-1.5 sm:grid-cols-2">
              {favorites.map((fav) => (
                <li
                  key={fav.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-2)] px-3 py-2"
                >
                  <span className="min-w-0 text-sm font-semibold text-[var(--text)]">
                    {fav.name}
                    <span className="text-[var(--text-dim)]">, {fav.countryCode ?? fav.country}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => removeFavorite(fav.id)}
                    aria-label={`Remove ${fav.name} from favorites`}
                    className="rounded-lg p-1.5 text-[var(--text-dim)] transition hover:bg-red-500/15 hover:text-red-400"
                  >
                    <Star size={15} aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-[var(--text)]">Recent searches ({recents.length})</p>
            <p className="text-[11px] text-[var(--text-dim)]">Stored only on this device.</p>
          </div>
          <Button variant="outline" onClick={clearRecents} disabled={recents.length === 0}>
            Clear recents
          </Button>
        </div>
      </Card>

      {/* About */}
      <Card as="section" className="space-y-3 p-4 sm:p-5" aria-labelledby="about-heading">
        <h2 id="about-heading" className="text-base font-extrabold text-[var(--text)]">
          About & licenses
        </h2>
        <p className="text-xs leading-relaxed text-[var(--text-dim)]">
          Climate Chaser v{pkg.version} · MIT © 2026 Tejvir Chauhan ·{" "}
          <a className="text-sky-400 hover:underline" href="https://github.com/tejvir21/climate-chaser" target="_blank" rel="noopener noreferrer">
            Source on GitHub <ExternalLink size={10} className="inline" aria-hidden />
          </a>{" "}
          ·{" "}
          <a className="text-sky-400 hover:underline" href="https://tejvir.netlify.app" target="_blank" rel="noopener noreferrer">
            Author <ExternalLink size={10} className="inline" aria-hidden />
          </a>
        </p>
        <ul className="grid gap-1 text-[11px] leading-relaxed text-[var(--text-dim)] sm:grid-cols-2">
          <li>Weather & air: <a className="text-sky-400 hover:underline" href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Open-Meteo.com</a> (CC BY 4.0)</li>
          <li>Secondary: <a className="text-sky-400 hover:underline" href="https://openweathermap.org/" target="_blank" rel="noopener noreferrer">OpenWeatherMap</a></li>
          <li>Historical: Open-Meteo archive (ERA5-Land)</li>
          <li>Geocoding: Open-Meteo Geocoding API</li>
          <li>Radar: <a className="text-sky-400 hover:underline" href="https://www.rainviewer.com/" target="_blank" rel="noopener noreferrer">RainViewer</a></li>
          <li>Map: <a className="text-sky-400 hover:underline" href="https://openmaptiles.org/" target="_blank" rel="noopener noreferrer">OpenMapTiles</a> / <a className="text-sky-400 hover:underline" href="https://www.openfreemap.org/" target="_blank" rel="noopener noreferrer">OpenFreeMap</a></li>
          <li>Map data © <a className="text-sky-400 hover:underline" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a></li>
          <li>Reverse geocoding (optional): BigDataCloud free client API</li>
          <li>Icons: Lucide (MIT) · Charts: Recharts (MIT) · MapLibre GL (BSD-3)</li>
          <li>UI: React · Vite · Tailwind CSS · TanStack Query · Zustand</li>
        </ul>
        <p className="flex items-start gap-1.5 text-[10px] leading-snug text-[var(--text-dim)]">
          <ShieldCheck size={12} className="mt-0.5 shrink-0" aria-hidden />
          No account, no tracking cookies, no analytics. Your favorites, recents and
          preferences never leave this browser. Weather requests go directly to the providers.
        </p>
      </Card>

      <p className="text-center text-[10px] text-[var(--text-dim)]">
        Default location is {DEFAULT_LOCATION.name}, India — change it by searching any city above.
      </p>
    </div>
  );
}
