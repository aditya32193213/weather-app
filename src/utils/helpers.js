/**
 * Rounds a coordinate to 4 decimal places (~11 m precision).
 *
 * Prevents cache-key fragmentation caused by floating-point noise in GPS
 * lat/lon values (e.g. 28.61390001 vs 28.61389999 should share one cache entry).
 *
 * @param   {number} n  Must be a finite number.
 * @returns {number}
 * @throws  {TypeError} If `n` is not finite (catches NaN, ±Infinity early).
 */
export const roundCoord = (n) => {
  if (!Number.isFinite(n)) {
    throw new TypeError(`roundCoord: expected a finite number, got ${n}`);
  }
  return parseFloat(n.toFixed(4));
};

/**
 * Extracts the hour (0–23) from an ISO-8601 datetime string.
 *
 * Handles:
 *   • Full datetimes  — "2024-06-01T14:00" → 14
 *   • Date-only strings — "2024-06-01"      → 0  (treat as midnight)
 *
 * Previously this returned NaN for date-only strings because
 * "2024-06-01".slice(11, 13) === "" and parseInt("", 10) === NaN.
 * Downstream code using the result as an array index would silently
 * produce undefined array access.
 *
 * @param   {string} t
 * @returns {number}  Hour in [0, 23].
 */
export const extractHour = (t) => {
  const str  = String(t ?? "");
  if (str.length < 14) return 0; // Date-only — treat as midnight (hour 0).
  const hour = parseInt(str.slice(11, 13), 10);
  return Number.isFinite(hour) ? hour : 0;
};

/**
 * Computes the arithmetic mean of an array, rounded to 4 decimal places.
 *
 * Non-finite values (null, undefined, NaN, ±Infinity) are excluded from
 * both the sum and the denominator, so they cannot corrupt the result.
 * Returns null for empty input or an input composed entirely of non-finite values.
 *
 * Previously this function did not filter non-finite values, so a single null
 * in the input would propagate NaN through the entire computation.
 *
 * @param   {(number|null|undefined)[]} arr
 * @returns {number | null}
 */
export const mean4dp = (arr) => {
  const finite = (arr ?? []).filter((v) => v != null && Number.isFinite(v));
  return finite.length
    ? Number((finite.reduce((a, b) => a + b, 0) / finite.length).toFixed(4))
    : null;
};

/**
 * Builds a URL from a base string and a params object.
 *
 *   • Skips null / undefined values entirely.
 *   • Serialises arrays as repeated query params (OpenAPI / OpenMeteo style):
 *     e.g. { hourly: ["pm10", "pm2_5"] } → &hourly=pm10&hourly=pm2_5
 *
 * @param   {string} base
 * @param   {Record<string, string | number | string[] | null | undefined>} params
 * @returns {string}
 */
export const buildUrl = (base, params) => {
  const url = new URL(base);

  for (const [key, value] of Object.entries(params)) {
    if (value == null) continue;

    if (Array.isArray(value)) {
      value.forEach((v) => url.searchParams.append(key, String(v)));
    } else {
      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
};


/**
 * Extracts a human-readable message from an error value.
 *
 * @param {Error|string|null|undefined} err
 * @returns {string|null}
 */
export const errorMessage = (err) => {
  if (!err) return null;
  if (err instanceof Error) return err.message;
  return String(err);
};