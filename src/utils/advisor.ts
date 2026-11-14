/** Deterministic, rule-based outdoor-activity advisor. No AI, no invention. */

export type Activity =
  | "walking"
  | "running"
  | "cycling"
  | "sports"
  | "travel"
  | "outdoor";

export interface AdvisorContext {
  tempC: number;
  feelsLikeC: number;
  rainProbability: number; // 0-100, today's max
  precipMm: number; // today's expected mm
  windKmh: number;
  uvIndex?: number;
  humidity: number;
  usAqi?: number;
}

export interface Advice {
  activity: Activity;
  score: number; // 0-100
  label: "Great" | "OK" | "Caution" | "Poor";
  reasons: string[];
}

export const ACTIVITY_LABEL: Record<Activity, string> = {
  walking: "Walking",
  running: "Running / jogging",
  cycling: "Cycling",
  sports: "Outdoor sports",
  travel: "Travelling",
  outdoor: "Outdoor time (general)",
};

function penalty(
  reasons: string[],
  condition: boolean,
  points: number,
  reason: string
): number {
  if (!condition) return 0;
  reasons.push(reason);
  return points;
}

export function advise(activity: Activity, ctx: AdvisorContext): Advice {
  const reasons: string[] = [];
  let score = 100;

  // Shared hazards
  score -= penalty(reasons, ctx.rainProbability >= 70, 30, `High chance of rain (${Math.round(ctx.rainProbability)}%)`);
  score -= penalty(reasons, ctx.rainProbability >= 40 && ctx.rainProbability < 70, 15, `Decent chance of rain (${Math.round(ctx.rainProbability)}%)`);
  score -= penalty(reasons, ctx.precipMm >= 10, 15, `${Math.round(ctx.precipMm)} mm of rain expected`);
  score -= penalty(reasons, (ctx.uvIndex ?? 0) >= 8, 10, `Very high UV index (${(ctx.uvIndex ?? 0).toFixed(1)})`);
  score -= penalty(reasons, (ctx.uvIndex ?? 0) >= 6 && (ctx.uvIndex ?? 0) < 8, 5, `High UV index (${(ctx.uvIndex ?? 0).toFixed(1)})`);
  score -= penalty(reasons, ctx.humidity >= 85, 8, `Very humid (${Math.round(ctx.humidity)}%)`);
  score -= penalty(reasons, ctx.feelsLikeC >= 38, 30, `Dangerous heat — feels like ${Math.round(ctx.feelsLikeC)}°`);
  score -= penalty(reasons, ctx.feelsLikeC >= 34 && ctx.feelsLikeC < 38, 18, `Very hot — feels like ${Math.round(ctx.feelsLikeC)}°`);
  score -= penalty(reasons, ctx.feelsLikeC >= 30 && ctx.feelsLikeC < 34, 8, `Hot — feels like ${Math.round(ctx.feelsLikeC)}°`);
  score -= penalty(reasons, ctx.feelsLikeC <= 2, 12, `Near-freezing — feels like ${Math.round(ctx.feelsLikeC)}°`);
  score -= penalty(reasons, ctx.feelsLikeC <= -2, 22, `Below freezing — feels like ${Math.round(ctx.feelsLikeC)}°`);

  // Air quality
  const aqi = ctx.usAqi;
  if (aqi != null) {
    score -= penalty(reasons, aqi > 250, 35, `Severe air pollution (US AQI ${Math.round(aqi)})`);
    score -= penalty(reasons, aqi > 150 && aqi <= 250, 20, `Unhealthy air (US AQI ${Math.round(aqi)})`);
    score -= penalty(reasons, aqi > 100 && aqi <= 150, 8, `Moderate air pollution (US AQI ${Math.round(aqi)})`);
  }

  // Activity-specific
  if (activity === "cycling") {
    score -= penalty(reasons, ctx.windKmh > 38, 25, `Strong wind (${Math.round(ctx.windKmh)} km/h) — hard to control a cycle`);
    score -= penalty(reasons, ctx.windKmh > 25 && ctx.windKmh <= 38, 12, `Breezy (${Math.round(ctx.windKmh)} km/h)`);
  } else if (activity === "running" || activity === "sports") {
    score -= penalty(reasons, ctx.windKmh > 45, 10, `Very strong wind (${Math.round(ctx.windKmh)} km/h)`);
    score -= penalty(reasons, ctx.feelsLikeC >= 32, 10, `Physical exertion in ${Math.round(ctx.feelsLikeC)}° heat is risky`);
  } else if (activity === "walking") {
    score -= penalty(reasons, ctx.windKmh > 45, 8, `Very strong wind (${Math.round(ctx.windKmh)} km/h)`);
  } else if (activity === "travel") {
    // Travel mostly tolerates conditions but storms/AQ matter most.
    score -= penalty(reasons, aqi != null && aqi > 200, 15, `Very poor air (US AQI ${aqi != null ? Math.round(aqi) : "?"}) during travel`);
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  if (reasons.length === 0) reasons.push("Conditions are comfortable for this activity.");

  const label: Advice["label"] =
    score >= 75 ? "Great" : score >= 50 ? "OK" : score >= 25 ? "Caution" : "Poor";

  return { activity, score, label, reasons };
}

export const ACTIVITY_QUICK: Array<{ id: Activity; label: string }> = (
  Object.keys(ACTIVITY_LABEL) as Activity[]
).map((id) => ({ id, label: ACTIVITY_LABEL[id] }));
