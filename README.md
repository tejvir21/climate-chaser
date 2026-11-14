# Climate Chaser

**Climate Chaser** is a production-grade weather intelligence platform for India and the world. It gives everyday users a five-second answer ("what's it like outside?") and gives power users 16-day forecasts, air-quality analytics, interactive radar maps, 10-year climate history, city comparison, and a rule-based travel/activity advisor — all from real, working APIs.

> **Live demo:** https://climatechaser.netlify.app/
> **Source:** https://github.com/tejvir21/climate-chaser

![Climate Chaser](public/icons/icon-512.png)

---

## Highlights

- **Live weather that actually works** — current conditions, 24-hour hourly strip, 7-day and full 16-day forecasts with interactive Recharts (temperature, feels-like, precipitation probability + amount, wind), all from Open-Meteo (no key needed).
- **India-first** — Noida, Delhi NCR, Mumbai, Bengaluru and every city on Earth via Open-Meteo geocoding. Indian-standard units (Celsius, km/h, mm, 24-hour clock) by default. Noida/Delhi each get their own precise coordinates — the NCR is never collapsed into one point.
- **Air quality with source transparency** — US EPA AQI, European AQI, and an **Indian National AQI (CPCB)** computed from modelled concentrations using the official CPCB breakpoints (clearly labelled as model-derived, not a station measurement). PM2.5, PM10, NO2, SO2, CO, O3 with sub-indices.
- **Weather-adaptive theme engine** — the whole UI gradient follows real conditions and time of day at the selected location: sunny, cloudy, fog, rain, snow, thunderstorm, night, and near-sunrise/sunset palettes. Light/dark modes; `prefers-reduced-motion` respected.
- **Interactive map** — MapLibre GL with OpenFreeMap Liberty basemap, RainViewer radar (12-frame playback + scrubbing), and optional OpenWeatherMap temperature/cloud/precipitation overlays. Click anywhere to inspect that place.
- **Historical climate** — 10-year ERA5-Land reanalysis via Open-Meteo archive: monthly temperature/rainfall profiles, annual rainfall, and "this month vs the 10-year normal". Explicitly labelled as reanalysis, not station observations.
- **Compare & travel** — compare up to 4 cities side-by-side (temp, humidity, wind, rain probability, AQI + charts); a travel planner (React Hook Form + Zod) with packing/activity advice for any trip window inside the forecast horizon.
- **Deterministic assistant** — answers "Should I carry an umbrella?", "Is tomorrow good for running?", "What's the AQI?", etc. strictly from loaded data. No AI, no invented numbers.
- **PWA** — installable (manifest + icons), service-worker offline cache with a clear "cached/stale" label and last-updated time. Cached data is **never** presented as live, and credential-bearing URLs are never cached.

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | React 18 + TypeScript (strict) |
| Build | Vite 5 |
| Routing | React Router 7 (lazy-loaded routes) |
| Styling | Tailwind CSS 3 + CSS custom-property design tokens |
| Data | TanStack Query (caching, dedup, retry) |
| State | Zustand (persisted to localStorage) |
| Charts | Recharts |
| Maps | MapLibre GL JS |
| Forms | React Hook Form + Zod |
| Icons | Lucide |
| Toasts | Sonner |
| Tests | Vitest + React Testing Library (59 tests) |

Material UI was fully removed in this transformation (the original app used it).

## Getting started

```bash
git clone https://github.com/tejvir21/climate-chaser.git
cd climate-chaser
npm install
cp .env.example .env      # optional: add an OpenWeatherMap key for the secondary provider
npm run dev               # http://localhost:5173
```

Open-Meteo needs no key — the app works immediately.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Type-check + production build to `dist/` |
| `npm run preview` | Serve the production build |
| `npm test` | Run the Vitest suite once |
| `npm run test:watch` | Vitest watch mode |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint (flat config, typescript-eslint) |

## Environment variables

