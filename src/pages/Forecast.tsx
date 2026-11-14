import { useMemo, useState } from "react";
import { CalendarDays, Droplets, Info, Wind } from "lucide-react";
import { useClimateStore } from "@/store/useClimateStore";
import { useWeatherBundle } from "@/hooks/useQueries";
import { useNow } from "@/hooks/useNow";
import {
  formatClock,
  formatTemperature,
  formatWind,
  dayMonthShort,
  weekdayShort,
} from "@/utils/units";
import { localNowIso } from "@/utils/localTime";
import { Card, Skeleton, Badge } from "@/components/ui/primitives";
import { DailyList } from "@/components/weather/DailyList";
import { SourceBadge } from "@/components/weather/SourceBadge";
import { ErrorState, EmptyState } from "@/components/weather/ErrorState";
import { WeatherIcon } from "@/components/weather/WeatherIcon";
import {
  TemperatureChart,
  PrecipitationChart,
  SimpleBars,
} from "@/components/charts/WeatherCharts";

export default function Forecast() {
  const location = useClimateStore((s) => s.location);
  const settings = useClimateStore((s) => s.settings);
  const { data, isPending, isError, error, isFetching, refresh } =
    useWeatherBundle(location);
  const now = useNow(60_000);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const bundle = data?.bundle ?? null;
  const timezone = bundle?.timezone ?? "UTC";
  const nowIsoLocal = useMemo(
    () => localNowIso(timezone, new Date(now)),
    [timezone, now]
  );

  const next48h = useMemo(
    () =>
      bundle?.hourly
        .filter((h) => h.time >= nowIsoLocal)
        .slice(0, 48) ?? [],
    [bundle?.hourly, nowIsoLocal]
  );

  const selectedEntries = useMemo(() => {
    const date = selectedDay ?? bundle?.daily[0]?.date;
    if (!date || !bundle) return { date: null, entries: [] };
    return {
      date,
      entries: bundle.hourly.filter((h) => h.time.startsWith(date)),
    };
  }, [selectedDay, bundle]);

  if (isPending && !bundle) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Loading forecast">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (isError && !bundle) {
    const weatherError = (
      error as Error & { weatherError?: import("@/types/weather").WeatherError }
    )?.weatherError;
    return (
      <div className="py-10">
        <ErrorState
          message={weatherError?.message ?? "Unknown error"}
          attempted={weatherError?.attempted}
          onRetry={() => void refresh()}
        />
      </div>
    );
  }

  if (!bundle) return null;

  if (bundle.hourly.length === 0) {
    return (
      <div className="space-y-4">
        <PageHeader
          title={`Forecast — ${bundle.location.name}`}
          bundle={bundle}
          now={now}
          isFetching={isFetching}
          onRefresh={() => void refresh()}
        />
        <EmptyState
          title="Extended forecast unavailable"
          message="The secondary provider (OpenWeatherMap) returned only current conditions. Hourly and 16-day forecasts become available again when Open-Meteo is reachable."
        >
          <Badge tone="warn">Secondary provider · current conditions only</Badge>
        </EmptyState>
      </div>
    );
  }

  const temperatureChartData = next48h.map((h) => ({
    label: formatClock(h.time, settings.timeFormat),
    temperature: h.temperature,
    apparentTemperature: h.apparentTemperature,
  }));

  const precipData = next48h
    .filter((_, i) => i % 2 === 0) // every 2 hours keeps labels legible
    .map((h) => ({
      label: formatClock(h.time, settings.timeFormat),
      probability: h.precipitationProbability,
      millimetres: h.precipitation,
    }));

  const dailyPrecip = bundle.daily.map((d) => ({
    label: dayMonthShort(d.date),
    precipitation: Math.round(d.precipitationSum * 10) / 10,
  }));

  const dailyWind = bundle.daily.map((d) => ({
    label: dayMonthShort(d.date),
    windSpeed: Math.round(d.windSpeedMax),
  }));

  return (
    <div className="space-y-4">
      <PageHeader
        title={`Forecast — ${bundle.location.name}`}
        bundle={bundle}
        now={now}
        isFetching={isFetching}
        onRefresh={() => void refresh()}
      />

      {/* 48-hour charts */}
      <Card as="section" className="p-4 sm:p-5" aria-labelledby="trend-heading">
        <h2 id="trend-heading" className="text-base font-extrabold text-[var(--text)] sm:text-lg">
          Next 48 hours
        </h2>
        <div className="mt-3 grid gap-5 xl:grid-cols-2">
          <div>
            <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-[var(--text-dim)]">
              Temperature & feels-like
            </p>
            <TemperatureChart data={temperatureChartData} />
          </div>
          <div>
            <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-[var(--text-dim)]">
              Rain probability & amount
            </p>
            <PrecipitationChart data={precipData} />
          </div>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-5">
        {/* 16-day list */}
        <Card as="section" className="p-4 sm:p-5 xl:col-span-3" aria-labelledby="extended-heading">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h2 id="extended-heading" className="flex items-center gap-2 text-base font-extrabold text-[var(--text)] sm:text-lg">
              <CalendarDays size={18} aria-hidden="true" /> 16-day forecast
            </h2>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-dim)]">
              Tap a day for hourly detail
            </span>
          </div>
          <DailyList
            daily={bundle.daily}
            unit={settings.unit}
            days={16}
            onSelectDay={(date) =>
              setSelectedDay((current) => (current === date ? null : date))
            }
            selectedDate={selectedEntries.date}
          />
        </Card>

        {/* Selected day details */}
        <Card as="section" className="p-4 sm:p-5 xl:col-span-2" aria-labelledby="day-heading">
          <h2 id="day-heading" className="text-base font-extrabold text-[var(--text)] sm:text-lg">
            {selectedEntries.date
              ? `${weekdayShort(selectedEntries.date)}, ${dayMonthShort(selectedEntries.date)} — hourly`
              : "Hourly detail"}
          </h2>
          <div className="mt-3 grid max-h-[520px] grid-cols-2 gap-2 overflow-y-auto scrollbar-thin sm:grid-cols-3">
            {selectedEntries.entries.map((entry) => (
              <div
                key={entry.time}
                className="flex flex-col items-center gap-1 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-2)] px-2 py-2.5"
              >
                <span className="text-[10px] font-bold text-[var(--text-dim)]">
                  {formatClock(entry.time, settings.timeFormat)}
                </span>
                <WeatherIcon
                  code={entry.weatherCode}
                  isDay={entry.isDay}
                  size={22}
                  className="text-[var(--accent)]"
                />
                <span className="text-sm font-extrabold text-[var(--text)]">
                  {formatTemperature(entry.temperature, settings.unit)}
                </span>
                <span className="flex items-center gap-0.5 text-[10px] font-semibold text-sky-400">
                  <Droplets size={9} aria-hidden="true" />
                  {entry.precipitationProbability}%
                </span>
                <span className="flex items-center gap-0.5 text-[10px] text-[var(--text-dim)]" title="Wind speed">
                  <Wind size={9} aria-hidden="true" />
                  {entry.windSpeed != null ? formatWind(entry.windSpeed, settings.windUnit) : "—"}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-3 flex items-start gap-1.5 text-[10px] leading-snug text-[var(--text-dim)]">
            <Info size={11} className="mt-0.5 shrink-0" aria-hidden="true" />
            Precipitation amount shown per 3-hour interval. Wind per hour uses the
            same 10 m wind speed as the current conditions.
          </p>
        </Card>
      </div>

      {/* Daily-scale charts */}
      <Card as="section" className="p-4 sm:p-5" aria-labelledby="daily-charts-heading">
        <h2 id="daily-charts-heading" className="text-base font-extrabold text-[var(--text)] sm:text-lg">
          Daily rainfall & wind
        </h2>
        <div className="mt-3 grid gap-5 lg:grid-cols-2">
          <div>
            <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-[var(--text-dim)]">
              Precipitation totals (mm)
            </p>
            <SimpleBars data={dailyPrecip} dataKey="precipitation" name="Rainfall" color="#38bdf8" unitLabel=" mm" />
          </div>
          <div>
            <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-[var(--text-dim)]">
              Max wind speed (km/h)
            </p>
            <SimpleBars data={dailyWind} dataKey="windSpeed" name="Max wind" color="#34d399" unitLabel=" km/h" />
          </div>
        </div>
      </Card>
    </div>
  );
}

function PageHeader({
  title,
  bundle,
  now,
  isFetching,
  onRefresh,
}: {
  title: string;
  bundle: import("@/types/weather").WeatherBundle;
  now: number;
  isFetching: boolean;
  onRefresh: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-black tracking-tight text-[var(--text)] sm:text-3xl">
        {title}
      </h1>
      <SourceBadge
        meta={bundle.provider}
        now={now}
        onRefresh={onRefresh}
        refreshing={isFetching}
      />
    </div>
  );
}
