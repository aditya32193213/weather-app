import dayjs from "dayjs";

/**
 * Map of deprecated / non-standard IANA names to their canonical replacements.
 * These legacy identifiers are still emitted by some geolocation APIs and
 * older browser Intl implementations. Add entries here as new ones are found.
 */
const DEPRECATED_ZONES = {
  "Asia/Calcutta":  "Asia/Kolkata",
  "Asia/Saigon":    "Asia/Ho_Chi_Minh",
  "Asia/Rangoon":   "Asia/Yangon",
  "Pacific/Truk":   "Pacific/Chuuk",
  "US/Eastern":     "America/New_York",
  "US/Pacific":     "America/Los_Angeles",
  "US/Central":     "America/Chicago",
  "US/Mountain":    "America/Denver",
};

/**
 * Normalises a timezone string:
 *   • Replaces deprecated IANA aliases with their canonical equivalents.
 *   • Falls back to "auto" for falsy / whitespace-only input.
 *
 * The normalised value is suitable for passing to Open-Meteo query params,
 * which accept either "auto" or a valid IANA string.
 *
 * @param   {string} [tz]
 * @returns {string}  Canonical IANA name or "auto".
 */
export const normalizeTimezone = (tz) => {
  const trimmed = (tz ?? "").trim() || "auto";
  return DEPRECATED_ZONES[trimmed] ?? trimmed;
};

/**
 * Resolves a timezone string to a concrete IANA name suitable for Intl APIs.
 *
 *   "auto" / null / undefined → browser's local timezone
 *   everything else           → normalised IANA name
 *
 * Unlike `normalizeTimezone`, this function never returns "auto" — it always
 * produces a string that Intl.DateTimeFormat can accept directly.
 *
 * @param   {string} [tz]
 * @returns {string}  Resolved IANA timezone name.
 */
export const resolveTimezone = (tz) => {
  const normalized = normalizeTimezone(tz);
  if (!normalized || normalized === "auto") {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }
  return normalized;
};

/**
 * Returns today's date string ("YYYY-MM-DD") in the given timezone.
 *
 * This is critical for correctly distinguishing "today" from historical dates
 * when the user's local timezone differs from UTC. For example, a user in
 * UTC+5:30 at 23:30 local time is already in "tomorrow" in UTC — without
 * this function we would request tomorrow's archive data instead of today's
 * forecast.
 *
 * Uses "en-CA" locale because it produces YYYY-MM-DD format natively.
 *
 * @param   {string} [tz]
 * @returns {string}  e.g. "2024-06-15"
 */
export const getTzDateStr = (tz) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: resolveTimezone(tz),
    year:     "numeric",
    month:    "2-digit",
    day:      "2-digit",
  }).format(new Date());

/**
 * Validates that a string is a recognised IANA timezone identifier by probing
 * the Intl API. This avoids the need to ship a full timezone list client-side.
 *
 * @param   {string} tz
 * @returns {boolean}
 */
export const isValidTimezone = (tz) => {
  if (!tz || typeof tz !== "string") return false;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};


export const getTzAbbr = (tz) => {
  if (!tz) return "Local";
  try {
    return (
      new Intl.DateTimeFormat("en", { timeZoneName: "short", timeZone: tz })
        .formatToParts(new Date())
        .find((p) => p.type === "timeZoneName")?.value ?? tz
    );
  } catch {
    return tz;
  }
};



/**
 * Returns the date portion ("YYYY-MM-DD") of `d` in the given IANA timezone.
 * Falls back to local date formatting when no timezone is provided.
 *
 * @param {Date}              [d=new Date()]
 * @param {string|null|undefined} tz  IANA timezone string (e.g. "Asia/Kolkata").
 *                                    Pass null/undefined to use local time.
 * @returns {string}  "YYYY-MM-DD"
 *
 * @throws {Error} If `tz` is provided but the dayjs-timezone plugin has not
 *   been loaded (via `dayjs.extend(utc)` + `dayjs.extend(timezone)` in
 *   main.jsx). Importing this utility in a unit test without setting up the
 *   plugins first will cause `dayjs(d).tz(tz)` to throw silently — add
 *   plugin setup to your test bootstrap to avoid this.
 */
export const localDateStr = (d = new Date(), tz) =>
  tz
    ? dayjs(d).tz(tz).format("YYYY-MM-DD")
    : dayjs(d).format("YYYY-MM-DD");