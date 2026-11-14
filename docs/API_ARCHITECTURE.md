# Climate Chaser — API Architecture

**Status:** Implemented · **Updated:** 2026-11-13

## 1. Providers

| Provider | Role | Key required | Free tier notes | Attribution |
| --- | --- | --- | --- | --- |
| **Open-Meteo** (`api.open-meteo.com`, `air-quality-api.open-meteo.com`, `archive-api.open-meteo.com`, `geocoding-api.open-meteo.com`) | **Primary** — current, hourly, daily (16-day), UV, visibility, AQ, history, geocoding | No | 10,000 calls/day, no key | **Required** (CC BY 4.0): "Weather data by Open-Meteo.com" — shown in footer + settings |
| **OpenWeatherMap** (`api.openweathermap.org/data/2.5/weather`, `/forecast`) | Secondary / fallback snapshot | `VITE_OPENWEATHER_API_KEY` | 60 calls/min; current + 5-day/3-hour only | Required by free-plan terms — shown in footer |
| **IMD** (`api.imd.gov.in/public/`) | India official warnings | **Not supplied** | Registration + key per IMD docs | Pending — adapter implemented, disabled by default, enable via `VITE_IMD_API_ENABLED=true` + `VITE_IMD_API_KEY` |
| **RainViewer** (`tilecache.rainviewer.com`) | Radar overlay tiles on map | No | Personal/community use with attribution | Shown on map |
| **OpenFreeMap** (`tiles.openfreemap.org`) | Base map vector tiles | No | Free for all uses, no attribution legally required (ODbL OpenMapTiles + OSM though → we still show "© OpenMapTiles/OpenStreetMap contributors") | Map view + settings |
| **OpenAQ** | Station-level AQ | Not wired (requires key; coverage/license constraints) | — | Documented as future source |

Fallback chain for the current/forecast widget (documented, user-visible):

1. Open-Meteo (primary) — full 16-day forecast + all metrics.
2. OpenWeatherMap (secondary, if `VITE_OPENWEATHER_API_KEY` set) — today's snapshot only (temp, humidity, wind, feels-like). Clearly labelled "OpenWeatherMap · current conditions only".
3. In-memory + localStorage cache (last good response, max 30 min) — labelled **"Cached data · updated \<x\> ago (may be stale)"**.
4. Hard failure — error card with Retry; never silently blank.

Providers are **never** mixed field-by-field. If (1) succeeds, OWM is not consulted. If (1) fails and (2) succeeds, only (2)'s fields render.

## 2. Endpoints used (verified 2026-11-13, all HTTP 200)

### Open-Meteo forecast
`GET https://api.open-meteo.com/v1/forecast?latitude=..&longitude=..&current=...&hourly=...&daily=...&forecast_days=16&timezone=auto`
- `current`: temperature_2m, relative_humidity_2m, apparent_temperature, is_day, weather_code, pressure_msl, wind_speed_10m, wind_direction_10m, wind_gusts_10m
- `hourly`: temperature_2m, apparent_temperature, precipitation_probability, precipitation, weather_code, visibility, uv_index
- `daily`: weather_code, temperature_2m_max, temperature_2m_min, apparent_temperature_max, apparent_temperature_min, precipitation_sum, precipitation_probability_max, wind_speed_10m_max, wind_direction_10m_dominant, sunrise, sunset, uv_index_max
- Response: arrays aligned to `hourly.time` / `daily.time` ISO-8601 local time (`timezone=auto`).

### Open-Meteo geocoding
`GET https://geocoding-api.open-meteo.com/v1/search?name=<q>&count=8&language=en&format=json`
- Returns `results[]` with `id, name, country, admin1, latitude, longitude, elevation, population, feature_code, timezone`.
- India-first ranking: results for `country_code=IN` are boosted above an equivalent non-India match.
- Noida/Delhi coordinates come from this service (e.g. Noida → 28.58, 77.33); the full NCR is **not** one weather coordinate.

### Open-Meteo air quality
`GET https://air-quality-api.open-meteo.com/v1/air-quality?latitude=..&longitude=..&current=us_aqi,european_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone&hourly=...&forecast_days=2&timezone=auto`

