/**
 * Deterministic weather assistant. Answers strictly from the loaded data —
 * it never invents numbers or fetches anything itself.
 */

import type { AirQualityBundle, WeatherBundle } from "@/types/weather";
import { advise, type Activity } from "@/utils/advisor";
import { formatTemperature } from "@/utils/units";
import { computeIndiaAqi, usAqiCategory } from "@/utils/aqi";

export interface AssistantContext {
  bundle: WeatherBundle | null;
  airQuality: AirQualityBundle | null;
  unit: "c" | "f";
}

export const EXAMPLE_QUESTIONS = [
  "Should I carry an umbrella today?",
  "Is tomorrow suitable for running?",
  "What's the air quality right now?",
  "What will tomorrow's weather be like?",
  "Should I wear a jacket?",
  "Is it a good day for a walk?",
];

export function answerQuestion(rawQuestion: string, ctx: AssistantContext): string {
  const q = rawQuestion.trim().toLowerCase();
  if (!q) return "Ask me something about the weather — for example: " + EXAMPLE_QUESTIONS[0];
  const { bundle, airQuality, unit } = ctx;

  if (!bundle) {
    return "I don't have any weather data loaded yet. Search for a city first, then ask me.";
  }

  const current = bundle.current;
  const today = bundle.daily[0];
  const tomorrow = bundle.daily[1];
  const next12h = bundle.hourly.slice(0, 12);
  const maxPop12h = next12h.reduce(
    (max, h) => Math.max(max, h.precipitationProbability),
    0
  );
  const partial = bundle.provider.partial;

  const temp = (v: number) => formatTemperature(v, unit);

  // Umbrella / rain
  if (/\b(umbrella|rain|raining|drizzle|shower)\b/.test(q)) {
    if (partial || !today) {
      return `All I have right now is current conditions (${current.weatherText.toLowerCase()}, ${Math.round(current.humidity)}% humidity). Hourly rain chances need the full forecast — Open-Meteo isn't reachable from your connection right now.`;
    }
    const worst = Math.max(maxPop12h, today.precipitationProbabilityMax);
    if (worst >= 60) {
      return `Yes — carry one. Rain chance is ${Math.round(today.precipitationProbabilityMax)}% today (up to ${Math.round(maxPop12h)}% in the next 12 hours), with ${today.precipitationSum.toFixed(1)} mm expected.`;
    }
    if (worst >= 30) {
      return `It's borderline — about a ${Math.round(today.precipitationProbabilityMax)}% chance of rain today. A small foldable umbrella won't hurt; ${today.precipitationSum.toFixed(1)} mm expected in total.`;
    }
    return `No need — rain probability is only ${Math.round(today.precipitationProbabilityMax)}% today and ${today.precipitationSum.toFixed(1)} mm expected.`;
  }

  // Running / jogging
  if (/\b(run|jog|jog|marathon)\b/.test(q)) {
    return activityReply("running", ctx);
  }
  if (/\b(cycl|bike|biking)\b/.test(q)) {
    return activityReply("cycling", ctx);
  }
  if (/\b(walk|stroll)\b/.test(q)) {
    return activityReply("walking", ctx);
  }
  if (/\b(sport|cricket|football|gym|exercise|workout)\b/.test(q)) {
    return activityReply("sports", ctx);
  }
  if (/\b(outdoor|outside|park|picnic)\b/.test(q)) {
    return activityReply("outdoor", ctx);
  }

  // Air quality
  if (/\b(aqi|air ?quality|pollution|polluted|smoke|haze)\b/.test(q)) {
    const aq = airQuality?.current;
    if (!aq || aq.usAqi == null) {
      return "I couldn't load air quality data for this location right now — try again in a moment, or check the Air Quality page.";
    }
    const us = usAqiCategory(Math.round(aq.usAqi));
    const india = computeIndiaAqi(aq);
    const lines = [
      `US AQI is ${Math.round(aq.usAqi)} — "${us.label}".`,
    ];
    if (india) {
      lines.push(
        `Indian National AQI (CPCB, computed from modelled concentrations): ${india.aqi} — "${india.category}", dominated by ${india.dominantPollutant}.`
      );
    }
    if (us.band >= 4) {
      lines.push("Sensitive groups should avoid outdoor exertion; consider an N95 outdoors.");
    }
    return lines.join(" ");
  }

  // Tomorrow
  if (/\btomorrow\b/.test(q)) {
    if (partial || !tomorrow) {
      return "Tomorrow's outlook needs the full forecast, which is unavailable right now (Open-Meteo unreachable). Current conditions: " +
        `${formatTemperature(current.temperature, unit)} and ${current.weatherText.toLowerCase()}.`;
    }
    return `Tomorrow: ${tomorrow.weatherText.toLowerCase()}, high ${temp(tomorrow.tempMax)}, low ${temp(tomorrow.tempMin)}. Rain chance ${Math.round(
      tomorrow.precipitationProbabilityMax
    )}% with ${tomorrow.precipitationSum.toFixed(1)} mm expected.`;
  }

  // Jacket / cold
  if (/\b(jacket|coat|cold|chilly|layer)\b/.test(q)) {
    const low = today?.tempMin ?? current.apparentTemperature;
    const verdict =
      current.apparentTemperature <= 12
        ? "Yes — it feels quite cold right now."
        : current.apparentTemperature <= 18
          ? "A light layer would be comfortable."
          : "Probably not needed today.";
    return `${verdict} It feels like ${temp(current.apparentTemperature)} now` +
      (today ? `, with a low of ${temp(low)} expected.` : ".");
  }

  // UV / sun
  if (/\b(uv|sunburn|sun protection|spf)\b/.test(q)) {
    const uv = current.uvIndex;
    if (uv == null) return "UV data isn't available for this location right now.";
    const advice =
      uv >= 8 ? "Very high — SPF 30+, sunglasses, and shade between 11:00 and 15:00."
      : uv >= 6 ? "High — SPF recommended, especially around midday."
      : uv >= 3 ? "Moderate — basic sun protection is sensible."
      : "Low — minimal protection needed.";
    return `Current UV index is ${uv.toFixed(1)}. ${advice}`;
  }

  // Wind
  if (/\bwind|breez|gust/.test(q)) {
    const gust = current.windGusts != null ? ` with gusts up to ${Math.round(current.windGusts)} km/h` : "";
    return `Wind is ${Math.round(current.windSpeed)} km/h${gust} from the ${degreesToCompass(current.windDirection)}. ${current.windSpeed > 40 ? "That's strong — cycling and two-wheelers will be affected." : ""}`.trim();
  }

  // Compare / travel → point at dedicated pages
  if (/\bcompare\b/.test(q)) {
    return "For a full side-by-side, open the Compare page — add up to four cities and I'll show temperatures, humidity, wind, rain probability and AQI together.";
  }
  if (/\b(travel|trip|vacation|holiday)\b/.test(q)) {
    return "For trip planning, open the Travel page — pick a destination and dates, and I'll check conditions, rain risk and packing suggestions for the window.";
  }

  // Temperature now
  if (/\b(temperature|hot|warm|how (is|does) the weather)\b/.test(q)) {
    return `Right now it's ${temp(current.temperature)} and ${current.weatherText.toLowerCase()}, feeling like ${temp(
      current.apparentTemperature
    )}.${today ? ` Today's high is ${temp(today.tempMax)}, low ${temp(today.tempMin)}.` : ""}`;
  }

  return `I can help with rain, outdoor activity suitability, air quality, tomorrow's outlook, UV, wind, and temperature. Try one of these: "${EXAMPLE_QUESTIONS[0]}", "${EXAMPLE_QUESTIONS[1]}", or "${EXAMPLE_QUESTIONS[2]}".`;
}

