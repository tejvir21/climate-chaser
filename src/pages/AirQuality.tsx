import {
  Wind,
  Info,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useClimateStore } from "@/store/useClimateStore";
import { useAirQuality } from "@/hooks/useQueries";
import { useNow } from "@/hooks/useNow";
import { formatClock, formatAge } from "@/utils/units";
import {
  computeIndiaAqi,
  usAqiCategory,
  aqiBandColor,
} from "@/utils/aqi";
import { Card, Skeleton } from "@/components/ui/primitives";
import { ErrorState } from "@/components/weather/ErrorState";

const gridStroke = "rgba(148,163,184,0.25)";
const axisTick = { fontSize: 11, fill: "currentColor" };

function guidanceForBand(band: number): string {
  switch (band) {
    case 1:
      return "Air quality is considered satisfactory. Outdoor activities are generally fine for everyone.";
    case 2:
      return "Acceptable air quality. Unusually sensitive people should consider reducing prolonged outdoor exertion.";
    case 3:
      return "Sensitive groups (children, elderly, respiratory or heart conditions) should limit prolonged outdoor exertion.";
    case 4:
      return "Everyone may experience effects; sensitive groups should avoid prolonged outdoor exertion. Consider a well-fitting mask (N95) outdoors.";
    case 5:
      return "Health alert: increased risk for everyone. Avoid outdoor exertion; keep windows closed; use an air purifier if available.";
    default:
      return "Health warning of emergency conditions. Stay indoors, seal gaps, run a HEPA purifier, and seek medical advice if you feel unwell.";
  }
}

