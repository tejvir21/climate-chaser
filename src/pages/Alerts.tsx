import { useMemo } from "react";
import {
  TriangleAlert,
  ShieldCheck,
  Info,
  CloudRain,
  Wind,
  Sun,
  Snowflake,
  CloudLightning,
  Waves,
} from "lucide-react";
import { useClimateStore } from "@/store/useClimateStore";
import { useWeatherBundle } from "@/hooks/useQueries";
import { deriveAlerts, describeSeverity, type AlertSeverity } from "@/utils/alerts";
import { imdStatus } from "@/services/weather/imd";
import { Card, Skeleton, Badge } from "@/components/ui/primitives";
import { ErrorState } from "@/components/weather/ErrorState";

const SEVERITY_ICON: Record<AlertSeverity, typeof CloudRain> = {
  warning: TriangleAlert,
  watch: CloudRain,
  advisory: Info,
};

function alertIcon(id: string, severity: AlertSeverity) {
  if (id.startsWith("wind")) return Wind;
  if (id.startsWith("heat")) return Sun;
  if (id.startsWith("cold") || id.startsWith("snow")) return Snowflake;
  if (id.startsWith("storm")) return CloudLightning;
  if (id.startsWith("fog")) return Waves;
  return SEVERITY_ICON[severity];
}

export default function Alerts() {
  const location = useClimateStore((s) => s.location);
  const { data, isPending, isError, error, refresh } = useWeatherBundle(location);

  const bundle = data?.bundle ?? null;

  const alerts = useMemo(
    () => (bundle ? deriveAlerts(bundle.daily, bundle.hourly) : []),
    [bundle]
  );

  const imd = imdStatus();

  if (isPending && !bundle) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Loading alerts">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (isError && !bundle) {
    return (
      <div className="py-10">
        <ErrorState
          message={error instanceof Error ? error.message : "Alerts need forecast data."}
          onRetry={() => void refresh()}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-[var(--text)] sm:text-3xl">
          <TriangleAlert size={24} aria-hidden="true" /> Alerts — {location.name}
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-[var(--text-dim)]">
          Hazards detected in the 16-day model forecast for this location. These are
          <strong> model-based estimates</strong>, not official warnings — see below for
          how official IMD integration works.
        </p>
      </div>

      {/* IMD status */}
      <Card className="flex items-start gap-3 border-sky-400/30 bg-sky-400/5 p-4">
        <ShieldCheck size={20} aria-hidden="true" className="mt-0.5 shrink-0 text-sky-400" />
        <div className="text-xs leading-relaxed text-[var(--text)]">
          <p className="font-extrabold text-sky-300">Official IMD district warnings — {imd.enabled ? "configured" : "pending integration"}</p>
          <p className="mt-1 text-[var(--text-dim)]">{imd.reason}</p>
          <p className="mt-1 text-[var(--text-dim)]">
            Until then, everything on this page is derived from the Open-Meteo forecast model.
            For life-safety decisions always follow official IMD, NDMA and district administration
            bulletins.
          </p>
        </div>
      </Card>

      {alerts.length === 0 ? (
        <Card className="p-8 text-center">
          <ShieldCheck size={36} aria-hidden="true" className="mx-auto text-emerald-400" />
          <h2 className="mt-3 text-lg font-extrabold text-[var(--text)]">
            No hazards detected
          </h2>
          <p className="mt-1 text-sm text-[var(--text-dim)]">
            Nothing in the next 16 days crosses our alert thresholds for {location.name}:
            no heavy rainfall (≥ 64.5 mm/24 h), thunderstorms, strong winds (≥ 55 km/h),
            heatwave (≥ 40° max) or cold-wave conditions (≤ 4° min).
          </p>
          <p className="mt-3 text-[11px] text-[var(--text-dim)]">
            Absence of model alerts is not a guarantee — keep an eye on official IMD
            bulletins during monsoon and heatwave season.
          </p>
        </Card>
      ) : (
        <ul className="space-y-3">
          {alerts.map((alert) => {
            const style = describeSeverity(alert.severity);
            const Icon = alertIcon(alert.id, alert.severity);
            return (
              <li key={alert.id}>
                <Card className={`flex items-start gap-3 border p-4 ${style.classes}`}>
                  <Icon size={22} aria-hidden="true" className="mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-widest opacity-80">
                        {style.label} · Model estimate
                      </span>
                      <span className="text-[10px] font-semibold opacity-70">
                        Valid {alert.date}
                      </span>
                    </div>
                    <h2 className="mt-1 font-extrabold leading-snug">{alert.title}</h2>
                    <p className="mt-1 text-xs leading-relaxed opacity-90">{alert.description}</p>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <Card className="p-4">
        <h2 className="text-xs font-extrabold uppercase tracking-widest text-[var(--text-dim)]">
          How severity works
        </h2>
        <ul className="mt-2 space-y-1.5 text-[11px] text-[var(--text-dim)]">
          <li><Badge tone="bad">Warning</Badge> — significant risk to life/property if unprepared. Treat seriously.</li>
          <li><Badge tone="warn">Watch</Badge> — conditions favourable for hazardous weather; stay alert.</li>
          <li><Badge tone="info">Advisory</Badge> — minor impacts expected; adjust routine if sensitive.</li>
        </ul>
        <p className="mt-3 text-[10px] text-[var(--text-dim)]">
          Source: Open-Meteo forecast model (daily + hourly). Thresholds inspired by IMD
          climatological classifications but are approximate and location-agnostic. This page is
          not an official warning channel.
        </p>
      </Card>
    </div>
  );
}
