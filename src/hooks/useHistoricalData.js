import { useState, useCallback, useRef, useEffect } from "react";
import dayjs from "dayjs";
import { fetchHistoricalWeather }                              from "../services/weatherService";
import { fetchHistoricalAirQuality }                          from "../services/airQualityService";
import { useGPSContext }                                       from "../context/GPSContext";
import { historicalWeatherSchema, historicalAirQualitySchema } from "../schemas/weatherSchema";
import { isValidDateRange }                                    from "../utils/validation";
import { ARCHIVE_LAG_DAYS }                                    from "../utils/constants";

/**
 * Manages all data-fetching concerns for the Historical page:
 * - fetch lifecycle (loading, error, abort)
 * - race-condition guard via fetchIdRef
 * - today's date with midnight refresh
 *
 * Uses Promise.allSettled so a CAMS air quality outage never blocks the
 * weather charts from rendering. Weather is treated as critical (sets error
 * state on failure); air quality is non-critical (silently sets airData to
 * null so the AQ chart shows "unavailable" without hiding everything else).
 *
 * @returns {{
 *   weatherData: object|null,
 *   airData: object|null,
 *   weatherLoading: boolean,
 *   airLoading: boolean,
 *   error: string|null,
 *   fetchedRange: object|null,
 *   isStale: boolean,
 *   setIsStale: function,
 *   today: Date,
 *   doFetch: function,
 *   ARCHIVE_LAG_DAYS: number,
 * }}
 */
export function useHistoricalData() {
  const { coords, timezone } = useGPSContext();

  const [weatherData,    setWeatherData]    = useState(null);
  const [airData,        setAirData]        = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [airLoading,     setAirLoading]     = useState(false);
  const [error,          setError]          = useState(null);
  const [fetchedRange,   setFetchedRange]   = useState(null);
  const [isStale,        setIsStale]        = useState(false);

  const fetchIdRef   = useRef(0);
  const abortCtrlRef = useRef(null);

  // ── Midnight refresh ────────────────────────────────────────────────────────
  // Self-scheduling with an empty dep array — avoids the circular dependency
  // that arises when [today] is in the dep list (each update reschedules,
  // which updates today, which reschedules again).
  const [today, setToday] = useState(() => new Date());
  useEffect(() => {
    let t;
    const schedule = () => {
      const ms = dayjs().endOf("day").diff(dayjs()) + 1;
      t = setTimeout(() => {
        setToday(new Date());
        schedule();
      }, ms);
    };
    schedule();
    return () => clearTimeout(t);
  }, []); // empty deps — self-scheduling handles re-arming

  // ── Abort on unmount ────────────────────────────────────────────────────────
  useEffect(() => {
    return () => { abortCtrlRef.current?.abort(); };
  }, []);

  // ── Core fetch ──────────────────────────────────────────────────────────────
  const doFetch = useCallback(async (start, end, forceRefresh= false) => {
    const sDate = dayjs(start).format("YYYY-MM-DD");
    const eDate = dayjs(end).format("YYYY-MM-DD");

    if (!isValidDateRange(sDate, eDate)) {
      setError("Date range cannot exceed 2 years.");
      return;
    }
    if (!coords) return;

    abortCtrlRef.current?.abort();
    const controller = new AbortController();
    abortCtrlRef.current = controller;

    const id = ++fetchIdRef.current;

    setWeatherLoading(true);
    setAirLoading(true);
    setError(null);
    setIsStale(false);

    try {
      // Promise.allSettled — a CAMS air quality failure never blocks weather.
      // Weather is critical; air quality is non-critical (silent failure).
      const [weatherRes, airRes] = await Promise.allSettled([
        fetchHistoricalWeather(
          coords.lat, coords.lon, sDate, eDate, timezone, controller.signal, forceRefresh,
        ),
        fetchHistoricalAirQuality(
          coords.lat, coords.lon, sDate, eDate, timezone, controller.signal, forceRefresh, 
        ),
      ]);

      if (id !== fetchIdRef.current) return;

      // ── Weather (critical) ───────────────────────────────────────────────
      if (weatherRes.status === "rejected") {
        setError("Failed to fetch weather data. Please try again.");
        setWeatherData(null);
      } else if (weatherRes.value.error) {
        setError(weatherRes.value.error.message ?? "Failed to fetch weather data.");
        setWeatherData(null);
      } else {
        const parsed = historicalWeatherSchema.safeParse(weatherRes.value.data);
        if (!parsed.success) {
          setError("Unexpected weather data format received from API.");
          setWeatherData(null);
        } else {
          setWeatherData(parsed.data);
          setFetchedRange({
            start: sDate,
            end:   eDate,
            days:  dayjs(end).diff(dayjs(start), "day") + 1,
          });
        }
      }

      // ── Air quality (non-critical — silent failure) ──────────────────────
      // A null airData causes the AQ chart to show "unavailable" without
      // surfacing an error banner or hiding the weather charts.
      if (
        airRes.status !== "rejected" &&
        !airRes.value?.error
      ) {
        const airParsed = historicalAirQualitySchema.safeParse(airRes.value.data);
        setAirData(airParsed.success ? airParsed.data : null);
      } else {
        setAirData(null);
      }
    } catch (err) {
      if (err?.name !== "AbortError") {
        setError("Failed to fetch data. Please try again.");
      }
    } finally {
      if (id === fetchIdRef.current) {
        setWeatherLoading(false);
        setAirLoading(false);
      }
    }
  }, [coords?.lat, coords?.lon, timezone]);

  return {
    weatherData,
    airData,
    weatherLoading,
    airLoading,
    error,
    fetchedRange,
    isStale,
    setIsStale,
    today,
    doFetch,
    ARCHIVE_LAG_DAYS,
  };
}