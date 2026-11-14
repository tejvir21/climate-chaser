import {
  ChevronRight,
  Droplets,
  Eye,
  Gauge,
  Star,
  Sun,
  Umbrella,
  Wind,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useClimateStore } from "@/store/useClimateStore";
import { useAirQuality, useWeatherBundle } from "@/hooks/useQueries";
import { useNow } from "@/hooks/useNow";
import { localDateLabel, localNowIso, localTimeLabel, timeZoneAbbreviation } from "@/utils/localTime";
import { formatTemperature, formatWind, formatVisibility } from "@/utils/units";
import { Card, Skeleton } from "@/components/ui/primitives";
import { WeatherIcon } from "@/components/weather/WeatherIcon";
import { SourceBadge } from "@/components/weather/SourceBadge";
import { HourlyScroll } from "@/components/weather/HourlyScroll";
import { DailyList } from "@/components/weather/DailyList";
import { MetricCard } from "@/components/weather/MetricCard";
import { WindCompass } from "@/components/weather/WindCompass";
import { SunArc } from "@/components/weather/SunArc";
import { AqiChip } from "@/components/weather/AqiBadge";
import { ErrorState } from "@/components/weather/ErrorState";
import { toast } from "sonner";

function uvLabel(uv: number): string {
  if (uv < 3) return "Low";
  if (uv < 6) return "Moderate";
  if (uv < 8) return "High";
  if (uv < 11) return "Very High";
  return "Extreme";
}