/** Note: advisor reason strings quote °C values, matching the app's base unit. */
function activityReply(activity: Activity, ctx: AssistantContext): string {
  const { bundle, airQuality } = ctx;
  if (!bundle) return "No weather data loaded — search for a city first.";
  const current = bundle.current;
  const today = bundle.daily[0];
  const advice = advise(activity, {
    tempC: current.temperature,
    feelsLikeC: current.apparentTemperature,
    rainProbability: today?.precipitationProbabilityMax ?? 0,
    precipMm: today?.precipitationSum ?? 0,
    windKmh: current.windSpeed,
    uvIndex: current.uvIndex,
    humidity: current.humidity,
    usAqi: airQuality?.current?.usAqi,
  });
  const activityWord = activity === "running" ? "running" : activity === "cycling" ? "cycling" : activity === "walking" ? "walking" : activity === "sports" ? "outdoor sports" : "being outdoors";
  return `For ${activityWord}: ${advice.label.toUpperCase()} (score ${advice.score}/100). ${advice.reasons.slice(0, 3).join(" ")}`;
}

function degreesToCompass(deg: number): string {
  const dirs = ["north", "north-east", "east", "south-east", "south", "south-west", "west", "north-west"];
  return dirs[Math.round((((deg % 360) + 360) % 360) / 45) % 8];
}
