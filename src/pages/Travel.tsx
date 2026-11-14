import { useEffect, useMemo, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Plane,
  MapPin,
  Search,
  Loader2,
  Umbrella,
  Sun,
  Shirt,
  CloudRain,
  ArrowRight,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useClimateStore } from "@/store/useClimateStore";
import { useCompareBundles, useCompareAirQuality, useGeocodeSearch } from "@/hooks/useQueries";
import { assessTrip, tripSpanDays, primaryConcern } from "@/utils/travel";
import { formatTemperature, dayMonthShort, weekdayShort } from "@/utils/units";
import { usAqiCategory, computeIndiaAqi, aqiBandColor } from "@/utils/aqi";
import type { WeatherLocation } from "@/types/weather";
import { Card, Button, Badge } from "@/components/ui/primitives";
import { WeatherIcon } from "@/components/weather/WeatherIcon";

const schema = z
  .object({
    destinationId: z.string().min(1, "Choose a destination city"),
    depart: z.string().min(1, "Pick a departure date"),
    ret: z.string().min(1, "Pick a return date"),
  })
  .refine((data) => data.ret >= data.depart, {
    message: "Return date must be after the departure date",
    path: ["ret"],
  })
  .refine((data) => tripSpanDays(data.depart, data.ret) <= 16, {
    message: "Trips longer than 16 days exceed the forecast horizon",
    path: ["ret"],
  })
  .refine(
    (data) => data.depart >= toIsoDate(new Date()),
    { message: "Departure date can't be in the past", path: ["depart"] }
  )
  .refine(
    (data) => data.depart <= toIsoDate(new Date(Date.now() + 15 * 86400000)),
    { message: "Forecasts only reach ~16 days ahead", path: ["depart"] }
  );

