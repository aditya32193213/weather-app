import { useState, useEffect, useRef } from "react";
import { fetchDayWeather }    from "../services/weatherService";
import { weatherSchema, airSchema } from "../schemas/weatherSchema";
import { fetchDayAirQuality } from "../services/airQualityService";


const logDev = (...args) => {
  if (import.meta.env?.DEV) console.log("[useWeatherData]", ...args);
};

/**
 * Fetches and validates weather + air quality data for a single day.
 *
 * Design decisions
 * ────────────────
 * • Both requests are fired in parallel via Promise.allSettled — halves
 *   wall-clock time vs sequential awaits, and one failure never blocks
 *   the other from resolving.
 * • AbortController is created per effect run and aborted on cleanup, so
 *   navigating away or changing coords/date never leaves orphaned requests.
 * • `forceRefresh` is snapshotted at effect-start (not read in finally) to
 *   prevent a race where a second effect triggers before the first cleanup
 *   resets the ref, causing the second request to incorrectly skip the cache.
 * • `tz` is included in the dependency array so that a timezone change
 *   (e.g. GPS resolving to a new IANA timezone) always triggers a fresh
 *   fetch with the correct timezone — no stale-ref workaround needed.
 *
 * Optimistic UI on retry
 * ──────────────────────
 * State is set to null only when an error is confirmed (i.e. the new fetch
 * also fails). On success, the new data simply replaces the old without an
 * intermediate blank state. The loading flags still correctly show the
 * loading indicator.
 *
 * Error standardisation
 * ─────────────────────
 * All weatherError / airError values are proper Error instances so consumers
 * can always access `.message` and PropTypes.instanceOf(Error) passes cleanly.
 *
 * @param {{ lat: number, lon: number } | null} coords
 * @param {string}   dateStr        "YYYY-MM-DD"
 * @param {string}   tz             IANA timezone or "auto"
 * @param {number}   retryCount     Increment this from outside to trigger a retry
 * @param {{ current: boolean }} forceRefreshRef  Ref whose `.current` signals a cache bypass
 */
export function useWeatherData(coords, dateStr, tz, retryCount, forceRefreshRef) {
  const [weatherData,    setWeatherData]    = useState(null);
  const [airData,        setAirData]        = useState(null);

  // FIX (MEDIUM): Was initialised to `true`, which caused a phantom loading
  // state while GPS was still resolving. The effect hits the early return
  // (!coords || !tz) before ever calling setWeatherLoading(true), so the
  // flags stayed `true` indefinitely — showing a permanent spinner with no
  // indication that the app was waiting on GPS, not an API.
  // Initialising to `false` ensures the UI only shows a loading state when a
  // real fetch has actually started. In Home.jsx, derive the combined loading
  // state as `gpsLoading || weatherLoading` for the aria-busy / skeleton.
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [airLoading,     setAirLoading]     = useState(false);

  const [weatherError,   setWeatherError]   = useState(null);
  const [airError,       setAirError]       = useState(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!coords?.lat || !coords?.lon || !tz) {
      return;
    }

    const requestId  = ++requestIdRef.current;
    const controller = new AbortController();

    const fetchData = async () => {
      setWeatherLoading(true);
      setAirLoading(true);
      // Optimistic UI: do NOT null-out weatherData/airData here.
      // The loading flags above are sufficient to show the loading indicator;
      // the previous data remains visible until the new fetch either succeeds
      // or fails.
      setWeatherError(null);
      setAirError(null);

      const forceRefresh = forceRefreshRef?.current;
      if (forceRefreshRef) forceRefreshRef.current = false;

      try {
        const [weatherRes, airRes] = await Promise.allSettled([
          fetchDayWeather(
            coords.lat,
            coords.lon,
            dateStr,
            tz,
            controller.signal,
            forceRefresh,
          ),
          fetchDayAirQuality(
            coords.lat,
            coords.lon,
            dateStr,
            tz,
            controller.signal,
            forceRefresh,
          ),
        ]);

        // Discard the result if a newer effect has already started.
        if (requestId !== requestIdRef.current) return;

        // ── Weather ──────────────────────────────────────────────────────────

        if (weatherRes.status === "fulfilled") {
          const result = weatherRes.value;

          if (result.error?.type === "ABORT_ERROR") {
            // ignore abort
          } else if (result.error || !result.data) {
            const msg = result.error?.message || "Invalid weather data received.";
            setWeatherError(new Error(msg));
            setWeatherData(null);
          } else {
            const parsed = weatherSchema.safeParse(result.data);
            if (!parsed.success) {
              setWeatherError(new Error("Weather API returned unexpected data."));
              setWeatherData(null);
            } else {
              setWeatherData(parsed.data);
            }
          }
        } else {
          if (weatherRes.reason?.name !== "AbortError") {
            setWeatherError(new Error("Weather request failed"));
          }
        }

        // ── Air quality ──────────────────────────────────────────────────────

        if (airRes.status === "fulfilled") {
          const result = airRes.value;

          if (result.error?.type === "ABORT_ERROR") {
            // ignore abort
          } else if (result.error || !result.data) {
            const msg = result.error?.message || "Air quality API failed.";
            setAirError(new Error(msg));
            setAirData(null);
          } else {
            const parsedAir = airSchema.safeParse(result.data);
            if (!parsedAir.success) {
              setAirError(new Error("Air quality API returned unexpected data."));
              setAirData(null);
            } else {
              setAirData(parsedAir.data);
            }
          }
        } else {
          if (airRes.reason?.name !== "AbortError") {
            setAirError(new Error("Air quality request failed"));
          }
        }
      } catch (err) {
        // AbortError means the component unmounted or deps changed — discard silently.
        if (err?.name === "AbortError") return;

        logDev("Parallel weather/AQ fetch failed:", err);
        setWeatherError((prev) => prev || new Error("Failed to load weather data."));
        setAirError((prev) => prev || new Error("Failed to load air quality data."));
      } finally {
        // NOTE: No abort check here — that belongs in catch, not finally.
        // return inside finally would silently suppress any in-flight exception.
        if (requestId === requestIdRef.current) {
          setWeatherLoading(false);
          setAirLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // forceRefreshRef is intentionally omitted: refs have stable identity.
    // tz is included so a timezone change (GPS resolving) triggers a fresh fetch.
  }, [coords?.lat, coords?.lon, dateStr, tz, retryCount]);

  return {
    weatherData,
    airData,
    weatherLoading,
    airLoading,
    weatherError,
    airError,
    hasWeather: !!weatherData,
    hasAir:     !!airData,
    isEmpty:    !weatherData && !airData,
  };
}