export default function AirQuality() {
  const location = useClimateStore((s) => s.location);
  const settings = useClimateStore((s) => s.settings);
  const { data, isPending, isError, error, refetch, isFetching } =
    useAirQuality(location);
  const now = useNow(60_000);

  if (isPending) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Loading air quality">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-44 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="py-10">
        <ErrorState
          message={
            error instanceof Error
              ? error.message
              : "Air quality data is unavailable right now."
          }
          onRetry={() => void refetch()}
          retrying={isFetching}
          title="Air quality data is unavailable"
        />
      </div>
    );
  }

  const current = data.current;
  const india = computeIndiaAqi(current);
  const us = current.usAqi != null ? usAqiCategory(Math.round(current.usAqi)) : null;

  const pollutants: Array<{
    label: string;
    value?: number;
    unit: string;
    subIndex?: number;
  }> = [
    { label: "PM2.5", value: current.pm25, unit: "Âµg/mÂ³", subIndex: india?.subIndices?.pm25 },
    { label: "PM10", value: current.pm10, unit: "Âµg/mÂ³", subIndex: india?.subIndices?.pm10 },
    { label: "NOâ‚‚", value: current.nitrogenDioxide, unit: "Âµg/mÂ³", subIndex: india?.subIndices?.no2 },
    { label: "SOâ‚‚", value: current.sulphurDioxide, unit: "Âµg/mÂ³", subIndex: india?.subIndices?.so2 },
    { label: "CO", value: current.carbonMonoxide, unit: "Âµg/mÂ³", subIndex: india?.subIndices?.co },
    { label: "Ozone (Oâ‚ƒ)", value: current.ozone, unit: "Âµg/mÂ³", subIndex: india?.subIndices?.o3 },
  ];

  const trend = data.hourly
    .filter((h) => h.usAqi != null)
    .slice(0, 48)
    .map((h) => ({
      label: formatClock(h.time, settings.timeFormat),
      usAqi: h.usAqi as number,
    }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[var(--text)] sm:text-3xl">
            Air quality â€” {location.name}
          </h1>
          <p className="mt-1 flex items-center gap-2 text-xs text-[var(--text-dim)]">
            <Wind size={12} aria-hidden="true" /> Modelled data (Open-Meteo / CAMS), updated {formatAge(data.provider.fetchedAt, now)}
          </p>
        </div>
        <Link
          to="/settings"
          className="text-xs font-bold text-[var(--accent)] hover:underline"
        >
          Data sources â†’
        </Link>
      </div>

      {/* Headline AQI cards */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="relative overflow-hidden p-5 lg:col-span-2">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full blur-3xl"
            style={{
              background: us
                ? `radial-gradient(circle, ${aqiBandColor(us.band)}55, transparent 70%)`
                : "transparent",
            }}
          />
          <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-dim)]">
            US AQI (EPA)
          </p>
          <div className="mt-2 flex items-end gap-4">
            <p className="text-7xl font-black leading-none tracking-tighter text-[var(--text)]">
              {current.usAqi != null ? Math.round(current.usAqi) : "â€”"}
            </p>
            {us && (
              <div className="pb-1.5">
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-extrabold"
                  style={{ background: `${aqiBandColor(us.band)}26`, color: aqiBandColor(us.band) }}
                >
                  <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ background: aqiBandColor(us.band) }} />
                  {us.label}
                </span>
              </div>
            )}
          </div>
          <p className="mt-3 text-xs leading-relaxed text-[var(--text-dim)]">
            Guidance: {us ? guidanceForBand(us.band) : "No reading available."}{" "}
            <span className="font-semibold">General public-health guidance â€” not medical advice.</span>
          </p>
        </Card>

        <div className="grid gap-4">
          <Card className="p-5">
            <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-dim)]">
              Indian National AQI (CPCB)
            </p>
            {india ? (
              <>
                <div className="mt-1.5 flex items-end gap-3">
                  <p className="text-5xl font-black leading-none tracking-tighter text-[var(--text)]">
                    {india.aqi}
                  </p>
                  <span
                    className="mb-1 inline-flex items-center rounded-full px-2.5 py-1 text-xs font-extrabold"
                    style={{ background: `${aqiBandColor(india.band)}26`, color: aqiBandColor(india.band) }}
                  >
                    {india.category}
                  </span>
                </div>
                <p className="mt-1.5 text-[11px] text-[var(--text-dim)]">
                  Dominant pollutant: <strong>{india.dominantPollutant}</strong>
                </p>
              </>
            ) : (
              <p className="mt-2 text-sm text-[var(--text-dim)]">Insufficient pollutant data to compute.</p>
            )}
            <p className="mt-2 flex items-start gap-1 text-[10px] leading-snug text-[var(--text-dim)]">
              <Info size={11} className="mt-0.5 shrink-0" aria-hidden="true" />
              Computed from modelled concentrations using CPCB breakpoints â€” not a station measurement.
            </p>
          </Card>

          <Card className="p-5">
            <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-dim)]">
              European AQI
            </p>
            <p className="mt-1.5 text-3xl font-black text-[var(--text)]">
              {current.europeanAqi != null ? Math.round(current.europeanAqi) : "â€”"}
            </p>
            <p className="text-[11px] text-[var(--text-dim)]">
              Raw model value (no Indian/EPA band mapping applied).
            </p>
          </Card>
        </div>
      </div>

      {/* Pollutant grid */}
      <Card as="section" className="p-4 sm:p-5" aria-labelledby="pollutants-heading">
        <h2 id="pollutants-heading" className="text-base font-extrabold text-[var(--text)] sm:text-lg">
          Pollutants
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {pollutants.map((p) => (
            <div
              key={p.label}
              className="flex flex-col gap-1 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-2)] p-3"
            >
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-dim)]">
                {p.label}
              </span>
              <span className="text-2xl font-extrabold tracking-tight text-[var(--text)]">
                {p.value != null ? (p.value >= 100 ? Math.round(p.value) : p.value.toFixed(1)) : "â€”"}
                <span className="ml-1 text-[10px] font-semibold text-[var(--text-dim)]">{p.unit}</span>
              </span>
              {p.subIndex != null && (
                <div title={`Indian sub-index: ${p.subIndex}`}>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/15 dark:bg-white/10">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(100, (p.subIndex / 500) * 100)}%`,
                        background: aqiBandColor(
                          p.subIndex <= 50 ? 1 : p.subIndex <= 100 ? 2 : p.subIndex <= 200 ? 3 : p.subIndex <= 300 ? 4 : p.subIndex <= 400 ? 5 : 6
                        ),
                      }}
                    />
                  </div>
                  <span className="mt-0.5 text-[9px] font-semibold text-[var(--text-dim)]">
                    IN sub-index {p.subIndex}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* 48h trend */}
      <Card as="section" className="p-4 sm:p-5" aria-labelledby="trend-heading">
        <h2 id="trend-heading" className="text-base font-extrabold text-[var(--text)] sm:text-lg">
          48-hour AQI trend (US EPA, modelled)
        </h2>
        {trend.length > 0 ? (
          <div className="mt-2 h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
                <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={axisTick} tickLine={false} axisLine={false} width={40} />
                <Tooltip
                  contentStyle={{
                    background: "#0f172a",
                    border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="usAqi"
                  name="US AQI"
                  stroke="#38bdf8"
                  strokeWidth={2.5}
                  fill="#38bdf8"
                  fillOpacity={0.25}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="py-6 text-center text-sm text-[var(--text-dim)]">
            Hourly AQI trend is not available from the provider right now.
          </p>
        )}
      </Card>

      <div className="flex flex-wrap items-start gap-2 rounded-xl border border-sky-400/30 bg-sky-400/10 px-4 py-3 text-[11px] leading-relaxed text-sky-100/90">
        <ShieldCheck size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
        <p>
          These figures come from the Open-Meteo air-quality model (Copernicus Atmosphere
          Monitoring Service), not from a single physical station. Indian-standard numbers are
          computed from the same modelled concentrations using CPCB breakpoints and may differ
          from nearby station readings, especially during crop-burning/inversion episodes in
          Delhi NCR. Official IMD/CPCB station alerts are not integrated yet â€” see{" "}
          <span className="font-semibold">docs/API_ARCHITECTURE.md</span>.
        </p>
      </div>

      {us && us.band >= 4 && (
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-xs font-semibold text-red-300">
          <TriangleAlert size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          Unhealthy air right now â€” reduce outdoor exertion and keep indoor air clean. This is
          general guidance, not a diagnosis; consult a doctor if symptoms occur.
        </div>
      )}
    </div>
  );
}


