import { useMemo, type ReactNode } from "react";
import {
  Line,
  LineChart,
  CartesianGrid,
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import { CalendarDays, CloudRain, Flame, Info, Snowflake } from "lucide-react";
import { useClimateStore } from "@/store/useClimateStore";
import { useArchive } from "@/hooks/useQueries";
import { Card, Skeleton } from "@/components/ui/primitives";
import { ErrorState } from "@/components/weather/ErrorState";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const gridStroke = "rgba(148,163,184,0.25)";
const axisTick = { fontSize: 11, fill: "currentColor" };

export default function Climate() {
  const location = useClimateStore((s) => s.location);
  const { data: rows, isPending, isError, error, refetch, isFetching } =
    useArchive(location, 10, true);

  const monthly = useMemo(() => {
    const buckets = Array.from({ length: 12 }, () => ({
      tempMaxSum: 0,
      tempMinSum: 0,
      precipSum: 0,
      days: 0,
      years: new Set<string>(),
    }));
    for (const row of rows ?? []) {
      const [year, month] = row.date.split("-");
      const m = Number(month) - 1;
      if (m < 0 || m > 11) continue;
      const b = buckets[m];
      b.tempMaxSum += row.tempMax;
      b.tempMinSum += row.tempMin;
      b.precipSum += row.precipitation;
      b.days += 1;
      b.years.add(year);
    }
    return buckets.map((b, i) => ({
      month: MONTHS[i],
      avgMax: b.days ? Math.round((b.tempMaxSum / b.days) * 10) / 10 : 0,
      avgMin: b.days ? Math.round((b.tempMinSum / b.days) * 10) / 10 : 0,
      // Mean precipitation per year that has data for this month.
      avgPrecip: b.years.size ? Math.round((b.precipSum / b.years.size) * 10) / 10 : 0,
      yearsCovered: b.years.size,
    }));
  }, [rows]);

  const annual = useMemo(() => {
    const byYear = new Map<string, { precip: number; tempMaxSum: number; days: number }>();
    for (const row of rows ?? []) {
      const year = row.date.slice(0, 4);
      const entry = byYear.get(year) ?? { precip: 0, tempMaxSum: 0, days: 0 };
      entry.precip += row.precipitation;
      entry.tempMaxSum += row.tempMax;
      entry.days += 1;
      byYear.set(year, entry);
    }
    return [...byYear.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([year, v]) => ({
        year,
        rainfall: Math.round(v.precip),
        avgMax: Math.round((v.tempMaxSum / v.days) * 10) / 10,
        complete: v.days > 330,
      }))
      .filter((y) => y.complete);
  }, [rows]);

  const stats = useMemo(() => {
    if (monthly.every((m) => m.yearsCovered === 0)) return null;
    const wettest = [...monthly].sort((a, b) => b.avgPrecip - a.avgPrecip)[0];
    const hottest = [...monthly].sort((a, b) => b.avgMax - a.avgMax)[0];
    const coolest = [...monthly].sort((a, b) => a.avgMin - b.avgMin)[0];
    const wettestYear = [...annual].sort((a, b) => b.rainfall - a.rainfall)[0];
    return { wettest, hottest, coolest, wettestYear };
  }, [monthly, annual]);

  const currentMonth = new Date().getMonth();
  const currentMonthStats = monthly[currentMonth];

  if (isPending) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Loading climate data">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-72 w-full" />
        <Skeleton className="h-56 w-full" />
        <p className="text-center text-xs text-[var(--text-dim)]">
          Downloading 10 years of ERA5 reanalysis data…
        </p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="py-10">
        <ErrorState
          message={error instanceof Error ? error.message : "Historical data could not be loaded."}
          onRetry={() => void refetch()}
          retrying={isFetching}
          title="Historical data is unavailable"
        />
      </div>
    );
  }

  if (!rows?.length) {
    return (
      <div className="py-10 text-center text-sm text-[var(--text-dim)]">
        No historical data returned for this location.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-[var(--text)] sm:text-3xl">
          Climate — {location.name}
        </h1>
        <p className="mt-1 flex items-start gap-1.5 text-xs text-[var(--text-dim)]">
          <Info size={12} className="mt-0.5 shrink-0" aria-hidden="true" />
          ERA5-Land reanalysis (Open-Meteo archive), 2016–present. This is modelled
          climate, <strong>not</strong> station observations, and can differ from local
          readings. Averages are computed for months with complete years of data.
        </p>
      </div>

      {/* Headline stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats && (
          <>
            <StatCard
              icon={<Flame size={14} aria-hidden="true" />}
              label="Hottest month (avg high)"
              value={`${stats.hottest.month} · ${stats.hottest.avgMax}°`}
            />
            <StatCard
              icon={<Snowflake size={14} aria-hidden="true" />}
              label="Coolest month (avg low)"
              value={`${stats.coolest.month} · ${stats.coolest.avgMin}°`}
            />
            <StatCard
              icon={<CloudRain size={14} aria-hidden="true" />}
              label="Wettest month (avg)"
              value={`${stats.wettest.month} · ${stats.wettest.avgPrecip} mm`}
            />
            <StatCard
              icon={<CalendarDays size={14} aria-hidden="true" />}
              label="Wettest complete year"
              value={stats.wettestYear ? `${stats.wettestYear.year} · ${stats.wettestYear.rainfall} mm` : "—"}
            />
          </>
        )}
      </div>

      {/* This month vs normal */}
      {currentMonthStats && currentMonthStats.yearsCovered > 0 && (
        <Card className="p-4 sm:p-5">
          <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-dim)]">
            {MONTHS[currentMonth]} right now vs 10-year normal
          </p>
          <p className="mt-1 text-sm text-[var(--text)]">
            Normal {MONTHS[currentMonth]}: avg high{" "}
            <strong>{currentMonthStats.avgMax}°</strong>, avg low{" "}
            <strong>{currentMonthStats.avgMin}°</strong>, rain{" "}
            <strong>{currentMonthStats.avgPrecip} mm</strong> · based on{" "}
            {currentMonthStats.yearsCovered} years
          </p>
        </Card>
      )}

      {/* Monthly temperature profile */}
      <Card as="section" className="p-4 sm:p-5" aria-labelledby="monthly-heading">
        <h2 id="monthly-heading" className="text-base font-extrabold text-[var(--text)] sm:text-lg">
          Monthly temperature profile
        </h2>
        <div className="mt-2 h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthly} margin={{ top: 12, right: 8, left: -10, bottom: 0 }}>
              <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={axisTick} tickLine={false} axisLine={false} />
              <YAxis tick={axisTick} tickLine={false} axisLine={false} width={44} unit="°" />
              <Tooltip
                contentStyle={{
                  background: "#0f172a",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: 12,
                  fontSize: 12,
                }}
              />
              <Legend verticalAlign="top" height={30} wrapperStyle={{ fontSize: 12 }} />
              <Line
                type="monotone"
                dataKey="avgMax"
                name="Avg high"
                stroke="#fb923c"
                strokeWidth={2.5}
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="avgMin"
                name="Avg low"
                stroke="#38bdf8"
                strokeWidth={2.5}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Monthly rainfall + annual rainfall */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card as="section" className="p-4 sm:p-5" aria-labelledby="monthly-rain-heading">
          <h2 id="monthly-rain-heading" className="text-base font-extrabold text-[var(--text)] sm:text-lg">
            Monthly rainfall (avg mm)
          </h2>
          <div className="mt-2 h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={axisTick} tickLine={false} axisLine={false} />
                <YAxis tick={axisTick} tickLine={false} axisLine={false} width={44} unit=" mm" />
                <Tooltip
                  contentStyle={{
                    background: "#0f172a",
                    border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="avgPrecip" name="Avg rainfall" fill="#38bdf8" radius={[4, 4, 0, 0]} maxBarSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card as="section" className="p-4 sm:p-5" aria-labelledby="annual-rain-heading">
          <h2 id="annual-rain-heading" className="text-base font-extrabold text-[var(--text)] sm:text-lg">
            Annual rainfall (mm)
          </h2>
          <div className="mt-2 h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={annual} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" />
                <XAxis dataKey="year" tick={axisTick} tickLine={false} axisLine={false} />
                <YAxis tick={axisTick} tickLine={false} axisLine={false} width={44} unit=" mm" />
                <Tooltip
                  contentStyle={{
                    background: "#0f172a",
                    border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="rainfall" name="Rainfall" fill="#818cf8" radius={[4, 4, 0, 0]} maxBarSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Card className="flex flex-col gap-1 !p-4">
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[var(--text-dim)]">
        <span className="text-[var(--accent)]" aria-hidden="true">{icon}</span>
        {label}
      </div>
      <p className="text-lg font-extrabold tracking-tight text-[var(--text)]">{value}</p>
    </Card>
  );
}
