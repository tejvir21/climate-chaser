/** Rule-based, model-estimated alerts derived from the forecast. NOT official warnings. */

import type { DailyPoint, HourlyPoint } from "@/types/weather";
import { dayMonthShort } from "@/utils/units";
import { isThunderstorm, isSnow } from "@/services/weather/wmo";

export type AlertSeverity = "advisory" | "watch" | "warning";

export interface WeatherAlert {
  id: string;
  severity: AlertSeverity;
  title: string;
  description: string;
  date: string; // YYYY-MM-DD
  source: "model";
}

const SEVERITY_RANK: Record<AlertSeverity, number> = {
  advisory: 1,
  watch: 2,
  warning: 3,
};

/**
 * Derived from the 16-day model forecast. Thresholds reference IMD-style
 * climatological classes (heavy rain ≥ 64.5 mm/24 h, very heavy ≥ 115.6 mm,
 * heat wave ≥ 40 °C for the plains) but are NOT official IMD warnings.
 */
export function deriveAlerts(
  daily: DailyPoint[],
  hourly?: HourlyPoint[]
): WeatherAlert[] {
  const alerts: WeatherAlert[] = [];

  for (const day of daily) {
    const when = dayMonthShort(day.date);

    if (day.precipitationSum >= 115.6) {
      alerts.push({
        id: `rain-very-heavy-${day.date}`,
        severity: "warning",
        title: `Very heavy rainfall likely (${Math.round(day.precipitationSum)} mm)`,
        description: `Model forecast indicates very heavy rain on ${when} (${day.precipitationProbabilityMax}% probability). Avoid travel if possible, and beware of waterlogging and flash flooding in low-lying areas.`,
        date: day.date,
        source: "model",
      });
    } else if (day.precipitationSum >= 64.5) {
      alerts.push({
        id: `rain-heavy-${day.date}`,
        severity: "watch",
        title: `Heavy rainfall possible (${Math.round(day.precipitationSum)} mm)`,
        description: `Model forecast indicates heavy rain on ${when}. Carry rain gear, allow extra travel time and avoid crossing waterlogged roads.`,
        date: day.date,
        source: "model",
      });
    }

    if (isThunderstorm(day.weatherCode)) {
      alerts.push({
        id: `storm-${day.date}`,
        severity: "watch",
        title: `Thunderstorms forecast (${day.weatherText})`,
        description: `Thunderstorm activity expected on ${when}. Stay indoors, unplug sensitive electronics and avoid open areas. Do not shelter under isolated trees.`,
        date: day.date,
        source: "model",
      });
    }

    if (day.windSpeedMax >= 55) {
      alerts.push({
        id: `wind-${day.date}`,
        severity: "watch",
        title: `Strong winds (gusts near ${Math.round(day.windSpeedMax)} km/h)`,
        description: `Forecast maximum sustained wind on ${when}. Secure loose objects, avoid two-wheelers where possible and watch for falling branches.`,
        date: day.date,
        source: "model",
      });
    }

    if (day.tempMax >= 40) {
      alerts.push({
        id: `heat-${day.date}`,
        severity: "warning",
        title: `Heatwave conditions (${Math.round(day.tempMax)}° max)`,
        description: `Forecast maximum above 40°C on ${when}. Limit outdoor exertion 11:00–16:00, hydrate regularly, and never leave children or pets in parked vehicles.`,
        date: day.date,
        source: "model",
      });
    }

    if (day.tempMin <= 4) {
      alerts.push({
        id: `cold-${day.date}`,
        severity: day.tempMin <= 0 ? "warning" : "watch",
        title: `Cold wave risk (${Math.round(day.tempMin)}° low)`,
        description: `Forecast overnight low of ${Math.round(day.tempMin)}°C on ${when}. Keep insulated clothing ready, especially at dawn; check on elderly neighbours and livestock.`,
        date: day.date,
        source: "model",
      });
    }

    if (isSnow(day.weatherCode)) {
      alerts.push({
        id: `snow-${day.date}`,
        severity: "advisory",
        title: `Snowfall expected (${day.weatherText})`,
        description: `Snow is forecast on ${when}. Roads may become slippery; carry chains in hill regions and check road closures before travelling.`,
        date: day.date,
        source: "model",
      });
    }
  }

  if (hourly?.length) {
    const fogHours = hourly.filter(
      (h) => h.weatherCode === 45 || h.weatherCode === 48
    );
    if (fogHours.length >= 2) {
      alerts.push({
        id: `fog-${fogHours[0].time.slice(0, 10)}`,
        severity: "advisory",
        title: "Low visibility / fog likely",
        description: `Fog is forecast for at least ${fogHours.length} of the next 48 hours. Use low-beam headlights, increase following distance and avoid overtaking.`,
        date: fogHours[0].time.slice(0, 10),
        source: "model",
      });
    }
  }

  return alerts.sort((a, b) => {
    const rank = SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
    if (rank !== 0) return rank;
    return a.date.localeCompare(b.date);
  });
}

export function describeSeverity(severity: AlertSeverity): {
  label: string;
  classes: string;
} {
  switch (severity) {
    case "warning":
      return {
        label: "Warning",
        classes: "border-red-400/50 bg-red-500/15 text-red-200",
      };
    case "watch":
      return {
        label: "Watch",
        classes: "border-amber-400/50 bg-amber-400/10 text-amber-200",
      };
    default:
      return {
        label: "Advisory",
        classes: "border-sky-400/50 bg-sky-400/10 text-sky-200",
      };
  }
}
