import { apiFetch }       from "../api/apiClient";
import { fetchWithCache } from "../api/cache";
import { buildUrl, roundCoord, extractHour, mean4dp } from "../utils/helpers";
import { isValidServiceResult, toServiceError, abortedResult } from "../utils/serviceUtils";
import {
  AIR_URL,
  AQ_ALL_FIELDS,
  CACHE_EXPIRY_TODAY,
  CACHE_EXPIRY_HISTORY,
  CACHE_VERSION,
  ERROR_TYPES,
} from "../utils/constants";
import { normalizeTimezone, resolveTimezone, getTzDateStr } from "../utils/timezone";
import { isValidCoord, isValidDateRange }                  from "../utils/validation";

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Picks one slot of AQ readings from the flat hourly arrays object at index `i`.
 * Returns null for any field not present in the response.
 */
const pickAirQualitySlot = (hourly, i) => ({
  pm10:             hourly.pm10?.[i]             ?? null,
  pm2_5:            hourly.pm2_5?.[i]            ?? null,
  carbon_monoxide:  hourly.carbon_monoxide?.[i]  ?? null,
  nitrogen_dioxide: hourly.nitrogen_dioxide?.[i] ?? null,
  sulphur_dioxide:  hourly.sulphur_dioxide?.[i]  ?? null,
  carbon_dioxide:   hourly.carbon_dioxide?.[i]   ?? null,
  us_aqi:           hourly.us_aqi?.[i]           ?? null,
});

// ─── Single-day air quality ───────────────────────────────────────────────────

/**
 * Fetches air quality data for a single day.
 *
 * For "today" it requests a `current` block (live readings for the current hour)
 * plus the full hourly series. For past dates it uses the archive endpoint and
 * synthesises a "current" snapshot from the noon-hour slot (index where hour = 12).
 *
 * Results are cached per {lat, lon, date, tz}:
 *   • Today:      short TTL (CACHE_EXPIRY_TODAY  — 5 min)
 *   • Historical: long  TTL (CACHE_EXPIRY_HISTORY — 60 min)
 *
 * @param   {number}      lat
 * @param   {number}      lon
 * @param   {string}      date          "YYYY-MM-DD"
 * @param   {string}      [timezone]
 * @param   {AbortSignal} [signal]
 * @param   {boolean}     [forceRefresh]
 * @returns {Promise<{ data: object|null, error: object|null }>}
 */
