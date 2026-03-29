import { MAX_RANGE_DAYS } from "./constants";

/**
 * Strict YYYY-MM-DD pattern.
 * Used to reject strings like "2024-6-1" that `new Date()` would accept but
 * that the Open-Meteo API would reject, causing a confusing HTTP 400 error.
 */
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Returns true if lat and lon are finite numbers within legal geographic bounds.
 *
 *   lat ∈ [-90, 90]   — pole-to-pole
 *   lon ∈ [-180, 180] — antimeridian-to-antimeridian
 *
 * @param   {unknown} lat
 * @param   {unknown} lon
 * @returns {boolean}
 */
export const isValidCoord = (lat, lon) =>
  typeof lat === "number" && Number.isFinite(lat) && lat >= -90  && lat <= 90  &&
  typeof lon === "number" && Number.isFinite(lon) && lon >= -180 && lon <= 180;

/**
 * Returns true if `dateStr` is a valid calendar date in YYYY-MM-DD format.
 *
 * Two-phase check:
 *   1. Format regex — rejects strings like "2024-6-1" or "01/06/2024"
 *   2. Date parse   — rejects impossible dates like "2024-02-30"
 *
 * @param   {string} dateStr
 * @returns {boolean}
 */
export const isValidDateStr = (dateStr) => {
  if (!DATE_RE.test(dateStr)) return false;
  return !isNaN(new Date(dateStr).getTime());
};

/**
 * Returns true when the date range is valid:
 *   • Both strings match strict YYYY-MM-DD format
 *   • Both parse to valid calendar dates
 *   • start ≤ end (zero-length ranges are permitted for single-day queries)
 *   • Span does not exceed `maxDays`
 *
 * The default limit comes from constants so callers don't need to pass it
 * every time, but it can be overridden for specific use-cases.
 *
 * @param   {string} start          "YYYY-MM-DD"
 * @param   {string} end            "YYYY-MM-DD"
 * @param   {number} [maxDays]      Defaults to MAX_RANGE_DAYS from constants.
 * @returns {boolean}
 */
export const isValidDateRange = (start, end, maxDays = MAX_RANGE_DAYS) => {
  if (!isValidDateStr(start) || !isValidDateStr(end)) return false;

  const diffDays = (new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= maxDays;
};