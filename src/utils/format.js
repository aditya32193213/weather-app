/**
 * Formats a weather value for display.
 *
 * @param {number|null|undefined} value   The raw value to format.
 * @param {string}                type    One of: "temp" | "aqi" | "percent" | "wind" | "number"
 * @param {string}                [unit]  Dual-purpose unit string:
 *                                          • type === "temp"  → temperature unit: "C" (default) or "F"
 *                                          • type === "wind"  → speed unit: "km/h" (default) or "m/s", "mph", etc.
 *                                        Ignored for all other types.
 * @returns {string}  Formatted string, or "—" for null/undefined/NaN input.
 *
 * FIX (NaN guard): Added `Number.isNaN(value)` guard before the switch.
 *
 *   `NaN == null` evaluates to `false` in JavaScript — NaN is not null or
 *   undefined, so it passes the existing null check silently. Every branch of
 *   the switch then produces a misleading string:
 *     "temp"    → "NaN°C"   (toFixed(1) on NaN returns the string "NaN")
 *     "aqi"     → "NaN"     (String(Math.round(NaN)))
 *     "percent" → "NaN%"
 *     "wind"    → "NaN km/h"
 *     "number"  → "NaN"
 *
 *   These strings are rendered directly in UI cards, which would show "NaN°C"
 *   to users whenever the API returns a missing sensor reading (null in the
 *   array that then gets coerced via some upstream arithmetic to NaN).
 *
 *   The fix treats NaN identically to null/undefined — return the em-dash
 *   placeholder "—" so the UI renders a clean "no data" indicator.
 *
 * FIX (wind unit): The `wind` case previously hardcoded "km/h", making it
 *   impossible to render speeds in m/s or mph without duplicating the formatter.
 *
 *   The `unit` parameter is now repurposed for wind when type === "wind":
 *     formatValue(val, "wind")          → "12.3 km/h"   (default)
 *     formatValue(val, "wind", "m/s")   → "3.4 m/s"
 *     formatValue(val, "wind", "mph")   → "7.6 mph"
 *
 *   Backward compatibility: existing callers that pass no third argument
 *   continue to receive "km/h" output — the default is preserved.
 *   Callers that pass `unit="C"` (the temperature default, which is meaningless
 *   for wind) are treated as "no unit override" and also receive "km/h".
 *   This covers the case where a caller accidentally forwards the temperature
 *   unit parameter to a wind formatter call.
 */
export const formatValue = (value, type, unit = "C") => {
  // FIX: NaN bypasses `value == null` because NaN !== null and NaN !== undefined.
  // Must check explicitly. Both conditions together cover all "missing value" cases:
  //   null / undefined  → value == null  (true)
  //   NaN               → Number.isNaN() (true)
  if (value == null || Number.isNaN(value)) return "—";

  switch (type) {
    case "temp":
      return `${value.toFixed(1)}°${unit}`;

    case "aqi":
      return String(Math.round(value));

    case "percent":
      return `${Math.round(value)}%`;

    case "wind": {
      // FIX: was hardcoded "km/h". Now respects the `unit` param.
      // "C" is the temperature default — treat as sentinel meaning "not set",
      // and fall back to the wind default "km/h". Any other value is used as-is.
      const speedUnit = !unit || unit === "C" ? "km/h" : unit;
      return `${value.toFixed(1)} ${speedUnit}`;
    }

    case "number":
      return value.toFixed(1);

    default:
      return String(value);
  }
};


/**
 * Converts Celsius to Fahrenheit.
 * Returns null if input is null/undefined.
 *
 * @param {number|null} c
 * @returns {number|null}
 */
export const toFahrenheit = (c) =>
  c != null ? parseFloat(((c * 9) / 5 + 32).toFixed(1)) : null;


/**
 * Formats a cache age in milliseconds to a human-readable string.
 * e.g. 90000 → "1m ago", 7200000 → "2h ago"
 *
 * @param {number} ms
 * @returns {string}
 */
export const formatCacheAge = (ms) => {
  const mins = Math.round(ms / 60_000);
  if (mins < 60) return `${mins}m ago`;
  return `${Math.round(mins / 60)}h ago`;
}