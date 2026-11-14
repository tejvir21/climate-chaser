/**
 * Provider selection and fallback for Climate Chaser.
 *
 * Chain (per docs/API_ARCHITECTURE.md):
 *   1. Open-Meteo (primary, full bundle)
 *   2. OpenWeatherMap (secondary, current-conditions snapshot only)
 *   3. Last good Open-Meteo bundle from persistent cache (stale-labelled)
 *   4. Throw — UI renders an error state with retry, never a blank screen.
 */

import { fetchOpenMeteoBundle } from "./openMeteo";
import { fetchOpenWeatherSnapshot, openWeatherEnabled } from "./openWeatherMap";
import type { WeatherBundle, WeatherError, WeatherLocation } from "@/types/weather";

export const LAST_GOOD_PREFIX = "climate-chaser:last-good:v1:";
const LAST_GOOD_TTL_MS = 24 * 3600 * 1000; // 24h hard ceiling for reuse

export interface BundleResult {
  bundle: WeatherBundle;
  /** True when served from cache because every provider failed. */
  fromCache: boolean;
}

export interface BundleFailure {
  error: WeatherError;
}

export type BundleOutcome = BundleResult | BundleFailure;

export async function getWeatherBundle(
  location: WeatherLocation,
  options: {
    forceRefresh?: boolean;
    /** Provider preference: auto (default), open-meteo only, or openweathermap only. */
    prefer?: "auto" | "open-meteo" | "openweathermap";
  } = {}
): Promise<BundleResult> {
  const prefer = options.prefer ?? "auto";
  const attempted: WeatherError["attempted"] = [];

  if (prefer === "openweathermap") {
    attempted.push("openweathermap");
    try {
      const bundle = await fetchOpenWeatherSnapshot(location, options);
      return { bundle, fromCache: false };
    } catch (error) {
      throw providerFailure(location, error, attempted);
    }
  }

  attempted.push("open-meteo");
  try {
    const bundle = await fetchOpenMeteoBundle(location, options);
    writeLastGood(location, bundle);
    return { bundle, fromCache: false };
  } catch (primaryError) {
    if (prefer === "auto" && openWeatherEnabled()) {
      attempted.push("openweathermap");
      try {
        const bundle = await fetchOpenWeatherSnapshot(location, options);
        return { bundle, fromCache: false };
      } catch {
        // fall through to cache
      }
    }

    const cached = readLastGood(location);
    if (cached) {
      cached.provider = { ...cached.provider, stale: true };
      return { bundle: cached, fromCache: true };
    }

    throw providerFailure(location, primaryError, attempted);
  }
}

function providerFailure(
  location: WeatherLocation,
  cause: unknown,
  attempted: WeatherError["attempted"]
): never {
  const reason = cause instanceof Error ? cause.message : String(cause);
  const weatherError: WeatherError = {
    message: `Couldn't load weather for ${location.name}. ${reason}`,
    attempted,
    staleShown: false,
  };
  throw Object.assign(new Error(weatherError.message), { weatherError });
}

export function lastGoodInfo(location: WeatherLocation) {
  return readLastGood(location);
}

function writeLastGood(location: WeatherLocation, bundle: WeatherBundle) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(
      LAST_GOOD_PREFIX + location.id,
      JSON.stringify({ expires: Date.now() + LAST_GOOD_TTL_MS, bundle })
    );
  } catch {
    /* storage unavailable */
  }
}

function readLastGood(location: WeatherLocation): WeatherBundle | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(LAST_GOOD_PREFIX + location.id);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { expires: number; bundle: WeatherBundle };
    if (typeof parsed.expires !== "number" || parsed.expires < Date.now()) {
      localStorage.removeItem(LAST_GOOD_PREFIX + location.id);
      return null;
    }
    // Mark unambiguously as coming from cache for the UI.
    const bundle = parsed.bundle;
    bundle.provider = {
      id: "cache",
      name: "Cached (last known)",
      url: "https://open-meteo.com/",
      requiresKey: false,
      attribution: "Cached from Open-Meteo",
      stale: true,
      fetchedAt: bundle.provider.fetchedAt,
      partial: bundle.provider.partial,
    };
    return bundle;
  } catch {
    return null;
  }
}
