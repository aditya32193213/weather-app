import { apiFetch }       from "../api/apiClient";
import { fetchWithCache } from "../api/cache";
import { buildUrl, roundCoord } from "../utils/helpers";
import { isValidServiceResult, toServiceError, abortedResult } from "../utils/serviceUtils";
import {
  FORECAST_URL,
  ARCHIVE_URL,
  WX_CURRENT_FIELDS,
  WX_HOURLY_FIELDS,
  WX_DAILY_FIELDS,
  CACHE_EXPIRY_TODAY,
  CACHE_EXPIRY_HISTORY,
  CACHE_VERSION,
  ERROR_TYPES,
} from "../utils/constants";
import { normalizeTimezone, getTzDateStr } from "../utils/timezone";
import { isValidCoord, isValidDateRange, isValidDateStr } from "../utils/validation";

// ─── Single-day weather ───────────────────────────────────────────────────────

/**
 * Fetches weather data for a single day, with localStorage caching.
 *
 * Routing logic:
 *   • "today"      → forecast endpoint (includes live `current` conditions block)
 *   • past dates   → archive endpoint  (no `current` block; hourly + daily only)
 *
 * Explicit API contract params added to every request:
 *   • forecast_days=1      — minimum valid value; prevents HTTP 400 on forecast endpoint
 *   • wind_speed_unit=kmh  — explicit unit regardless of server default
 *   • precipitation_unit=mm — explicit unit regardless of server default
 *
 * Results are cached per {lat, lon, date, tz}:
 *   • Today:      short TTL (CACHE_EXPIRY_TODAY   — 5 min,  live data)
 *   • Historical: long  TTL (CACHE_EXPIRY_HISTORY — 60 min, immutable)
 *
 * @param   {number}      lat
 * @param   {number}      lon
 * @param   {string}      date          "YYYY-MM-DD"
 * @param   {string}      [timezone]
 * @param   {AbortSignal} [signal]
 * @param   {boolean}     [forceRefresh]
 * @returns {Promise<{ data: object|null, error: object|null }>}
 */
export const fetchDayWeather = async (
  lat,
  lon,
  date,
  timezone     = "auto",
  signal       = null,
  forceRefresh = false,
) => {
  if (!isValidCoord(lat, lon)) {
    return {
      data: null,
      error: { message: "Invalid coordinates", type: ERROR_TYPES.VALIDATION_ERROR },
    };
  }

  if (!isValidDateStr(date)) {
    return {
      data: null,
      error: {
        message: `Invalid date: "${date}". Expected YYYY-MM-DD format.`,
        type: ERROR_TYPES.VALIDATION_ERROR,
      },
    };
  }

  const rLat = roundCoord(lat);
  const rLon = roundCoord(lon);
  const tz   = normalizeTimezone(timezone);

  const todayStr = getTzDateStr(tz);
  const isToday  = date === todayStr;

  const cacheKey    = `${CACHE_VERSION}_wx_${rLat}_${rLon}_${date}_${tz}`;
  const cacheExpiry = isToday ? CACHE_EXPIRY_TODAY : CACHE_EXPIRY_HISTORY;

  return fetchWithCache(
    cacheKey,
    async () => {
      if (signal?.aborted) return abortedResult();

      try {
        const baseUrl = isToday ? FORECAST_URL : ARCHIVE_URL;

        // FIX: Added explicit contract params to both branches.
        // forecast_days=1 is the API minimum for the forecast endpoint.
        // wind_speed_unit and precipitation_unit are explicit so charts
        // always receive consistent units regardless of server defaults.
        const params = isToday
          ? {
              latitude:           rLat,
              longitude:          rLon,
              timezone:           tz,
              forecast_days:      1,
              wind_speed_unit:    "kmh",
              precipitation_unit: "mm",
              current:            WX_CURRENT_FIELDS,
              hourly:             WX_HOURLY_FIELDS,
              daily:              WX_DAILY_FIELDS,
            }
          : {
              latitude:           rLat,
              longitude:          rLon,
              timezone:           tz,
              wind_speed_unit:    "kmh",
              precipitation_unit: "mm",
              start_date:         date,
              end_date:           date,
              hourly:             WX_HOURLY_FIELDS,
              daily:              WX_DAILY_FIELDS,
            };

        // FIX: forceRefresh is now forwarded to apiFetch so it can add the
        // Cache-Control: no-cache header — bypassing CDN / proxy caches on retry.
        const data = await apiFetch(buildUrl(baseUrl, params), signal, forceRefresh);
        return { data, error: null };
      } catch (err) {
        if (err?.name === "AbortError") {
          return abortedResult();
        }
        return { data: null, error: toServiceError(err) };
      }
    },
    { cacheExpiry, forceRefresh, validate: isValidServiceResult },
  );
};

// ─── Multi-day historical weather ────────────────────────────────────────────

/**
 * Fetches historical daily weather data over an arbitrary date range.
 *
 * Differences from `fetchDayWeather`
 * ────────────────────────────────────
 * • Always uses the archive endpoint.
 * • Only requests `daily` fields — no `current` or `hourly` data.
 *   (Hourly over a 2-year range produces ~17 500 rows, not needed for Page 2.)
 * • Cache key uses `wx_hist_` prefix to namespace historical range entries
 *   away from single-day `wx_` entries so they never collide.
 *
 * @param   {number}      lat
 * @param   {number}      lon
 * @param   {string}      startDate     "YYYY-MM-DD"
 * @param   {string}      endDate       "YYYY-MM-DD"
 * @param   {string}      [timezone]
 * @param   {AbortSignal} [signal]
 * @param   {boolean}     [forceRefresh]
 * @returns {Promise<{ data: object|null, error: object|null }>}
 */
export const fetchHistoricalWeather = async (
  lat,
  lon,
  startDate,
  endDate,
  timezone     = "auto",
  signal       = null,
  forceRefresh = false,
) => {
  if (!isValidCoord(lat, lon)) {
    return {
      data:  null,
      error: { message: "Invalid coordinates", type: ERROR_TYPES.VALIDATION_ERROR },
    };
  }

  if (!isValidDateRange(startDate, endDate)) {
    return {
      data:  null,
      error: {
        message: "Date range is invalid or exceeds the 2-year maximum",
        type:    ERROR_TYPES.VALIDATION_ERROR,
      },
    };
  }

  const rLat = roundCoord(lat);
  const rLon = roundCoord(lon);
  const tz   = normalizeTimezone(timezone);

  const cacheKey =
    `${CACHE_VERSION}_wx_hist_${rLat}_${rLon}_${startDate}_${endDate}_${tz}`;

  return fetchWithCache(
    cacheKey,
    async () => {
      if (signal?.aborted) return abortedResult();

      try {
        // FIX: Added explicit wind_speed_unit and precipitation_unit so
        // historical charts always receive consistent units.
        const params = {
          latitude:           rLat,
          longitude:          rLon,
          timezone:           tz,
          wind_speed_unit:    "kmh",
          precipitation_unit: "mm",
          start_date:         startDate,
          end_date:           endDate,
          daily:              WX_DAILY_FIELDS,
        };

        // FIX: forceRefresh forwarded to apiFetch — Cache-Control: no-cache on retry.
        const data = await apiFetch(buildUrl(ARCHIVE_URL, params), signal, forceRefresh);
        return { data, error: null };
      } catch (err) {
        if (err?.name === "AbortError") {
          return abortedResult();
        }
        return { data: null, error: toServiceError(err) };
      }
    },
    { cacheExpiry: CACHE_EXPIRY_HISTORY, forceRefresh, validate: isValidServiceResult },
  );
};