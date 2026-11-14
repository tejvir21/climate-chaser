import { useMemo, useState } from "react";
import {
  Footprints,
  Bike,
  Dumbbell,
  PersonStanding,
  Plane,
  Trees,
  Sparkles,
  Bot,
  SendHorizontal,
  Wind,
} from "lucide-react";
import { useClimateStore } from "@/store/useClimateStore";
import { useAirQuality, useWeatherBundle } from "@/hooks/useQueries";
import { advise, ACTIVITY_LABEL, type Activity } from "@/utils/advisor";
import { answerQuestion, EXAMPLE_QUESTIONS } from "@/utils/assistant";
import { Card, Button } from "@/components/ui/primitives";
import { ErrorState } from "@/components/weather/ErrorState";
import { Skeleton } from "@/components/ui/primitives";

const ACTIVITY_ICONS: Record<Activity, typeof Footprints> = {
  walking: Footprints,
  running: PersonStanding,
  cycling: Bike,
  sports: Dumbbell,
  travel: Plane,
  outdoor: Trees,
};

const LABEL_STYLE: Record<string, string> = {
  Great: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  OK: "bg-lime-500/15 text-lime-700 dark:text-lime-300",
  Caution: "bg-amber-500/20 text-amber-800 dark:text-amber-300",
  Poor: "bg-red-500/15 text-red-700 dark:text-red-300",
};

interface QaEntry {
  question: string;
  answer: string;
}

