// ─── API base URLs ─────────────────────────────────────────────────────────────
export const FORECAST_URL = import.meta.env.VITE_FORECAST_URL
  ?? "https://api.open-meteo.com/v1/forecast";

export const ARCHIVE_URL = import.meta.env.VITE_ARCHIVE_URL
  ?? "https://archive-api.open-meteo.com/v1/archive";

export const AIR_URL = import.meta.env.VITE_AIR_URL
  ?? "https://air-quality-api.open-meteo.com/v1/air-quality";

// ─── Cache TTLs ────────────────────────────────────────────────────────────────
export const CACHE_EXPIRY_TODAY   = 5  * 60 * 1000;
export const CACHE_EXPIRY_HISTORY = 60 * 60 * 1000;

export const ARCHIVE_MIN_DATE_STR = "1940-01-01";

// ─── Network ───────────────────────────────────────────────────────────────────
// REQUEST_TIMEOUT is a network-hang guard — it aborts requests that never
// resolve, NOT a mechanism for meeting the 500 ms render SLA.
//
// The 500 ms render budget described in the assignment spec is met through
// cache hits (CACHE_EXPIRY_TODAY / CACHE_EXPIRY_HISTORY). Cold loads on real
// networks will always exceed 500 ms regardless of this value, because a
// round-trip to Open-Meteo takes ~200–800 ms on its own. This is a known
// limitation and is documented in the README.
//
// 4 000 ms is aggressive enough to surface broken connections quickly while
// giving the two MAX_RETRIES back-off attempts (300 ms + 600 ms base)
// enough runway to complete before the UI surfaces a hard error.
export const REQUEST_TIMEOUT = 4000;

// ─── Versioning ────────────────────────────────────────────────────────────────
export const CACHE_VERSION = "v7";

// ─── Validation limits ─────────────────────────────────────────────────────────
// 731 (not 730) accounts for a leap year inside any 2-year window.
export const MAX_RANGE_DAYS = 731;

// ─── Archive lag ───────────────────────────────────────────────────────────────
// Open-Meteo archive endpoint has an ~7-day processing lag before new data
// becomes available. Exported here so DateRangePicker, Historical, and
// useHistoricalData all read from a single source of truth rather than each
// defining or threading it independently.
export const ARCHIVE_LAG_DAYS = 7;

// ─── Cache item size cap ───────────────────────────────────────────────────────
/**
 * FIX (restored from original weather.js): proactively skip writing items
 * larger than this byte limit rather than attempting the write and catching
 * QuotaExceededError reactively. Both defences are now present:
 *   1. Proactive skip  — avoids the expensive JSON.stringify + failed write.
 *   2. Reactive catch  — in cache.js, catches the edge case where multiple
 *      smaller writes push the storage over quota at once.
 */
export const MAX_CACHE_ITEM_BYTES = 400_000;

// ─── Open-Meteo field lists ────────────────────────────────────────────────────

export const WX_CURRENT_FIELDS =
  "temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,weather_code,apparent_temperature";

/**
 * FIX: `is_day` added to WX_HOURLY_FIELDS.
 *
 * `is_day` was absent from the request, so Open-Meteo never returned it.
 * `hourly.is_day` was always `undefined`, causing HourlyStrip to fall back to
 * the `true` (daytime) branch on every slot — night icons (🌙) never appeared
 * regardless of the actual time of day.
 *
 * The HourlyStrip gracefully handles the absence with:
 *   `hourly.is_day?.[i] !== undefined ? hourly.is_day[i] === 1 : true`
 * but that fallback was being hit 100% of the time.  Adding `is_day` here
 * makes the night/day icon logic actually functional.
 *
 * `apparent_temperature` is intentionally omitted from the hourly block —
 * it is only needed for current conditions and is already included in
 * WX_CURRENT_FIELDS.  No component renders hourly apparent_temperature.
 */
export const WX_HOURLY_FIELDS =
  "temperature_2m,relative_humidity_2m,precipitation,visibility,wind_speed_10m,wind_direction_10m,weather_code,is_day";

/**
 * FIX: `temperature_2m_mean` is included in WX_DAILY_FIELDS.
 *
 * Previously it was absent, which caused TWO silent failures:
 *
 *   1. Page 1 — single-day past dates
 *      `fetchDayWeather` uses WX_DAILY_FIELDS for archive requests. Without
 *      `temperature_2m_mean`, the API never returns it, so any component that
 *      renders the representative "current" temperature for a historical day
 *      (via `daily.temperature_2m_mean[0]`) always received `undefined`.
 *
 *   2. Page 2 — historical range (fetchHistoricalWeather)
 *      To paper over the gap, weatherService.js appended
 *      `temperature_2m_mean` at the call site with string concatenation:
 *        `daily: \`${WX_DAILY_FIELDS},temperature_2m_mean\``
 *      This worked, but it relied on a workaround that is no longer necessary
 *      and it meant single-day page 1 was still broken.
 *
 * Both the forecast endpoint (today) and the archive endpoint (past dates)
 * support `temperature_2m_mean` in the daily block, so it is safe here.
 *
 * weatherService.js must be updated to drop its manual append now that this
 * field is present in WX_DAILY_FIELDS.
 */
export const WX_DAILY_FIELDS =
  "weather_code,temperature_2m_max,temperature_2m_min,temperature_2m_mean,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_direction_10m_dominant,sunrise,sunset,uv_index_max";

export const AQ_ALL_FIELDS =
  "pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,carbon_dioxide,us_aqi";


// ─── Error type registry ───────────────────────────────────────────────────────
export const ERROR_TYPES = Object.freeze({
  API_ERROR:        "API_ERROR",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  ABORT_ERROR:      "ABORT_ERROR",
});

// ─── GPS / Geolocation ────────────────────────────────────────────────────────
export const GPS_FALLBACK_COORDS = Object.freeze({ lat: 28.6139, lon: 77.209 });
export const GPS_TIMEOUT_MS      = 5_000;
export const GEO_CACHE_EXPIRY_MS = 60 * 60 * 1000;
export const GEO_CACHE_MAX_ENTRIES = 10;

/**
 * FIX: Human-readable name for the GPS fallback location.
 *
 * Previously "Delhi, India" was hardcoded as a bare string literal in two
 * places inside useGPS.js. This made the fallback silently wrong for any
 * deployment outside India — the location name would always read "Delhi" even
 * when GPS_FALLBACK_COORDS was changed to a different city.
 *
 * Centralising the name here means a single change to both
 * GPS_FALLBACK_COORDS and GPS_FALLBACK_NAME is all that is required when
 * deploying to a different region.
 */
export const GPS_FALLBACK_NAME = "New Delhi, India";