type FormValues = z.infer<typeof schema>;

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function Travel() {
  const origin = useClimateStore((s) => s.location);
  const settings = useClimateStore((s) => s.settings);
  const [destination, setDestination] = useState<WeatherLocation | null>(null);
  const [submitted, setSubmitted] = useState<FormValues | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      destinationId: "",
      depart: toIsoDate(new Date()),
      ret: toIsoDate(new Date(Date.now() + 2 * 86400000)),
    },
  });

  const depart = watch("depart");
  const minDate = toIsoDate(new Date());
  const maxDate = toIsoDate(new Date(Date.now() + 15 * 86400000));

  const compareSet = useMemo(
    () => (destination ? [origin, destination] : [origin]),
    [origin, destination]
  );
  const bundles = useCompareBundles(compareSet);
  const aq = useCompareAirQuality(destination ? [destination] : []);

  const originBundle = bundles[0]?.data?.bundle ?? null;
  const destinationBundle = bundles[1]?.data?.bundle ?? null;
  const destinationAqi = aq[0]?.data?.current ?? null;

  const assessment = useMemo(
    () =>
      destinationBundle && submitted
        ? assessTrip(destinationBundle.daily, submitted.depart, submitted.ret)
        : null,
    [destinationBundle, submitted]
  );

  function onSubmit(values: FormValues) {
    setSubmitted(values);
  }

  const planUnavailable = destinationBundle != null && assessment == null;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-[var(--text)] sm:text-3xl">
          <Plane size={26} aria-hidden="true" /> Travel planner
        </h1>
        <p className="mt-1 text-sm text-[var(--text-dim)]">
          Compare conditions at your origin and destination, and get a packing and
          activity game-plan. Forecasts cover up to 16 days.
        </p>
      </div>

      {/* Form */}
      <Card as="section" className="p-4 sm:p-5" aria-labelledby="planner-heading">
        <h2 id="planner-heading" className="text-base font-extrabold text-[var(--text)]">
          Plan your trip
        </h2>
        <form onSubmit={handleSubmit(onSubmit)} className="mt-3 grid gap-3 md:grid-cols-12">
          <div className="md:col-span-3">
            <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-dim)]" htmlFor="origin-static">
              From
            </label>
            <p id="origin-static" className="mt-1.5 flex items-center gap-2 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-2)] px-3.5 py-2.5 text-sm font-semibold text-[var(--text)]">
              <MapPin size={15} aria-hidden="true" className="text-[var(--accent)]" />
              {origin.name}
            </p>
          </div>

          <div className="md:col-span-3">
            <DestinationPicker
              label="To"
              onSelect={(loc) => {
                setDestination(loc);
                setValue("destinationId", loc.id, { shouldValidate: true });
              }}
              selected={destination}
              error={errors.destinationId?.message}
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-dim)]" htmlFor="depart">
              Depart
            </label>
            <input
              id="depart"
              type="date"
              min={minDate}
              max={maxDate}
              aria-invalid={errors.depart ? true : undefined}
              aria-describedby={errors.depart ? "depart-error" : undefined}
              className="mt-1.5 w-full rounded-xl border border-[var(--surface-border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm text-[var(--text)] outline-none focus:border-[var(--ring)]"
              {...register("depart")}
            />
            {errors.depart && (
              <p id="depart-error" role="alert" className="mt-1 text-xs font-semibold text-red-400">{errors.depart.message}</p>
            )}
          </div>

          <div className="md:col-span-2">
            <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-dim)]" htmlFor="ret">
              Return
            </label>
            <input
              id="ret"
              type="date"
              min={depart || minDate}
              max={maxDate}
              aria-invalid={errors.ret ? true : undefined}
              aria-describedby={errors.ret ? "ret-error" : undefined}
              className="mt-1.5 w-full rounded-xl border border-[var(--surface-border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm text-[var(--text)] outline-none focus:border-[var(--ring)]"
              {...register("ret")}
            />
            {errors.ret && (
              <p id="ret-error" role="alert" className="mt-1 text-xs font-semibold text-red-400">{errors.ret.message}</p>
            )}
          </div>

          <div className="flex items-end md:col-span-2">
            <Button type="submit" className="w-full">
              Plan trip <ArrowRight size={15} aria-hidden="true" />
            </Button>
          </div>
        </form>
      </Card>

      {/* Destination snapshot */}
      {destinationBundle && (
        <div className="grid gap-4 lg:grid-cols-5">
          <Card className="p-5 lg:col-span-2">
            <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-dim)]">
              Destination now â€” {destinationBundle.location.name}
            </p>
            <div className="mt-2 flex items-center gap-4">
              <WeatherIcon
                code={destinationBundle.current.weatherCode}
                isDay={destinationBundle.current.isDay}
                size={72}
                className="text-[var(--accent)]"
              />
              <div>
                <p className="text-6xl font-black leading-none tracking-tighter text-[var(--text)]">
                  {formatTemperature(destinationBundle.current.temperature, settings.unit)}
                </p>
                <p className="mt-1 text-xs font-semibold text-[var(--text-dim)]">
                  {destinationBundle.current.weatherText} Â· feels {formatTemperature(destinationBundle.current.apparentTemperature, settings.unit)}
                </p>
              </div>
            </div>
            {destinationAqi?.usAqi != null && (
              <p className="mt-3 flex items-center gap-2 text-xs font-semibold text-[var(--text)]">
                <span
                  aria-hidden="true"
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: aqiBandColor(usAqiCategory(Math.round(destinationAqi.usAqi)).band) }}
                />
                US AQI {Math.round(destinationAqi.usAqi)} Â· {usAqiCategory(Math.round(destinationAqi.usAqi)).label}
                {computeIndiaAqi(destinationAqi) && (
                  <span className="text-[var(--text-dim)]">
                    Â· IN {computeIndiaAqi(destinationAqi)!.aqi}
                  </span>
                )}
              </p>
            )}
            {originBundle && (
              <p className="mt-2 text-[11px] text-[var(--text-dim)]">
                vs {origin.name}: {formatTemperature(originBundle.current.temperature, settings.unit)} now Â·{" "}
                {formatTemperature(originBundle.current.temperature - destinationBundle.current.temperature, settings.unit)} difference
              </p>
            )}
          </Card>

          <Card className="p-5 lg:col-span-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-extrabold text-[var(--text)]">
                {submitted ? `${weekdayShort(submitted.depart)} ${dayMonthShort(submitted.depart)} â†’ ${weekdayShort(submitted.ret)} ${dayMonthShort(submitted.ret)}` : "Trip forecast"}
              </h2>
              {assessment && (
                <Badge tone={primaryConcern(assessment) ? "warn" : "good"}>
                  {primaryConcern(assessment) ?? "Mild conditions expected"}
                </Badge>
              )}
            </div>

            {planUnavailable ? (
              <p className="mt-4 text-sm text-[var(--text-dim)]">
                Your dates are outside the 16-day forecast horizon. Choose dates within the
                next two weeks.
              </p>
            ) : assessment ? (
              <>
                <p className="mt-2 text-sm font-semibold text-[var(--text)]">
                  {assessment.summary}
                </p>

                <div className="mt-3 grid grid-cols-3 gap-2 text-center sm:grid-cols-6">
                  {assessment.days.map((day) => (
                    <div
                      key={day.date}
                      className="flex flex-col items-center gap-0.5 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-2)] px-1 py-2"
                      title={day.weatherText}
                    >
                      <span className="text-[9px] font-bold uppercase text-[var(--text-dim)]">
                        {dayMonthShort(day.date)}
                      </span>
                      <WeatherIcon code={day.weatherCode} size={18} className="text-[var(--accent)]" />
                      <span className="text-[11px] font-extrabold text-[var(--text)]">
                        {formatTemperature(day.tempMax, settings.unit)}
                      </span>
                      <span className="flex items-center gap-0.5 text-[9px] font-semibold text-sky-400">
                        <CloudRain size={9} aria-hidden="true" />
                        {day.precipitationProbabilityMax}%
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-dim)]">
                    Packing & activities
                  </p>
                  <ul className="mt-1.5 space-y-1.5">
                    {assessment.tips.map((tip) => (
                      <li key={tip} className="flex items-start gap-2 text-xs text-[var(--text)]">
                        <span aria-hidden="true" className="mt-0.5">
                          {tip.startsWith("Carry an umbrella") || tip.startsWith("Occasional") ? (
                            <Umbrella size={12} className="text-sky-400" />
                          ) : tip.startsWith("High UV") || tip.startsWith("Very hot") ? (
                            <Sun size={12} className="text-amber-400" />
                          ) : (
                            <Shirt size={12} className="text-emerald-400" />
                          )}
                        </span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            ) : (
              <p className="mt-4 text-sm text-[var(--text-dim)]">
                Submit the form to see destination conditions for your dates.
              </p>
            )}
          </Card>
        </div>
      )}

      {/* Destination vs origin temperatures across the trip */}
      {assessment && (
        <Card as="section" className="p-4 sm:p-5" aria-labelledby="compare-heading">
          <h2 id="compare-heading" className="text-base font-extrabold text-[var(--text)]">
            Highs during your trip ({settings.unit === "c" ? "Â°C" : "Â°F"})
          </h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart
              data={assessment.days.map((d) => ({
                label: dayMonthShort(d.date),
                destination:
                  settings.unit === "c"
                    ? Math.round(d.tempMax)
                    : Math.round((d.tempMax * 9) / 5 + 32),
              }))}
              margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
            >
              <CartesianGrid stroke="rgba(148,163,184,0.25)" strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "currentColor" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "currentColor" }} tickLine={false} axisLine={false} width={40} />
              <Tooltip
                cursor={{ fill: "rgba(148,163,184,0.15)" }}
                contentStyle={{
                  background: "#0f172a",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: 12,
                  fontSize: 12,
                }}
              />
              <Bar
                dataKey="destination"
                name={destination?.name ?? "Destination"}
                fill="#fb923c"
                radius={[4, 4, 0, 0]}
                maxBarSize={44}
              />
            </BarChart>
          </ResponsiveContainer>
          <p className="mt-2 text-[11px] text-[var(--text-dim)]">
            Confidence drops beyond day ~10; days 11â€“16 are indicative. This is not official
            travel guidance â€” always check advisories before you go.
          </p>
        </Card>
      )}
    </div>
  );
}

