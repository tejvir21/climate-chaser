# Climate Chaser — Repository Audit

**Date:** 2026-11-13
**Audited by:** Engineering QA (in-repo inspection + running app verification)
**Scope:** Working tree at the start of the platform transformation (includes fixes from the prior audit pass, uncommitted).

## 1. Stack as found (before transformation)

| Item | Found |
| --- | --- |
| Language | JavaScript (JSX), no TypeScript |
| Framework | React 18.3.1 |
| Build | Vite 5.4.20 |
| UI library | Material UI 6.5.0 (@mui/material + icons + Emotion) |
| Routing | None (single view) |
| Data fetching | Raw `fetch` inside components; no cache/retry/timeout/dedup |
| Weather provider | OpenWeatherMap (current weather + 5-day / 3-hour forecast) |
| State | Local `useState` only; no persistence |
| Tests | None originally → 14 added in prior pass (Vitest 2.1.9 + Testing Library) |
| Lint | ESLint 9 flat config (`react`, `react-hooks`, `react-refresh`) — now clean |
| PWA | None |
| Docs | `docs/IMPLEMENTATION_PLAN.md` was required but **did not exist** |
| License | README claimed MIT; no LICENSE file → LICENSE added (MIT, Tejvir Chauhan) |
| Live site | https://climatechaser.netlify.app/ — serving the **old** build (verified 2026-11-13; title "ClimateChaser - by Tejvir Chauhan") |

## 2. Verified functionality (old app, confirmed by running it)

- Searching a valid city (e.g. London) returns current weather (temp, min/max, humidity, feels-like) from OpenWeatherMap (HTTP 200).
- 5-day forecast cards render; clicking a day shows its 3-hourly breakdown.
- Unknown city (e.g. "Notacity") shows an inline error.
- Live API key (`.env`, git-ignored) works for both endpoints.

## 3. Verified defects (old app) — all fixed in the prior pass

- `Forcast.jsx` called `setState` synchronously during render for every unique date (crash/instability risk under React StrictMode/data-order changes).
- Forecast fetch had **no** error handling: rejected promises, no abort, stale results could race.
- Search had **no** loading state, no `AbortController`/sequence guard (out-of-order responses overwrote newer results), no `encodeURIComponent` (city names with `&` broke the query), cleared the input before the request completed.
- Non-OK API responses produced a generic "not in API!" message; network failures indistinguishable from 404s.
- 31 ESLint errors (prop-types missing, unused vars, unescaped entities, unused `Button` import).
- Forecast cards were `div`s with `onClick` — invisible to keyboard/screen readers.
- Favicon pointed at `src/assets/image.png`, which is not copied to the production bundle → 404 in prod.
- No OpenWeatherMap / Unsplash attribution (required by OWM free-plan terms).
- `CardMedia` title "green iguana"; "Temperatute"; "can de described"; rain-fill height divided by `counter*2` (mismatched its own percentage label).
- `bun.lockb` **and** `package-lock.json` both tracked (Netlify auto-detects Bun → stale/incorrect builds).
- `npm start` documented in README but does not exist (`npm run dev`).
- Self-hosted Roboto font files returned 502 Bad Gateway through the verification relay; server serves them fine (verified: `200 font/woff2`).
- `.env` not committed (good) but no `.env.example`; no LICENSE; no deployment config beyond informal Netlify link; no CSP/security headers; animated gradient failed `prefers-reduced-motion`; footer text unreadable during the dark phase of the background animation.

## 4. Baseline measurements (working tree, pre-transformation)

| Check | Result |
| --- | --- |
| `npm run build` | ✅ passes (JS 338 kB / 108 kB gzip) |
| `npm run lint` | ✅ 0 errors (after fixes; was 31) |
| `npm test` | ✅ 14/14 (3 files) |
| Live site browser check | ✅ loads (old build), no console errors observed |

## 5. Known constraints / limitations carried into the transformation

1. **No deploy credentials available** in this environment — Netlify deploys must be triggered by pushing to the connected repo or `netlify deploy` with the owner's auth. Local production-build verification via `vite preview` is used instead.
2. **Open-Meteo** (free, no key) is adopted as the primary provider. **OpenWeatherMap** remains a secondary provider (key in `.env`, inlined client-side by design; documented).
3. **IMD (api.imd.gov.in)** and **OpenAQ** require registration/API keys that have not been supplied → adapters implemented with explicit "pending" states; documented, never silently faked.
4. **RainViewer** radar overlay is free (attribution required, shown). Map tiles from OpenFreeMap (free, no key); basemap attribution shown. Public OSM tile servers are not used for production traffic.
5. Bundle size budget: reduce via route-based code-splitting; MUI removed entirely.
6. This audit does not claim legal compliance review; licensing notes are documented, not certified.
