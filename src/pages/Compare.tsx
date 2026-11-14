import { useEffect, useMemo, useRef, useState } from "react";
import { MapPin, Plus, Search, X, Loader2, Wind, Droplets, ThermometerSun, Gauge } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from "recharts";
import { toast } from "sonner";
import { useClimateStore } from "@/store/useClimateStore";
import { useCompareAirQuality, useCompareBundles, useGeocodeSearch } from "@/hooks/useQueries";
import { formatTemperature, formatWind } from "@/utils/units";
import { computeIndiaAqi, usAqiCategory, aqiBandColor } from "@/utils/aqi";
import type { WeatherLocation } from "@/types/weather";
import { Card, Skeleton, Badge } from "@/components/ui/primitives";
import { WeatherIcon } from "@/components/weather/WeatherIcon";

const SLOT_COLORS = ["#38bdf8", "#fb923c", "#a3e635", "#f472b6"];
const gridStroke = "rgba(148,163,184,0.25)";
const axisTick = { fontSize: 11, fill: "currentColor" };

export default function Compare() {
  const currentLocation = useClimateStore((s) => s.location);
  const settings = useClimateStore((s) => s.settings);
  const [extraLocations, setExtraLocations] = useState<WeatherLocation[]>([]);

  const locations = useMemo(
    () => [currentLocation, ...extraLocations].slice(0, 4),
    [currentLocation, extraLocations]
  );

  const bundleQueries = useCompareBundles(locations);
  const aqQueries = useCompareAirQuality(locations);

  function addLocation(location: WeatherLocation) {
    setExtraLocations((prev) => {
      if (prev.some((p) => p.id === location.id) || location.id === currentLocation.id) {
        toast.error(`${location.name} is already in the comparison`);
        return prev;
      }
      if (prev.length >= 3) {
        toast.error("Compare up to 4 cities");
        return prev;
      }
      return [...prev, location];
    });
  }

  function removeLocation(id: string) {
    setExtraLocations((prev) => prev.filter((l) => l.id !== id));
  }

  const rows = locations.map((location, index) => ({
    location,
    bundle: bundleQueries[index]?.data?.bundle ?? null,
    bundling: bundleQueries[index]?.isPending ?? false,
    aq: aqQueries[index]?.data?.current ?? null,
    aqLoading: aqQueries[index]?.isPending ?? false,
  }));

  const ready = rows.every((r) => r.bundle);
  const chartData = rows.map((row, index) => ({
    label: row.location.name,
    temperature: row.bundle ? Math.round(row.bundle.current.temperature) : 0,
    feelsLike: row.bundle ? Math.round(row.bundle.current.apparentTemperature) : 0,
    humidity: row.bundle ? Math.round(row.bundle.current.humidity) : 0,
    wind: row.bundle ? Math.round(row.bundle.current.windSpeed) : 0,
    rainProbability: row.bundle?.daily[0]?.precipitationProbabilityMax ?? 0,
    usAqi: row.aq?.usAqi != null ? Math.round(row.aq.usAqi) : 0,
    color: SLOT_COLORS[index % SLOT_COLORS.length],
  }));

  const coolest = ready
    ? rows.reduce((a, b) =>
        a.bundle!.current.temperature < b.bundle!.current.temperature ? a : b
      )
    : null;
  const wettest = ready
    ? rows.reduce((a, b) =>
        (a.bundle?.daily[0]?.precipitationProbabilityMax ?? 0) >
        (b.bundle?.daily[0]?.precipitationProbabilityMax ?? 0)
          ? a
          : b
      )
    : null;
  const cleanestAir = rows
    .filter((r) => r.aq?.usAqi != null)
    .reduce<typeof rows[number] | null>(
      (best, r) => (best == null || (r.aq!.usAqi ?? Infinity) < (best.aq!.usAqi ?? Infinity) ? r : best),
      null
    );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-[var(--text)] sm:text-3xl">
          Compare cities
        </h1>
        <p className="mt-1 text-sm text-[var(--text-dim)]">
          Side-by-side conditions for up to four cities. Starts with your current
          location ({currentLocation.name}).
        </p>
      </div>

      {/* Pickers */}
      <div className="flex flex-wrap items-center gap-2">
        {locations.map((location, index) => (
          <span
            key={`${location.id}-${index}`}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--surface-border)] bg-[var(--surface)] py-1.5 pl-3 pr-1.5 text-sm font-semibold text-[var(--text)]"
          >
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: SLOT_COLORS[index % SLOT_COLORS.length] }}
            />
            {location.name}
            {index > 0 && (
              <button
                type="button"
                onClick={() => removeLocation(location.id)}
                aria-label={`Remove ${location.name} from comparison`}
                className="rounded-full p-1 text-[var(--text-dim)] transition hover:bg-black/10 hover:text-[var(--text)] dark:hover:bg-white/10"
              >
                <X size={13} />
              </button>
            )}
          </span>
        ))}
        {locations.length < 4 && <CityPicker onPick={addLocation} />}
      </div>

      {/* Verdict strip — only meaningful with 2+ comparable cities */}
      {ready && rows.length >= 2 && (
        <div className="flex flex-wrap gap-2 text-xs">
          {coolest && (
            <Badge tone="info">Coolest: {coolest.location.name} ({formatTemperature(coolest.bundle!.current.temperature, settings.unit)})</Badge>
          )}
          {wettest && (
            <Badge tone="info">Highest rain chance: {wettest.location.name} ({wettest.bundle?.daily[0]?.precipitationProbabilityMax ?? 0}%)</Badge>
          )}
          {cleanestAir && (
            <Badge tone="good">Cleanest air: {cleanestAir.location.name} (US AQI {Math.round(cleanestAir.aq!.usAqi!)})</Badge>
          )}
        </div>
      )}

      {/* Cards */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {rows.map((row, index) => (
          <Card key={`${row.location.id}-${index}`} className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-extrabold text-[var(--text)]">
                  {row.location.name}
                </p>
                <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-[var(--text-dim)]">
                  {row.location.countryCode ?? row.location.country}
                </p>
              </div>
              {row.bundle && (
                <WeatherIcon
                  code={row.bundle.current.weatherCode}
                  isDay={row.bundle.current.isDay}
                  size={30}
                  className="shrink-0 text-[var(--accent)]"
                />
              )}
            </div>

            {row.bundling || !row.bundle ? (
              <div className="mt-3 space-y-2">
                <Skeleton className="h-10 w-24" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-40" />
              </div>
            ) : (
              <>
                <p className="mt-3 text-5xl font-black leading-none tracking-tighter text-[var(--text)]">
                  {formatTemperature(row.bundle.current.temperature, settings.unit)}
                </p>
                <p className="mt-1 text-xs font-semibold text-[var(--text-dim)]">
                  {row.bundle.current.weatherText} · feels {formatTemperature(row.bundle.current.apparentTemperature, settings.unit)}
                </p>
                <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
                  <div className="flex items-center gap-1 text-[var(--text-dim)]">
                    <Droplets size={11} aria-hidden="true" /> Humidity {Math.round(row.bundle.current.humidity)}%
                  </div>
                  <div className="flex items-center gap-1 text-[var(--text-dim)]">
                    <Wind size={11} aria-hidden="true" /> {formatWind(row.bundle.current.windSpeed, settings.windUnit)}
                  </div>
                  <div className="flex items-center gap-1 text-[var(--text-dim)]">
                    <ThermometerSun size={11} aria-hidden="true" /> H {formatTemperature(row.bundle.daily[0]?.tempMax ?? row.bundle.current.tempMax ?? 0, settings.unit)} / L {formatTemperature(row.bundle.daily[0]?.tempMin ?? row.bundle.current.tempMin ?? 0, settings.unit)}
                  </div>
                  <div className="flex items-center gap-1 text-[var(--text-dim)]">
                    <Gauge size={11} aria-hidden="true" /> {Math.round(row.bundle.current.pressureMsl)} hPa
                  </div>
                </dl>
                <div className="mt-3 border-t border-[var(--surface-border)] pt-2">
                  {row.aqLoading ? (
                    <Skeleton className="h-5 w-36" />
                  ) : row.aq?.usAqi != null ? (
                    <p className="flex items-center gap-2 text-[11px] font-semibold text-[var(--text)]">
                      <span
                        aria-hidden="true"
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ background: aqiBandColor(usAqiCategory(Math.round(row.aq.usAqi)).band) }}
                      />
                      US AQI {Math.round(row.aq.usAqi)} · {usAqiCategory(Math.round(row.aq.usAqi)).label}
                      {(() => {
                        const india = computeIndiaAqi(row.aq!);
                        return india ? (
                          <span className="text-[var(--text-dim)]">· IN {india.aqi}</span>
                        ) : null;
                      })()}
                    </p>
                  ) : (
                    <p className="text-[11px] text-[var(--text-dim)]">AQI unavailable</p>
                  )}
                </div>
              </>
            )}
          </Card>
        ))}
      </div>

      {/* Charts */}
      {rows.length >= 2 && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="p-4 sm:p-5">
            <h2 className="text-base font-extrabold text-[var(--text)]">Temperature vs feels-like (°)</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 12, right: 8, left: -18, bottom: 0 }} barGap={4}>
                <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={false} />
                <YAxis tick={axisTick} tickLine={false} axisLine={false} width={40} />
                <Tooltip
                  contentStyle={{
                    background: "#0f172a",
                    border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="temperature" name="Temperature" radius={[4, 4, 0, 0]} maxBarSize={30}>
                  {chartData.map((d, i) => (
                    <Cell key={i} fill={d.color} />
                  ))}
                </Bar>
                <Bar dataKey="feelsLike" name="Feels like" fill="#94a3b8" radius={[4, 4, 0, 0]} maxBarSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-4 sm:p-5">
            <h2 className="text-base font-extrabold text-[var(--text)]">Humidity (%)</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 12, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={false} />
                <YAxis tick={axisTick} tickLine={false} axisLine={false} width={40} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{
                    background: "#0f172a",
                    border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="humidity" name="Humidity" radius={[4, 4, 0, 0]} maxBarSize={30}>
                  {chartData.map((d, i) => (
                    <Cell key={i} fill={d.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-4 sm:p-5">
            <h2 className="text-base font-extrabold text-[var(--text)]">Wind speed (km/h)</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 12, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={false} />
                <YAxis tick={axisTick} tickLine={false} axisLine={false} width={40} />
                <Tooltip
                  contentStyle={{
                    background: "#0f172a",
                    border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="wind" name="Wind" radius={[4, 4, 0, 0]} maxBarSize={30}>
                  {chartData.map((d, i) => (
                    <Cell key={i} fill={d.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-4 sm:p-5">
            <h2 className="text-base font-extrabold text-[var(--text)]">US AQI (modelled)</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 12, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={false} />
                <YAxis tick={axisTick} tickLine={false} axisLine={false} width={40} />
                <Tooltip
                  contentStyle={{
                    background: "#0f172a",
                    border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="usAqi" name="US AQI" radius={[4, 4, 0, 0]} maxBarSize={30}>
                  {chartData.map((d, i) => (
                    <Cell key={i} fill={d.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}
    </div>
  );
}

function CityPicker({ onPick }: { onPick: (location: WeatherLocation) => void }) {
  const [term, setTerm] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(term), 300);
    return () => window.clearTimeout(t);
  }, [term]);

  const { data, isFetching } = useGeocodeSearch(debounced);

  useEffect(() => {
    function onDocClick(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center gap-2 rounded-full border border-dashed border-[var(--surface-border)] px-3 py-1.5 text-sm">
        <Search size={13} aria-hidden="true" className="text-[var(--text-dim)]" />
        <input
          value={term}
          onChange={(e) => {
            setTerm(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Add a city…"
          aria-label="Add a city to compare"
          className="w-32 bg-transparent py-1 text-sm text-[var(--text)] outline-none placeholder:text-[var(--text-dim)] sm:w-40"
        />
        {isFetching ? (
          <Loader2 size={13} className="animate-spin text-[var(--text-dim)]" aria-hidden="true" />
        ) : (
          <Plus size={13} className="text-[var(--text-dim)]" aria-hidden="true" />
        )}
      </div>
      {open && (data?.length ?? 0) > 0 && (
        <ul role="listbox" aria-label="Add city" className="absolute z-30 mt-2 max-h-72 w-64 overflow-auto rounded-xl border border-[var(--surface-border)] bg-[var(--surface)] p-1.5 shadow-card backdrop-blur">
          {data!.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => {
                  onPick(item);
                  setTerm("");
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-black/5 dark:hover:bg-white/10"
              >
                <MapPin size={13} aria-hidden="true" className="shrink-0 text-[var(--text-dim)]" />
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-[var(--text)]">{item.name}</span>
                  <span className="block truncate text-[10px] text-[var(--text-dim)]">
                    {[item.admin1, item.country].filter(Boolean).join(", ")}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
