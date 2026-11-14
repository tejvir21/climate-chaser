import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  CalendarRange,
  Wind,
  Map,
  Menu,
  X,
} from "lucide-react";
import { NAV_ITEMS } from "./navItems";

const PRIMARY = [
  { to: "/", label: "Home", icon: LayoutDashboard },
  { to: "/forecast", label: "Forecast", icon: CalendarRange },
  { to: "/air-quality", label: "Air", icon: Wind },
  { to: "/maps", label: "Maps", icon: Map },
];

/** Mobile-only bottom navigation with a "More" sheet for the rest. */
export function BottomNav() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  return (
    <>
      <nav
        aria-label="Mobile navigation"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-white/15 bg-black/70 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg lg:hidden"
      >
        <div className="mx-auto grid max-w-lg grid-cols-5">
          {PRIMARY.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              aria-current={pathname === to ? "page" : undefined}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold ${
                  isActive ? "text-[var(--accent)]" : "text-white/70"
                }`
              }
            >
              <Icon size={20} aria-hidden="true" />
              {label}
            </NavLink>
          ))}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="more-sheet"
            className={`flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold ${
              open ? "text-[var(--accent)]" : "text-white/70"
            }`}
          >
            {open ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
            More
          </button>
        </div>
      </nav>

      {open && (
        <div
          id="more-sheet"
          role="dialog"
          aria-label="All pages"
          className="fixed inset-x-3 bottom-[64px] z-30 rounded-2xl border border-white/15 bg-slate-950/95 p-3 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg lg:hidden"
        >
          <div className="grid grid-cols-2 gap-1.5">
            {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold ${
                    isActive
                      ? "bg-[var(--accent)] text-slate-900"
                      : "text-white/85 hover:bg-white/10"
                  }`
                }
              >
                <Icon size={18} aria-hidden="true" />
                {label}
              </NavLink>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