### Open-Meteo archive (historical)
`GET https://archive-api.open-meteo.com/v1/archive?latitude=..&longitude=..&start_date=YYYY-MM-DD&end_date=YYYY-MM-DD&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`
- ERA5-Land reanalysis — **modelled, not station observations**; labelled as such in the UI.

### RainViewer
`GET https://api.rainviewer.com/public/weather-maps.json` → `{ radar: { past: [{time, path}], nowcast: [...] } }`
- Tiles: `https://tilecache.rainviewer.com/v2/radar/<frame>/256/{z}/{x}/{y}/2/1_1.png`

### OpenWeatherMap (secondary)
`GET https://api.openweathermap.org/data/2.5/weather?q=<city>&appid=<key>&units=metric`
`GET https://api.openweathermap.org/data/2.5/forecast?q=<city>&appid=<key>&units=metric`
- City **name** search (no OWM geocoding for location picker; geocoding is Open-Meteo's job).

## 3. Normalized data model (`src/types/weather.ts`)

`WeatherLocation, CurrentWeather, HourlyPoint, DailyPoint, AirQuality, Astronomy, WeatherBundle (full dashboard payload), ProviderId = 'open-meteo' | 'openweathermap', WeatherProviderMetadata { id, name, url, requiresKey, attribution, freshnessSeconds }, CachedPayload<T> { data, fetchedAt, source, stale }`.

UI components consume only normalized types. Provider adapters map raw → normalized; missing fields stay `undefined` and render as "—", never invented.

## 4. Resilience policy (`src/services/weather/http.ts`)

- **Timeout:** 8 s default (`AbortSignal.timeout`), 12 s for archive.
- **Retry:** up to 2 retries with exponential backoff (250 ms → 1 s), only for network/5xx/429, never for 4xx (except 429).
- **Deduplication:** identical in-flight requests share one promise (`Map<key, Promise>`).
- **Cache:** in-memory (10 min) + localStorage ("climate-chaser:cache:v1:<hash>", TTL 30 min). Cache keys contain no credentials — **OpenWeatherMap URLs (which embed the key) are never written to the cache**, per policy "never cache API credentials".
- **Rate limit:** 429 → backoff retry; surfaced to UI as "Rate limited — retrying shortly"; OWM 60/min respected by cache-first reads.
- **Stale labelling:** every rendered weather block shows provider + "updated <x> ago"; if from cache after provider failure → "Offline/stale data" badge; image/alerts derived from stale data are labelled.
- **Freshness:** `fetchedAt` carried in payload; UI recomputes age on render tick.

## 5. Environment variables (all public by definition)

| Var | Default | Purpose |
| --- | --- | --- |
| `VITE_OPENWEATHER_API_KEY` | _(unset)_ | Secondary provider. Also accepts legacy `VITE_API_key` as fallback. |
| `VITE_WEATHER_PROVIDER` | `open-meteo` | `open-meteo` (default) — forces secondary to only assist on failure |
| `VITE_IMD_API_ENABLED` | `false` | IMD adapter switch (needs `VITE_IMD_API_KEY`) |
| `VITE_IMD_API_KEY` | _(unset)_ | IMD registration key |
| `VITE_DEFAULT_CITY` | `Noida` | First-run location search seed |
| `VITE_DEFAULT_COUNTRY` | `India` | Same |
| `VITE_API_URL` / `VITE_FORCAST_URL` | legacy | Still honoured by the legacy path? — **No.** Removed in transformation; documented in README migration notes. |

## 6. Licensing & attribution

- Open-Meteo CC BY 4.0 → in-app footer + Settings → About.
- OpenWeatherMap free plan requires attribution → in-app footer.
- RainViewer → map attribution + Settings.
- OpenFreeMap / OpenMapTiles / © OpenStreetMap contributors → map attribution.
- MUI Icons/Lucide → MIT. Recharts MIT. MapLibre BSD-3-Clause.
- Unsplash imagery: used only for legacy preview cards; the transformation removes stock photos and uses data-driven visuals instead (no Unsplash dependency).