export default function Insights() {
  const location = useClimateStore((s) => s.location);
  const settings = useClimateStore((s) => s.settings);
  const { data, isPending, isError, error, refresh } = useWeatherBundle(location);
  const airQuality = useAirQuality(location);
  const [activity, setActivity] = useState<Activity>("walking");
  const [question, setQuestion] = useState("");
  const [qa, setQa] = useState<QaEntry[]>([]);

  const bundle = data?.bundle ?? null;
  const today = bundle?.daily[0];
  const aq = airQuality.data?.current;

  const advice = useMemo(() => {
    if (!bundle) return null;
    return advise(activity, {
      tempC: bundle.current.temperature,
      feelsLikeC: bundle.current.apparentTemperature,
      rainProbability: today?.precipitationProbabilityMax ?? 0,
      precipMm: today?.precipitationSum ?? 0,
      windKmh: bundle.current.windSpeed,
      uvIndex: bundle.current.uvIndex,
      humidity: bundle.current.humidity,
      usAqi: aq?.usAqi,
    });
  }, [bundle, today, activity, aq?.usAqi]);

  if (isPending && !bundle) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Loading insights">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-72 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (isError && !bundle) {
    return (
      <div className="py-10">
        <ErrorState
          message={error instanceof Error ? error.message : "Insights need current weather data."}
          onRetry={() => void refresh()}
        />
      </div>
    );
  }

  function ask(raw?: string) {
    const q = (raw ?? question).trim();
    if (!q) return;
    const answer = answerQuestion(q, {
      bundle,
      airQuality: airQuality.data ?? null,
      unit: settings.unit,
    });
    setQa((prev) => [...prev, { question: q, answer }].slice(-4));
    setQuestion("");
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-[var(--text)] sm:text-3xl">
          <Sparkles size={24} aria-hidden="true" /> Insights â€” {location.name}
        </h1>
        <p className="mt-1 text-sm text-[var(--text-dim)]">
          Rule-based, explainable suggestions computed from the live forecast for this
          location â€” no guessing, no invented numbers.
        </p>
      </div>

      {/* Activity advisor */}
      <Card as="section" className="p-4 sm:p-5" aria-labelledby="advisor-heading">
        <h2 id="advisor-heading" className="text-base font-extrabold text-[var(--text)] sm:text-lg">
          Should I head out?
        </h2>
        <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="Choose an activity">
          {(Object.keys(ACTIVITY_LABEL) as Activity[]).map((id) => {
            const Icon = ACTIVITY_ICONS[id];
            const active = id === activity;
            return (
              <button
                key={id}
                type="button"
                aria-pressed={active}
                onClick={() => setActivity(id)}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition ${
                  active
                    ? "border-[var(--accent)] bg-[var(--accent)] text-slate-900"
                    : "border-[var(--surface-border)] bg-[var(--surface-2)] text-[var(--text)] hover:bg-black/5 dark:hover:bg-white/10"
                }`}
              >
                <Icon size={14} aria-hidden="true" />
                {ACTIVITY_LABEL[id]}
              </button>
            );
          })}
        </div>

        {advice && (
          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="flex shrink-0 flex-col items-center rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-2)] px-6 py-4">
              <span className="text-5xl font-black tracking-tighter text-[var(--text)]">
                {advice.score}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-dim)]">
                / 100
              </span>
              <span className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-extrabold ${LABEL_STYLE[advice.label]}`}>
                {advice.label}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-dim)]">
                Why â€” {ACTIVITY_LABEL[activity].toLowerCase()} in current conditions
              </p>
              <ul className="mt-1.5 space-y-1.5">
                {advice.reasons.map((reason) => (
                  <li key={reason} className="flex items-start gap-2 text-sm text-[var(--text)]">
                    <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
                    {reason}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[10px] text-[var(--text-dim)]">
                Based on feels-like {Math.round(bundle!.current.apparentTemperature)}Â°, wind {Math.round(bundle!.current.windSpeed)} km/h, humidity {Math.round(bundle!.current.humidity)}%, rain chance {today?.precipitationProbabilityMax ?? 0}% and US AQI {aq?.usAqi != null ? Math.round(aq.usAqi) : "n/a"}.
              </p>
            </div>
          </div>
        )}
      </Card>

      {/* Deterministic assistant */}
      <Card as="section" className="p-4 sm:p-5" aria-labelledby="assistant-heading">
        <h2 id="assistant-heading" className="flex items-center gap-2 text-base font-extrabold text-[var(--text)] sm:text-lg">
          <Bot size={18} aria-hidden="true" /> Ask about the weather
        </h2>
        <p className="mt-1 text-xs text-[var(--text-dim)]">
          Deterministic assistant â€” answers come only from the loaded forecast and air-quality
          data. It will never make up a reading.
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {EXAMPLE_QUESTIONS.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => ask(q)}
              className="rounded-full border border-[var(--surface-border)] bg-[var(--surface-2)] px-3 py-1.5 text-[11px] font-semibold text-[var(--text)] transition hover:border-[var(--accent)]"
            >
              {q}
            </button>
          ))}
        </div>

        {qa.length > 0 && (
          <div className="mt-4 space-y-3" aria-live="polite">
            {qa.map((entry, i) => (
              <div key={i} className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-2)] p-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-dim)]">
                  You
                </p>
                <p className="text-sm font-semibold text-[var(--text)]">{entry.question}</p>
                <p className="mt-2 text-[11px] font-bold uppercase tracking-wider text-[var(--accent)]">
                  Climate Chaser
                </p>
                <p className="text-sm text-[var(--text)]">{entry.answer}</p>
              </div>
            ))}
          </div>
        )}

        <form
          className="mt-3 flex items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            ask();
          }}
        >
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g. Should I carry an umbrella today?"
            aria-label="Ask the weather assistant"
            className="w-full rounded-xl border border-[var(--surface-border)] bg-[var(--surface-2)] px-3.5 py-2.5 text-sm text-[var(--text)] outline-none placeholder:text-[var(--text-dim)] focus:border-[var(--ring)]"
          />
          <Button type="submit" aria-label="Send question" className="shrink-0">
            <SendHorizontal size={16} aria-hidden="true" />
          </Button>
        </form>
      </Card>

      {aq?.usAqi != null && aq.usAqi > 150 && (
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-xs font-semibold text-amber-200">
          <Wind size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
          Air quality is poor right now â€” outdoor workouts will be less effective and harder on
          your lungs. Prefer early morning hours when pollution is typically lowest.
        </div>
      )}
    </div>
  );
}