export async function fetchDayAirQuality(
  lat,
  lon,
  date,
  timezone     = "auto",
  signal       = null,
  forceRefresh = false,
) {
  if (!isValidCoord(lat, lon)) {
    return {
      data:  null,
      error: { message: "Invalid coordinates", type: ERROR_TYPES.VALIDATION_ERROR },
    };
  }

  if (!date) {
    return {
      data:  null,
      error: { message: "Date is required", type: ERROR_TYPES.VALIDATION_ERROR },
    };
  }

  const rLat = roundCoord(lat);
  const rLon = roundCoord(lon);
  const tz   = normalizeTimezone(timezone);

  const todayStr    = getTzDateStr(tz);
  const isToday     = date === todayStr;
  const cacheKey    = `${CACHE_VERSION}_air_${rLat}_${rLon}_${date}_${tz}`;
  const cacheExpiry = isToday ? CACHE_EXPIRY_TODAY : CACHE_EXPIRY_HISTORY;

  return fetchWithCache(
    cacheKey,
    async () => {
      if (signal?.aborted) return abortedResult();

      try {
        const params = isToday
          ? {
              latitude:  rLat,
              longitude: rLon,
              timezone:  tz,
              current:   AQ_ALL_FIELDS,
              hourly:    AQ_ALL_FIELDS,
            }
          : {
              latitude:   rLat,
              longitude:  rLon,
              start_date: date,
              end_date:   date,
              timezone:   tz,
              hourly:     AQ_ALL_FIELDS,
            };

        // FIX: forceRefresh forwarded to apiFetch — adds Cache-Control: no-cache
        // when true so the Retry button bypasses any stale proxy/CDN cache.
        const data = await apiFetch(buildUrl(AIR_URL, params), signal, forceRefresh);

        // FIX: For historical dates, synthesise a "current" snapshot from the noon
        // slot without mutating the original API response object. Spread into a
        // new object so the cached value is never modified after storage.
        if (!isToday && data?.hourly?.time?.length) {
          const noonIdx = data.hourly.time.findIndex((t) => extractHour(t) === 12);
          const i       = noonIdx >= 0 ? noonIdx : 0;
          return {
            data: { ...data, current: pickAirQualitySlot(data.hourly, i) },
            error: null,
          };
        }

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
}

// ─── Current-hour AQ snapshot ─────────────────────────────────────────────────

/**
 * Returns the AQ reading for the current hour from an already-fetched hourly
 * dataset. Does not make a network request.
 *
 * @param   {object} airData   Full AQ response object (must contain `hourly.time`).
 * @param   {string} [timezone]
 * @returns {object | null}
 */
export function getCurrentAirQuality(airData, timezone = "auto") {
  if (!airData?.hourly?.time?.length) return null;

  const tz = resolveTimezone(timezone);

  const currentHourStr = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    hour:     "2-digit",
    hour12:   false,
  }).format(new Date());

  // "en-GB" can return "24" at midnight in some environments — normalise to 0.
  const currentHour =
    currentHourStr === "24" ? 0 : parseInt(currentHourStr, 10);

  const index = airData.hourly.time.findIndex(
    (t) => extractHour(t) === currentHour,
  );

  return pickAirQualitySlot(airData.hourly, index >= 0 ? index : 0);
}

// ─── Aggregate hourly AQ → daily averages ────────────────────────────────────

/**
 * Aggregates hourly pm10 / pm2_5 readings into daily averages aligned with
 * a provided array of date strings.
 *
 * Builds the date → [indices] lookup in a single O(n) pass over the time array
 * instead of filtering once per date, which would be O(n × dates).
 *
 * @param   {object}   hourlyData   { time: string[], pm10: number[], pm2_5: number[] }
 * @param   {string[]} dailyDates   ["YYYY-MM-DD", …]
 * @returns {{ pm10: (number|null)[], pm2_5: (number|null)[] } | null}
 */
export function aggregateAQHourlyToDaily(hourlyData, dailyDates) {
  if (!hourlyData?.time?.length || !dailyDates?.length) return null;

  // Single-pass index map: date string → array of hourly indices for that date.
  const dateIndexMap = new Map();
  for (const [i, t] of hourlyData.time.entries()) {
    const date = String(t).slice(0, 10);
    if (!dateIndexMap.has(date)) dateIndexMap.set(date, []);
    dateIndexMap.get(date).push(i);
  }

  const pm10Daily = [];
  const pm25Daily = [];

  for (const date of dailyDates) {
    const indices = dateIndexMap.get(date) ?? [];

    if (!indices.length) {
      pm10Daily.push(null);
      pm25Daily.push(null);
      continue;
    }

    // Added Number.isFinite guard alongside != null to exclude NaN and
    // ±Infinity values that would corrupt the mean calculation.
    const pm10Vals = indices.map((i) => hourlyData.pm10?.[i]).filter((v) => v != null && Number.isFinite(v));
    const pm25Vals = indices.map((i) => hourlyData.pm2_5?.[i]).filter((v) => v != null && Number.isFinite(v));

    pm10Daily.push(mean4dp(pm10Vals));
    pm25Daily.push(mean4dp(pm25Vals));
  }

  return { pm10: pm10Daily, pm2_5: pm25Daily };
}

// ─── Historical AQ (multi-day range) ─────────────────────────────────────────

/**
 * Fetches hourly pm10 / pm2_5 over a date range for trend-analysis charts.
 *
 * Only requests the two pollutant fields needed for historical trending —
 * requesting all AQ fields over a multi-day range would produce unnecessarily
 * large payloads.
 *
 * @param   {number}      lat
 * @param   {number}      lon
 * @param   {string}      startDate    "YYYY-MM-DD"
 * @param   {string}      endDate      "YYYY-MM-DD"
 * @param   {string}      [timezone]
 * @param   {AbortSignal} [signal]
 * @param   {boolean}     [forceRefresh]
 * @returns {Promise<{ data: object|null, error: object|null }>}
 */
export async function fetchHistoricalAirQuality(
  lat,
  lon,
  startDate,
  endDate,
  timezone     = "auto",
  signal       = null,
  forceRefresh = false,
) {
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
    `${CACHE_VERSION}_air_hist_${rLat}_${rLon}_${startDate}_${endDate}_${tz}`;

  return fetchWithCache(
    cacheKey,
    async () => {
      if (signal?.aborted) return abortedResult();

      try {
        const params = {
          latitude:   rLat,
          longitude:  rLon,
          start_date: startDate,
          end_date:   endDate,
          timezone:   tz,
          hourly:     "pm10,pm2_5",
        };

        const data = await apiFetch(buildUrl(AIR_URL, params), signal, forceRefresh);
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
}