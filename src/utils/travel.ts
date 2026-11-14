/** Rule-based travel assessment from daily forecast data — pure and testable. */

import type { DailyPoint } from "@/types/weather";

export interface TravelAssessment {
  fromIso: string;
  toIso: string;
  daysCovered: number;
  maxTemp: number;
  minTemp: number;
  totalRainMm: number;
  maxRainProbability: number;
  rainyDays: number;
  stormyDays: number;
  highUvDays: number;
  days: DailyPoint[];
  summary: string;
  tips: string[];
}

/** Assess a trip window against the provider's daily forecast horizon. */
export function assessTrip(
  daily: DailyPoint[],
  fromIso: string,
  toIso: string
): TravelAssessment | null {
  const days = daily.filter((d) => d.date >= fromIso && d.date <= toIso);
  if (days.length === 0) return null;

  const maxTemp = Math.max(...days.map((d) => d.tempMax));
  const minTemp = Math.min(...days.map((d) => d.tempMin));
  const totalRainMm = days.reduce((sum, d) => sum + d.precipitationSum, 0);
  const maxRainProbability = Math.max(
    ...days.map((d) => d.precipitationProbabilityMax),
    0
  );
  const rainyDays = days.filter(
    (d) => d.precipitationProbabilityMax >= 50 || d.precipitationSum >= 5
  ).length;
  const stormyDays = days.filter(
    (d) => d.weatherCode >= 95 && d.weatherCode <= 99
  ).length;
  const highUvDays = days.filter((d) => (d.uvIndexMax ?? 0) >= 6).length;

  const tips: string[] = [];
  if (maxRainProbability >= 50 || totalRainMm >= 10) {
    tips.push("Carry an umbrella or rain jacket — rain is likely during at least one day of the trip.");
  } else if (totalRainMm >= 2) {
    tips.push("Occasional light showers possible — a compact umbrella is handy.");
  } else {
    tips.push("Rain is unlikely during the trip window.");
  }
  if (maxTemp >= 35) {
    tips.push("Very hot conditions: loose cotton clothing, hat, water every hour, and avoid midday sun.");
  } else if (maxTemp >= 30) {
    tips.push("Warm to hot — light breathable layers and sun protection.");
  } else if (minTemp <= 10) {
    tips.push("Chilly — pack an insulated layer and a warm evening jacket.");
  } else if (minTemp <= 16) {
    tips.push("Mild with cool mornings/evenings — a light layer will help.");
  }
  if (highUvDays > 0) {
    tips.push("High UV on at least one day — SPF 30+, sunglasses, and shade between 11:00 and 15:00.");
  }
  if (stormyDays > 0) {
    tips.push("Thunderstorms possible — avoid open fields, ridgelines and water during storms.");
  }
  if (maxTemp <= 5) {
    tips.push("Near-freezing temperatures — thermals, gloves and insulated footwear recommended.");
  }

  const summary = `${days.length} day${days.length === 1 ? "" : "s"} covered: highs up to ${Math.round(
    maxTemp
  )}° and lows down to ${Math.round(minTemp)}°, ${Math.round(totalRainMm)} mm of rain expected in total (max daily chance ${Math.round(
    maxRainProbability
  )}%).`;

  return {
    fromIso,
    toIso,
    daysCovered: days.length,
    maxTemp,
    minTemp,
    totalRainMm,
    maxRainProbability,
    rainyDays,
    stormyDays,
    highUvDays,
    days,
    summary,
    tips,
  };
}

export function tripSpanDays(fromIso: string, toIso: string): number {
  const from = Date.parse(`${fromIso}T00:00:00Z`);
  const to = Date.parse(`${toIso}T00:00:00Z`);
  return Math.round((to - from) / 86400000) + 1;
}

/** Human phrase for the strongest travel concern, or null when conditions are mild. */
export function primaryConcern(assessment: TravelAssessment): string | null {
  if (assessment.stormyDays > 0) return "Storms likely";
  if (assessment.maxRainProbability >= 70 || assessment.totalRainMm >= 20) return "Heavy rain likely";
  if (assessment.maxTemp >= 40) return "Dangerous heat";
  if (assessment.maxTemp >= 35) return "Heat";
  if (assessment.minTemp <= 0) return "Freezing cold";
  if (assessment.maxRainProbability >= 40) return "Rain likely";
  return null;
}