export default function Dashboard() {
  const location = useClimateStore((s) => s.location);
  const settings = useClimateStore((s) => s.settings);
  const toggleFavorite = useClimateStore((s) => s.toggleFavorite);
  const isFav = useClimateStore((s) =>
    s.favorites.some((f) => f.id === location.id)
  );

  const {
    data,
    isPending,
    isError,
    error,
    isFetching,
    refresh,
  } = useWeatherBundle(location);
  const airQuality = useAirQuality(location);
  const now = useNow(60_000);

  const bundle = data?.bundle ?? null;

  if (isPending && !bundle) return <DashboardSkeleton />;

  if (isError && !bundle) {
    const weatherError = (error as Error & { weatherError?: import("@/types/weather").WeatherError })?.weatherError;
    return (
      <div className="py-10">
        <ErrorState
          message={weatherError?.message ?? (error instanceof Error ? error.message : "Unknown error")}
          attempted={weatherError?.attempted}
          onRetry={() => void refresh()}
        />
      </div>
    );
  }

  if (!bundle) return <DashboardSkeleton />;

  const current = bundle.current;
  const timezone = bundle.timezone;
  const nowDate = new Date(now);
  const nowIsoLocal = localNowIso(timezone, nowDate);
  const today = bundle.daily[0];
  const isFavNow = isFav;

  return (
    <div className="space-y-4">
      {/* ─────────────── HERO ─────────────── */}
      <section className="card relative overflow-hidden p-5 sm:p-7" aria-labelledby="location-heading">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-28 -top-28 h-80 w-80 rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, var(--accent-glow), transparent 70%)" }}
        />
        <div className="relative grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1
                  id="location-heading"
                  className="text-3xl font-black tracking-tight text-[var(--text)] sm:text-5xl"
                >
                  {bundle.location.name}
                </h1>
                <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-[var(--text-dim)] sm:text-sm">
                  {[bundle.location.admin1, bundle.location.country]
                    .filter(Boolean)
                    .join(", ")}
                </p>
                <p className="mt-1.5 text-sm font-medium text-[var(--text-dim)]">
                  {localDateLabel(timezone, nowDate)} ·{" "}
                  <span className="tabular-nums">
                    {localTimeLabel(timezone, settings.timeFormat, nowDate)}
                  </span>{" "}
                  <span className="text-xs">{timeZoneAbbreviation(timezone, nowDate)}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  toggleFavorite(location);
                  toast.success(
                    isFavNow ? `Removed ${location.name} from favorites` : `Saved ${location.name} to favorites`
                  );
                }}
                aria-pressed={isFavNow}
                aria-label={isFavNow ? "Remove from favorites" : "Save to favorites"}
                title={isFavNow ? "Remove from favorites" : "Save to favorites"}
                className="rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-2)] p-3 text-[var(--text)] transition hover:scale-105 hover:border-[var(--accent)]"
              >
                <Star
                  size={22}
                  aria-hidden="true"
                  className={isFavNow ? "fill-amber-400 text-amber-400" : ""}
                />
              </button>
            </div>

            <div className="mt-4 flex flex-wrap items-end gap-x-6 gap-y-3">
              <p className="text-7xl font-black leading-none tracking-tighter text-[var(--text)] sm:text-8xl">
                {formatTemperature(current.temperature, settings.unit)}
                <span className="align-top text-3xl font-bold text-[var(--text-dim)]">
                  {settings.unit === "c" ? "C" : "F"}
                </span>
              </p>
              <div className="pb-2">
                <p className="max-w-48 text-lg font-bold leading-snug text-[var(--text)]">
                  {current.weatherText}
                </p>
                <p className="mt-0.5 text-sm text-[var(--text-dim)]">
                  Feels like {formatTemperature(current.apparentTemperature, settings.unit)}
                  {current.tempMax != null && current.tempMin != null && (
                    <>
                      {" "}· H:{formatTemperature(current.tempMax, settings.unit)} L:{formatTemperature(current.tempMin, settings.unit)}
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <AqiChip current={airQuality.data?.current} />
              {today && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--surface-border)] bg-[var(--surface-2)] px-3 py-1.5 text-xs font-semibold text-[var(--text)]">
                  <Umbrella size={12} aria-hidden="true" className="text-sky-400" />
                  {Math.round(today.precipitationSum * 10) / 10} mm today
                </span>
              )}
            </div>

            <div className="mt-4">
              <SourceBadge
                meta={bundle.provider}
                now={now}
                onRefresh={() => void refresh()}
                refreshing={isFetching}
              />
            </div>
          </div>

          {/* Big condition illustration */}
          <div className="hidden select-none flex-col items-center justify-center gap-4 pl-6 sm:flex" aria-hidden="true">
            <WeatherIcon
              code={current.weatherCode}
              isDay={current.isDay}
              size={128}
              className="text-[var(--accent)] drop-shadow-2xl"
            />
            <SunArc
              sunrise={bundle.astronomy.sunrise}
              sunset={bundle.astronomy.sunset}
              progress={bundle.astronomy.sunProgress}
              timeFormat={settings.timeFormat}
            />
          </div>
        </div>

        {bundle.provider.partial && (
          <p role="status" className="relative mt-4 rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-2 text-xs font-semibold text-amber-700 dark:text-amber-300">
            Secondary provider active — showing current conditions only. Hourly and daily
            forecasts need Open-Meteo to be reachable. Details in{" "}
            <Link to="/settings" className="underline underline-offset-2">Settings → Data sources</Link>.
          </p>
        )}
      </section>

      {/* ─────────────── HOURLY ─────────────── */}
      <Card as="section" className="p-4 sm:p-5" aria-labelledby="hourly-heading">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id="hourly-heading" className="text-base font-extrabold text-[var(--text)] sm:text-lg">
            Hourly forecast
          </h2>
          <Link
            to="/forecast"
            className="inline-flex items-center gap-0.5 text-xs font-bold text-[var(--accent)] hover:underline"
          >
            16 days & charts <ChevronRight size={13} aria-hidden="true" />
          </Link>
        </div>
        <HourlyScroll
          hourly={bundle.hourly}
          nowIsoLocal={nowIsoLocal}
          unit={settings.unit}
          timeFormat={settings.timeFormat}
          hours={24}
        />
      </Card>

      {/* ─────────────── DAILY + METRICS ─────────────── */}
      <div className="grid gap-4 lg:grid-cols-5">
        <Card as="section" className="p-4 sm:p-5 lg:col-span-3" aria-labelledby="daily-heading">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h2 id="daily-heading" className="text-base font-extrabold text-[var(--text)] sm:text-lg">
              7-day forecast
            </h2>
            <Link
              to="/forecast"
              className="inline-flex items-center gap-0.5 text-xs font-bold text-[var(--accent)] hover:underline"
            >
              Details <ChevronRight size={13} aria-hidden="true" />
            </Link>
          </div>
          <DailyList daily={bundle.daily} unit={settings.unit} days={7} />
        </Card>

        <div className="grid grid-cols-2 content-start gap-3 lg:col-span-2">
          {/* Wind card with compass */}
          <Card className="col-span-2 flex items-center justify-between gap-3 !p-4">
            <div>
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[var(--text-dim)]">
                <Wind size={13} aria-hidden="true" /> Wind
              </div>
              <p className="mt-1.5 text-3xl font-extrabold text-[var(--text)]">
                {formatWind(current.windSpeed, settings.windUnit)}
              </p>
              {current.windGusts != null && (
                <p className="mt-0.5 text-xs text-[var(--text-dim)]">
                  Gusts {formatWind(current.windGusts, settings.windUnit)}
                </p>
              )}
            </div>
            <WindCompass degrees={current.windDirection} size={88} />
          </Card>

          <MetricCard
            icon={<Droplets size={13} />}
            label="Humidity"
            value={`${Math.round(current.humidity)}%`}
            sub={current.humidity > 60 ? "Feels muggy" : "Comfortable"}
          />
          <MetricCard
            icon={<Gauge size={13} />}
            label="Pressure"
            value={`${Math.round(current.pressureMsl)}`}
            sub="hPa · mean sea level"
          />
          <MetricCard
            icon={<Eye size={13} />}
            label="Visibility"
            value={formatVisibility(current.visibility)}
            sub={
              current.visibility != null && current.visibility < 2000
                ? "Poor — drive carefully"
                : "Clear view"
            }
          />
          <MetricCard
            icon={<Sun size={13} />}
            label="UV index"
            value={current.uvIndex != null ? current.uvIndex.toFixed(1) : "—"}
            sub={current.uvIndex != null ? uvLabel(current.uvIndex) : "Unavailable"}
          />
        </div>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading weather">
      <div className="card p-5 sm:p-7">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="mt-3 h-8 w-56" />
        <Skeleton className="mt-2 h-4 w-40" />
        <div className="mt-5 flex items-end gap-6">
          <Skeleton className="h-24 w-40" />
          <Skeleton className="h-16 w-36" />
        </div>
        <Skeleton className="mt-5 h-7 w-56" />
      </div>
      <div className="card p-5">
        <Skeleton className="h-5 w-40" />
        <div className="mt-3 flex gap-2 overflow-hidden">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-[74px] shrink-0" />
          ))}
        </div>
      </div>
    </div>
  );
}
