# Climate Chaser — Implementation Plan

**Date:** 2026-11-13 · **Status:** Living document, updated per phase.

## Strategy

The existing app (React 18 + Vite + MUI + OpenWeatherMap) is upgraded **in place**, not rewritten. MUI is removed after each feature is migrated to the Tailwind design system. The app is migrated to TypeScript with `strict` mode. Open-Meteo becomes the primary data provider; OpenWeatherMap stays as an optional secondary provider; IMD/OpenAQ are adapter-pending.

Phase order (each ends with: lint + tests + build + docs update):

| Phase | Scope | Acceptance gate |
| --- | --- | --- |
| 0 | Repository audit (done) | `docs/REPOSITORY_AUDIT.md` |
| 1 | TS migration, Tailwind design system, theme engine, router, layout shell (sidebar/bottom nav/header) | build + lint green; shell renders all routes |
| 2 | Dashboard: hero, hourly, daily, metrics, provider badge | live data renders; error/empty/loading states verified |
| 3 | Weather provider architecture: types, providers (Open-Meteo, OWM), adapters, cache, retry, timeout, dedup, fallback | unit tests for fallback/timeout/cache |
| 4 | Forecast route: 24 h hourly, 7/16-day daily, Recharts (temp, feels-like, precip prob, precip sum, wind) | charts interactive; responsive |
| 5 | Maps (MapLibre GL + RainViewer radar + OpenFreeMap basemap) and Air Quality page (Open-Meteo AQ + Indian AQI computation) | map loads with attribution; AQI labels correct per standard; source shown |
| 6 | Historical analytics (Open-Meteo archive) + astronomy (sunrise/sunset, moon phase, daylight) | labelled reanalysis; no invented averages |
| 7 | Compare (≤4 cities) + Travel planner (RHF + Zod) | both flows work end-to-end |
| 8 | Insights: activity advisor + deterministic assistant + alerts (rule-based, clearly labelled "model estimate, not official warning") | recommendations cite inputs |
| 9 | PWA: manifest, icons, SW with offline cache policy, last-updated stamp | installable; cached data labelled stale, never as live |
| 10 | Tests, browser verification (Noida/Delhi/Mumbai, geolocation, units, themes, every route), Netlify config + docs | tests green; build green; browser log clean |

## Non-negotiable rules

1. No fabricated weather data; no placeholder buttons; no nonfunctional navigation.
2. Every provider returns normalized data; UI never consumes raw provider payloads.
3. Provider failures fall back per policy (see `docs/API_ARCHITECTURE.md`) and are **surfaced** to the user.
4. AQI standard always labelled (US EPA / European / Indian National computed from modelled concentrations).
5. Cached data always labelled with its last-updated time.
6. `VITE_*` variables are public; no private secrets client-side. Key-requiring providers behind flags.
7. `prefers-reduced-motion` respected; keyboard accessible; semantic HTML.

## Deliberate simplifications (documented, not hidden)

- No account system (favorites/recents in `localStorage` via Zustand persist).
- shadcn/ui *pattern* (composable primitives + Tailwind) implemented natively — no copy-in of the whole shadcn catalog; fewer dependencies, smaller bundle.
- Material UI fully removed once migrated (no dual-UI period).
- IMD: adapter + settings flag + docs; activates when official credentials are supplied.
- OpenAQ: not wired; Open-Meteo AQ (free, no key) covers PM2.5/PM10/NO2/SO2/CO/O3/US AQI/European AQI. OpenAQ remains documented as a future station-data source (its free tier now requires a key and has coverage/licensing constraints).
