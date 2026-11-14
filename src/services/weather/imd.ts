/**
 * IMD (India Meteorological Department) adapter — STUB, disabled by default.
 *
 * Official portal: https://api.imd.gov.in/public/
 * Requires registration and an API key (https://api.imd.gov.in/public/api_reference.html).
 * No credentials have been supplied to this project, so the integration is
 * intentionally inert: it reports a clear "pending" state and the UI shows
 * model-based estimates labelled as such. It never fabricates warnings.
 */

import type { WeatherLocation } from "@/types/weather";

export interface ImdStatus {
  enabled: boolean;
  reason: string;
}

export interface ImdWarning {
  district: string;
  headline: string;
  issuedAt: string;
  severity: "yellow" | "orange" | "red";
  url: string;
}

export function imdStatus(): ImdStatus {
  const enabled = import.meta.env.VITE_IMD_API_ENABLED === "true";
  const keyConfigured = Boolean(import.meta.env.VITE_IMD_API_KEY);
  if (enabled && keyConfigured) {
    return {
      enabled: true,
      reason:
        "IMD credentials configured. District-warning fetch is not yet implemented against the live IMD API schema — enable only after verifying endpoints.",
    };
  }
  return {
    enabled: false,
    reason:
      "IMD integration pending: register at api.imd.gov.in, set VITE_IMD_API_ENABLED=true and VITE_IMD_API_KEY. Until then, alerts are model-based estimates, not official IMD warnings.",
  };
}

/** Returns official district warnings. Empty when the integration is disabled. */
export async function fetchImdDistrictWarnings(
  _location: WeatherLocation
): Promise<ImdWarning[]> {
  // Deliberately returns [] — no credentials supplied; never invent warnings.
  return [];
}
