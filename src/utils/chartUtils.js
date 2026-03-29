const VALID_METHODS = new Set(["avg", "max", "min", "sum", "first", "circularAvg"]);

/**
 * Downsamples an array by aggregating groups of `factor` elements.
 *
 * Supported aggregation methods
 * ──────────────────────────────
 *   "avg"         — arithmetic mean of finite values in each chunk  (default)
 *   "max"         — maximum finite value in each chunk
 *   "min"         — minimum finite value in each chunk
 *   "sum"         — sum of finite values in each chunk
 *   "first"       — first raw value (including null / NaN)
 *   "circularAvg" — mean angle for circular data (e.g. wind direction, 0–360°)
 *
 * Edge-case behaviour
 * ────────────────────
 *   • Non-finite values are excluded from numeric aggregations.
 *   • Chunks where all values are non-finite return null (not 0).
 *   • An unknown method throws TypeError immediately rather than falling back
 *     silently to "avg", which would produce misleading chart data.
 *   • factor = 1 returns a shallow copy to prevent unintentional mutation of
 *     the original array by downstream consumers.
 *
 * @param   {(number|null)[]} arr
 * @param   {number}          factor   Group size; must be a positive integer ≥ 1.
 * @param   {"avg"|"max"|"min"|"sum"|"first"|"circularAvg"} [method="avg"]
 * @returns {(number|null)[]}
 * @throws  {RangeError}   If `factor` is not a positive integer.
 * @throws  {TypeError}    If `method` is not one of the supported strings.
 */
export const downsample = (arr, factor, method = "avg") => {
  if (!arr?.length) return arr ?? [];

  const step = Math.floor(factor);
  if (!Number.isFinite(step) || step < 1) {
    throw new RangeError(
      `downsample: factor must be a positive integer ≥ 1, got ${factor}`,
    );
  }

  if (!VALID_METHODS.has(method)) {
    throw new TypeError(
      `downsample: unknown method "${method}". ` +
      `Supported methods: ${[...VALID_METHODS].join(", ")}`,
    );
  }

  // Return a shallow copy so callers that skip downsampling still get an
  // independent array and cannot accidentally mutate the source.
  if (step === 1) return arr.slice();

  const result = [];

  for (let i = 0; i < arr.length; i += step) {
    const rawChunk = arr.slice(i, i + step);

    // "first" preserves the raw value — no filtering.
    if (method === "first") {
      result.push(rawChunk[0] ?? null);
      continue;
    }

    // Exclude non-finite values (null, NaN, ±Infinity) from numeric aggregations.
    const chunk = rawChunk.filter((v) => Number.isFinite(v));

    if (!chunk.length) {
      result.push(null);
      continue;
    }

    switch (method) {
      // FIX (MEDIUM): Math.max(...chunk) and Math.min(...chunk) use the spread
      // operator, which routes through the JS engine's function-argument stack.
      // This throws RangeError: Maximum call stack size exceeded at ~125,000
      // elements. While 24-point hourly arrays are safe today, this utility
      // advertises itself as general-purpose — calling it with a year of
      // minute-level data (525,600 points) would silently crash.
      // Using reduce() iterates without touching the call stack, so there is
      // no upper bound on array size.
      case "max":
        result.push(chunk.reduce((a, b) => (b > a ? b : a), chunk[0]));
        break;

      case "min":
        result.push(chunk.reduce((a, b) => (b < a ? b : a), chunk[0]));
        break;

      case "sum":
        result.push(chunk.reduce((a, b) => a + b, 0));
        break;

      case "circularAvg": {
        // Circular mean correctly handles the 359°→1° wraparound that a simple
        // arithmetic mean would get catastrophically wrong (average = 180°).
        const toRad  = (deg) => (deg * Math.PI) / 180;
        const sinSum = chunk.reduce((s, v) => s + Math.sin(toRad(v)), 0);
        const cosSum = chunk.reduce((s, v) => s + Math.cos(toRad(v)), 0);
        const angle  =
          Math.atan2(sinSum / chunk.length, cosSum / chunk.length) *
          (180 / Math.PI);
        result.push((angle + 360) % 360);
        break;
      }

      default: {
        // "avg"
        result.push(chunk.reduce((a, b) => a + b, 0) / chunk.length);
      }
    }
  }

  return result;
};