// FIX (🟢 TIER 3): Upgraded from 8-direction to 16-direction compass.
//
// 8-direction uses 45° segments — each label covers a ±22.5° arc.
// At the boundaries (e.g. 20° reports "NE" when it's clearly "NNE") this
// is noticeably imprecise for wind-rose displays.
//
// 16-direction uses 22.5° segments — each label covers a ±11.25° arc,
// giving twice the angular resolution without any added complexity.
// The calculation is identical: divide by the segment size (22.5°) and
// modulo by the direction count (16).
export const COMPASS_DIRECTIONS = [
  "N", "NNE", "NE", "ENE",
  "E", "ESE", "SE", "SSE",
  "S", "SSW", "SW", "WSW",
  "W", "WNW", "NW", "NNW",
];

/**
 * Converts a wind bearing in degrees to a 16-point compass direction.
 *
 * @param   {number | null | undefined} deg  Wind direction in degrees (0–360).
 * @returns {string}                          e.g. "NNE", "SW", or "—" for null input.
 *
 * @example
 * degreesToCompass(0)    // "N"
 * degreesToCompass(180)  // "S"
 * degreesToCompass(22)   // "NNE"
 * degreesToCompass(null) // "—"
 */
export function degreesToCompass(deg) {
  if (deg == null) return "—";
  // Normalise to [0, 360), divide into 16 equal 22.5° segments.
  return COMPASS_DIRECTIONS[Math.round(((deg % 360) + 360) / 22.5) % 16];
}