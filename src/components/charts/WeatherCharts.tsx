/** Recharts-based interactive charts used across Forecast / AQ pages. */

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface TooltipPayloadItem {
  name?: string;
  value?: number | string;
  unit?: string;
  color?: string;
}

function ChartTooltip({
  active,
  payload,
  label,
  unitLabel,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
  unitLabel?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/15 bg-slate-950/95 px-3 py-2 text-xs shadow-card backdrop-blur">
      <p className="mb-1 font-bold text-white">{label}</p>
      {payload.map((item, i) => (
        <p key={i} className="flex items-center gap-2 text-slate-200">
          <span
            className="inline-block h-2.5 w-2.5 rounded-sm"
            style={{ background: item.color ?? "#38bdf8" }}
          />
          <span className="text-slate-400">{item.name}:</span>
          <span className="font-semibold">
            {typeof item.value === "number"
              ? Math.round(item.value * 10) / 10
              : item.value}
            {unitLabel ?? item.unit ?? ""}
          </span>
        </p>
      ))}
    </div>
  );
}

const gridStroke = "rgba(148,163,184,0.25)";
const axisTick = { fontSize: 11, fill: "currentColor" };

export function TemperatureChart({
  data,
}: {
  data: Array<{ label: string; temperature: number; apparentTemperature?: number }>;
}) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -6, bottom: 0 }}>
        <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" />
        <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={false} />
        <YAxis tick={axisTick} tickLine={false} axisLine={false} width={44} />
        <Tooltip content={<ChartTooltip unitLabel="°" />} />
        <Legend verticalAlign="top" height={28} wrapperStyle={{ fontSize: 12 }} />
        <Area
          type="monotone"
          dataKey="temperature"
          name="Temperature"
          stroke="#38bdf8"
          strokeWidth={2.5}
          fill="#38bdf8"
          fillOpacity={0.25}
          dot={false}
        />
        <Area
          type="monotone"
          dataKey="apparentTemperature"
          name="Feels like"
          stroke="#fbbf24"
          strokeWidth={2}
          strokeDasharray="6 4"
          fill="#fbbf24"
          fillOpacity={0.08}
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function PrecipitationChart({
  data,
}: {
  data: Array<{ label: string; probability: number; millimetres: number }>;
}) {
  return (
    <ResponsiveContainer width="100%" height={190}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: -6, bottom: 0 }}>
        <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" />
        <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={false} />
        <YAxis
          yAxisId="prob"
          tick={axisTick}
          tickLine={false}
          axisLine={false}
          domain={[0, 100]}
          unit="%"
          width={40}
        />
        <YAxis
          yAxisId="mm"
          orientation="right"
          tick={axisTick}
          tickLine={false}
          axisLine={false}
          width={40}
        />
        <Tooltip content={<ChartTooltip />} />
        <Legend verticalAlign="top" height={28} wrapperStyle={{ fontSize: 12 }} />
        <Bar
          yAxisId="prob"
          dataKey="probability"
          name="Precipitation probability"
          fill="#38bdf8"
          radius={[4, 4, 0, 0]}
          maxBarSize={28}
        />
        <Line
          yAxisId="mm"
          type="monotone"
          dataKey="millimetres"
          name="Rainfall (mm)"
          stroke="#a78bfa"
          strokeWidth={2}
          dot={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function WindChart({
  data,
}: {
  data: Array<{ label: string; windSpeed: number; gusts?: number }>;
}) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -6, bottom: 0 }}>
        <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" />
        <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={false} />
        <YAxis tick={axisTick} tickLine={false} axisLine={false} width={44} unit=" km/h" />
        <Tooltip content={<ChartTooltip unitLabel=" km/h" />} />
        <Legend verticalAlign="top" height={28} wrapperStyle={{ fontSize: 12 }} />
        <Area
          type="monotone"
          dataKey="windSpeed"
          name="Wind speed"
          stroke="#34d399"
          strokeWidth={2.5}
          fill="#34d399"
          fillOpacity={0.22}
          dot={false}
        />
        <Area
          type="monotone"
          dataKey="gusts"
          name="Gusts"
          stroke="#f472b6"
          strokeWidth={1.6}
          strokeDasharray="5 4"
          fill="transparent"
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function SimpleBars({
  data,
  dataKey,
  name,
  color = "#38bdf8",
  height = 200,
  unitLabel,
}: {
  data: Array<Record<string, string | number>>;
  dataKey: string;
  name: string;
  color?: string;
  height?: number;
  unitLabel?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -6, bottom: 0 }}>
        <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" />
        <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={false} />
        <YAxis tick={axisTick} tickLine={false} axisLine={false} width={44} />
        <Tooltip content={<ChartTooltip unitLabel={unitLabel} />} />
        <Bar dataKey={dataKey} name={name} fill={color} radius={[4, 4, 0, 0]} maxBarSize={36} />
      </BarChart>
    </ResponsiveContainer>
  );
}
