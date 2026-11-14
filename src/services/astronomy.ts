/** Sun position, daylight, and an (approximate) moon phase — pure functions. */

export interface MoonPhase {
  name: string;
  /** 0..100 fraction of the disc illuminated. */
  illumination: number;
}

export interface AstronomyResult {
  sunrise: string;
  sunset: string;
  daylightMinutes: number;
  /** 0..1 progress of the sun across the sky; null before/after 1h grace. */
  sunProgress: number | null;
  moonPhase: string;
  moonIllumination: number;
}

export function computeAstronomy(
  sunriseIso: string,
  sunsetIso: string,
  nowIso: string
): AstronomyResult {
  const sunrise = sunriseIso;
  const sunset = sunsetIso;
  const sr = Date.parse(sunriseIso);
  const ss = Date.parse(sunsetIso);
  const now = Date.parse(nowIso);

  const daylightMinutes =
    Number.isFinite(sr) && Number.isFinite(ss)
      ? Math.max(0, Math.round((ss - sr) / 60000))
      : 0;

  let sunProgress: number | null = null;
  if (Number.isFinite(sr) && Number.isFinite(ss) && ss > sr) {
    if (Number.isFinite(now)) {
      const raw = (now - sr) / (ss - sr);
      if (raw >= -0.1 && raw <= 1.1) {
        sunProgress = Math.min(1, Math.max(0, raw));
      }
    }
  }

  const moon = moonPhaseInfo(new Date(Number.isFinite(now) ? now : Date.now()));

  return {
    sunrise,
    sunset,
    daylightMinutes,
    sunProgress,
    moonPhase: moon.name,
    moonIllumination: moon.illumination,
  };
}

/**
 * Approximate moon phase using the synodic period (29.53058867 d) and the
 * known new-moon epoch 2000-01-06 18:14 UTC. Accurate to ~0.5 day — used for
 * decoration, not for navigation.
 */
export function moonPhaseInfo(date: Date): MoonPhase {
  const synodic = 29.53058867;
  const knownNew = Date.UTC(2000, 0, 6, 18, 14);
  const days = (date.getTime() - knownNew) / 86400000;
  let phase = (days % synodic) / synodic;
  if (phase < 0) phase += 1;
  // Illumination fraction peaks at full moon (phase 0.5).
  const illumination = Math.round(
    ((1 - Math.cos(2 * Math.PI * phase)) / 2) * 100
  );
  const name =
    phase < 0.0338 || phase >= 0.9662
      ? "New Moon"
      : phase < 0.2162
        ? "Waxing Crescent"
        : phase < 0.2838
          ? "First Quarter"
          : phase < 0.4662
            ? "Waxing Gibbous"
            : phase < 0.5338
              ? "Full Moon"
              : phase < 0.7162
                ? "Waning Gibbous"
                : phase < 0.7838
                  ? "Last Quarter"
                  : "Waning Crescent";
  return { name, illumination };
}
