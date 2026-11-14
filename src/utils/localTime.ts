/** Location-local wall-clock helpers. Provider times are ISO strings WITHOUT
 *  a timezone suffix, i.e. local time at the location, so all comparisons
 *  happen inside that single local frame. */

/** "2026-11-13T16:15" in the given IANA timezone, second precision. */
export function localNowIso(timeZone: string, date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

/** Long-form local date, e.g. "Friday, 13 November". */
export function localDateLabel(timeZone: string, date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone,
  }).format(date);
}

/** Short local time, e.g. "16:15" or "4:15 PM" per the user's format. */
export function localTimeLabel(
  timeZone: string,
  format: "12h" | "24h",
  date: Date = new Date()
): string {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: format === "12h",
    timeZone,
  }).format(date);
}

/** Current UTC offset label, e.g. "IST (UTC+5:30)" — best effort. */
export function timeZoneAbbreviation(timeZone: string, date: Date = new Date()): string {
  try {
    const part = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      timeZoneName: "short",
    })
      .formatToParts(date)
      .find((p) => p.type === "timeZoneName")?.value;
    return part ?? timeZone;
  } catch {
    return timeZone;
  }
}