See `.env.example`. All `VITE_*` values are **public** (inlined into the bundle). Open-Meteo requires no key. `VITE_OPENWEATHER_API_KEY` enables the secondary provider; `VITE_IMD_API_ENABLED`/`VITE_IMD_API_KEY` enable the (currently pending) IMD adapter.

## Architecture

Provider abstraction with a normalized data model — UI never touches raw provider payloads. See [`docs/API_ARCHITECTURE.md`](docs/API_ARCHITECTURE.md) for the full contract, endpoints, caching and fallback policy. Resilience (timeouts, exponential backoff, request dedup, in-memory + localStorage cache, `AbortController`) lives in `src/services/weather/http.ts`.

```
src/
  app/router.tsx          routes + error boundaries (lazy pages)
  components/{layout,ui,weather,charts}
  features/               pages (one per route)
  hooks/                  TanStack Query + media/clock hooks
  services/
    astronomy.ts          sunrise/sunset, moon phase
    theme/themes.ts       weather→gradient theme engine
    weather/
      http.ts             timeout/retry/dedup/cache
      openMeteo.ts        primary provider
      openWeatherMap.ts   secondary provider
      imd.ts              India official (stub, disabled by default)
      weatherService.ts   fallback chain
      wmo.ts              WMO code interpretation
  store/useClimateStore.ts  Zustand (persisted)
  utils/                  units, aqi (CPCB), advisor, alerts, assistant, travel
  types/weather.ts        normalized domain model
```

## Data sources & attribution

| Data | Provider | License / terms |
| --- | --- | --- |
| Weather, air quality, historical | [Open-Meteo](https://open-meteo.com/) | CC BY 4.0 (attribution shown in-app) |
| Secondary weather | [OpenWeatherMap](https://openweathermap.org/) | Free-plan attribution (shown in-app) |
| Historical reanalysis | Open-Meteo archive (ERA5-Land / Copernicus) | labelled as reanalysis |
| Geocoding | Open-Meteo Geocoding API | — |
| Radar overlay | [RainViewer](https://www.rainviewer.com/) | free with attribution (shown on map) |
| Map tiles | [OpenFreeMap](https://www.openfreemap.org/) Liberty / OpenMapTiles | © OpenMapTiles © OpenStreetMap contributors (shown on map) |
| Reverse geocode (optional) | BigDataCloud client API | free client endpoint |

Indian AQI is **computed** from modelled concentrations with CPCB breakpoints; it is not an official CPCB/IMD reading and is labelled as such everywhere it appears.

## Testing

```bash
npm test
```

59 tests across 9 files: unit conversion, CPCB AQI computation, activity advisor, travel planner, alert derivation, WMO mapping, provider fallback/cache/stale logic, the persisted store, and an integration test that mounts the real router + dashboard with a mocked API. External APIs are never hit in tests.

## Deployment (Netlify)

`netlify.toml` is included: build `npm run build`, publish `dist`, SPA fallback to `index.html`, and a production CSP + security headers. Set env vars in the Netlify UI (see the file for the list), then push to the connected branch or `netlify deploy --build`.

## Known limitations

- **IMD integration is a stub.** Official IMD district warnings need registration at api.imd.gov.in. Until credentials are supplied, the Alerts page shows only model-derived estimates, clearly labelled — never fabricated official warnings.
- **Open-Meteo air quality is modelled**, not station data; Indian AQI is computed, not measured. Values can diverge from nearby CPCB stations during extreme episodes.
- **OpenWeatherMap fallback is current-conditions only** (free tier has no 16-day forecast); when it answers, hourly/daily sections show an explicit "secondary provider" note.
- **Reverse geocoding** uses BigDataCloud's free client endpoint (best-effort); a coordinate label is used if it fails.
- **Radar coverage** is RainViewer's global composite; very localised showers may be missed.
- The service worker caches API responses (never credential URLs); clearing site data resets it.
- No account system by design — favourites/recents/preferences live in `localStorage`.

## License

MIT © 2026 Tejvir Chauhan — see [LICENSE](./LICENSE).

## Contact

Questions or feedback: open an issue or see the [author's portfolio](https://tejvir.netlify.app).