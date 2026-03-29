import { useState, useCallback, useMemo, useRef } from "react";
import { useGPSContext }       from "../context/GPSContext";
import { useWeatherData }      from "../hooks/useWeatherData";
import { useDebounce }         from "../hooks/useDebounce";
import { toFahrenheit }        from "../utils/format";
import { localDateStr }        from "../utils/timezone";
import { errorMessage }        from "../utils/helpers";
import { getCurrentAirQuality } from "../services/airQualityService";

/**
 * Encapsulates all state and derived values for the Home page:
 * - GPS context consumption (including coordsCacheAge for the GPS badge)
 * - Date selection + isToday derivation
 * - Stable coord/timezone memos (prevent unnecessary refetches)
 * - Temperature unit + conversion
 * - Fetch retry logic
 * - Derived data slices (hourly, daily, current, airHourly)
 * - Aggregated loading/error flags
 *
 * Home.jsx is left as a pure composition layer with no logic of its own.
 */
export function useHomeState() {
  const [date, setDate] = useState(new Date());

  const {
    coords,
    coordsCacheAge,
    locationName,
    timezone: tz,
    error:    gpsError,
    gpsDetected,
    gpsLoading,
  } = useGPSContext();

  // ── Debounced date ──────────────────────────────────────────────────────────
  const debouncedDate = useDebounce(date, 200);

  // ── Date derivation ─────────────────────────────────────────────────────────
  const { dateStr, isToday } = useMemo(() => {
    const str      = localDateStr(debouncedDate, tz);
    const todayStr = localDateStr(new Date(), tz);
    return { dateStr: str, isToday: str === todayStr };
  }, [debouncedDate, tz]);

  // ── Stable primitives for useWeatherData ────────────────────────────────────
  // FIX (MEDIUM): The previous guard `tz && tz !== "auto" ? tz : null` was
  // fragile — if useGPS ever returned "auto" (e.g. a regression), stableTz
  // would be null and weatherLoading would stay true forever, since the effect
  // in useWeatherData bails on !tz without ever setting loading to false.
  // Open-Meteo accepts "auto" natively, so using it as the fallback sentinel is
  // both safe and correct. The gpsLoading gate on stableCoords is the real guard
  // that prevents premature fetches; stableTz does not need to duplicate that.
  const stableTz = tz || "auto";

  const stableCoords = useMemo(() => {
    if (!coords?.lat || !coords?.lon) return null;
    if (gpsLoading) return null;
    return { lat: coords.lat, lon: coords.lon };
  }, [coords?.lat, coords?.lon, gpsLoading]);

  // ── Temperature unit ────────────────────────────────────────────────────────
  const [tempUnit, setTempUnit] = useState("C");

  const convertTemp = useCallback(
    (c) => (tempUnit === "C" ? c : toFahrenheit(c)),
    [tempUnit],
  );
  const tempLabel = tempUnit === "C" ? "°C" : "°F";

  // ── Fetch / retry ───────────────────────────────────────────────────────────
  const forceRefreshRef = useRef(false);
  const [retryCount, setRetryCount] = useState(0);

  const handleRetry = useCallback(() => {
    forceRefreshRef.current = true;
    setRetryCount((c) => c + 1);
  }, []);

  // ── Weather + air data ──────────────────────────────────────────────────────
  const {
    weatherData,
    airData,
    weatherLoading,
    airLoading,
    weatherError,
    airError,
  } = useWeatherData(stableCoords, dateStr, stableTz, retryCount, forceRefreshRef);

  // ── airCurrent — derived here so useWeatherData stays pure ─────────────────
  const airCurrent = useMemo(
    () => (airData ? getCurrentAirQuality(airData, stableTz) : null),
    [airData, stableTz],
  );

  // ── Derived data slices (null-guarded while loading) ────────────────────────
  const hourly    = weatherData?.hourly;
  const daily     = weatherData?.daily;
  const current   = weatherData?.current;
  const airHourly = airData?.hourly;

  // ── Aggregated flags ────────────────────────────────────────────────────────
  const isLoading      = gpsLoading || weatherLoading || airLoading;
  const showFetchError = (weatherError && weatherError.message !== "Request aborted") ||
                         (airError && airError.message !== "Request aborted");
  const weatherMsg     = errorMessage(weatherError);
  const airMsg         = errorMessage(airError);

  return {
    // Date
    date, setDate, dateStr, isToday,
    // GPS — coordsCacheAge enables the "GPS CACHED · Xm ago" badge in HeroSection
    coords, coordsCacheAge, locationName, tz, gpsError, gpsDetected, gpsLoading,
    // Temperature
    tempUnit, setTempUnit, convertTemp, tempLabel,
    // Data
    weatherData, airCurrent,
    hourly, daily, current, airHourly,
    // Loading / error
    weatherLoading, airLoading, weatherError, airError,
    isLoading, showFetchError, weatherMsg, airMsg,
    // Actions
    handleRetry,
  };
}