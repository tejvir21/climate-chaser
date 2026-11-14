import { Link } from "react-router-dom";
import { Monitor, Moon, Sun, Settings } from "lucide-react";
import { WeatherSearch } from "@/components/weather/WeatherSearch";
import { SegmentedControl } from "@/components/ui/primitives";
import { useClimateStore, type ThemeMode } from "@/store/useClimateStore";
import { Logo } from "@/components/ui/Logo";

const themeOrder: ThemeMode[] = ["auto", "light", "dark"];

export function Header() {
  const settings = useClimateStore((s) => s.settings);
  const setSetting = useClimateStore((s) => s.setSetting);

  function cycleThemeMode() {
    const index = themeOrder.indexOf(settings.themeMode);
    setSetting("themeMode", themeOrder[(index + 1) % themeOrder.length]);
  }

  const ThemeIcon =
    settings.themeMode === "light" ? Sun : settings.themeMode === "dark" ? Moon : Monitor;

  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-black/30 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-5">
        {/* Mobile logo (desktop has the sidebar) */}
        <div className="shrink-0 lg:hidden">
          <Logo compact />
        </div>
        <div className="min-w-0 flex-1">
          <WeatherSearch />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div className="hidden sm:block">
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
          <button
            type="button"
            onClick={cycleThemeMode}
            className="rounded-xl border border-white/15 bg-white/5 p-2.5 text-white/90 transition hover:bg-white/15"
            aria-label={`Theme mode: ${settings.themeMode}. Click to cycle auto, light, dark.`}
            title={`Theme: ${settings.themeMode}`}
          >
            <ThemeIcon size={18} aria-hidden="true" />
          </button>
          <Link
            to="/settings"
            aria-label="Open settings"
            title="Settings"
            className="rounded-xl border border-white/15 bg-white/5 p-2.5 text-white/90 transition hover:bg-white/15 lg:hidden"
          >
            <Settings size={18} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </header>
  );
}
