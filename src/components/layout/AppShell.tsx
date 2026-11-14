import { useEffect, useState, type CSSProperties } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { Header } from "./Header";
import { BottomNav } from "./BottomNav";
import { AttributionFooter } from "./AttributionFooter";
import { Logo } from "@/components/ui/Logo";
import { useClimateStore } from "@/store/useClimateStore";
import { useWeatherBundle } from "@/hooks/useQueries";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import {
  chooseTheme,
  resolveAppearance,
  themeCssVariables,
  type ThemeSpec,
} from "@/services/theme/themes";
import { NAV_ITEMS } from "./navItems";

export function AppShell() {
  const [collapsed, setCollapsed] = useState(false);
  const { pathname } = useLocation();
  const setLocation = useClimateStore((s) => s.setLocation);
  const location = useClimateStore((s) => s.location);
  const favorites = useClimateStore((s) => s.favorites);
  const themeMode = useClimateStore((s) => s.settings.themeMode);
  const prefersDark = useMediaQuery("(prefers-color-scheme: dark)");

  // Share the same query cache as the pages — one network call, themed shell.
  const { data: weather } = useWeatherBundle(location);
  const bundle = weather?.bundle;

  const appearance = resolveAppearance(
    themeMode,
    bundle?.current.isDay ?? true,
    prefersDark
  );

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", appearance === "dark");
    root.style.colorScheme = appearance;
  }, [appearance]);

  const theme: ThemeSpec | null = bundle
    ? chooseTheme({
        weatherCode: bundle.current.weatherCode,
        isDay: bundle.current.isDay,
        nowIso: bundle.current.time,
        sunriseIso: bundle.daily[0]?.sunrise,
        sunsetIso: bundle.daily[0]?.sunset,
      })
    : null;

  const shellStyle = theme ? themeCssVariables(theme) : undefined;

  // Scroll to top on route change.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  const sidebarWidth = collapsed ? "w-[76px]" : "w-[248px]";
  const contentOffset = collapsed ? "lg:pl-[76px]" : "lg:pl-[248px]";

  return (
    <div
      className="app-gradient min-h-dvh text-[var(--text)]"
      style={shellStyle as CSSProperties | undefined}
    >
      {/* Desktop sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-white/15 bg-black/35 px-3 py-4 backdrop-blur-md transition-[width] duration-300 lg:flex ${sidebarWidth}`}
        aria-label="Primary navigation"
      >
        <div className="flex items-center justify-between gap-2 px-1">
          <Logo compact={collapsed} />
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-pressed={collapsed}
            className="rounded-lg p-2 text-white/80 transition hover:bg-white/10 hover:text-white"
          >
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
        </div>

        <nav className="mt-4 flex-1 space-y-1 overflow-y-auto scrollbar-thin">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all ${
                  isActive
                    ? "bg-[var(--accent)] text-slate-900 shadow-glow"
                    : "text-white/85 hover:bg-white/10 hover:text-white"
                } ${collapsed ? "justify-center" : ""}`
              }
            >
              <Icon size={19} aria-hidden="true" className="shrink-0" />
              {!collapsed && <span>{label}</span>}
            </NavLink>
          ))}

          {!collapsed && favorites.length > 0 && (
            <div className="pt-4">
              <p className="px-3 text-[10px] font-bold uppercase tracking-widest text-white/50">
                Favorites
              </p>
              <div className="mt-1 max-h-40 space-y-0.5 overflow-y-auto scrollbar-thin">
                {favorites.slice(0, 6).map((fav) => (
                  <button
                    key={fav.id}
                    type="button"
                    onClick={() => setLocation(fav)}
                    className="block w-full truncate rounded-lg px-3 py-1.5 text-left text-xs font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
                  >
                    {fav.name}
                    <span className="text-white/45"> · {fav.countryCode ?? fav.country}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </nav>
      </aside>

      {/* Main column */}
      <div className={`flex min-h-dvh flex-col transition-[padding] duration-300 ${contentOffset}`}>
        <Header />
        <main className="mx-auto w-full max-w-7xl flex-1 px-3 pb-28 pt-4 sm:px-5 lg:pb-10 lg:pt-6">
          <Outlet />
        </main>
        <AttributionFooter />
      </div>

      {/* Mobile bottom navigation */}
      <BottomNav />
    </div>
  );
}