interface DestinationPickerProps {
  label: string;
  onSelect: (location: WeatherLocation) => void;
  selected: WeatherLocation | null;
  error?: string;
}

function DestinationPicker({ label, onSelect, selected, error }: DestinationPickerProps) {
  const [term, setTerm] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

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
  }, [ref]);

  return (
    <div ref={(el) => { ref.current = el; }} className="relative">
      <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-dim)]" htmlFor="destination">
        {label}
      </label>
      <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-2)] px-3 focus-within:border-[var(--ring)]">
        <Search size={15} aria-hidden="true" className="text-[var(--text-dim)]" />
        <input
          id="destination"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          aria-invalid={error ? true : undefined}
          value={selected ? selected.name : term}
          onChange={(e) => {
            setTerm(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search destinationâ€¦"
          className="w-full bg-transparent py-2.5 text-sm text-[var(--text)] outline-none placeholder:text-[var(--text-dim)]"
          autoComplete="off"
          spellCheck={false}
        />
        {isFetching && <Loader2 size={14} className="animate-spin text-[var(--text-dim)]" aria-hidden="true" />}
      </div>
      {error && (
        <p role="alert" className="mt-1 text-xs font-semibold text-red-400">{error}</p>
      )}
      {open && (data?.length ?? 0) > 0 && (
        <ul role="listbox" aria-label="Destination suggestions" className="absolute z-30 mt-2 max-h-72 w-full overflow-auto rounded-xl border border-[var(--surface-border)] bg-[var(--surface)] p-1.5 shadow-card backdrop-blur">
          {data!.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => {
                  onSelect(item);
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

