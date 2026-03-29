import React, { useMemo } from "react";
import PropTypes from "prop-types";
import StatCard from "../ui/StatCard";
import WindCompass from "../weather/WindCompass";
import SectionLabel from "../ui/SectionLabel";
import Skeleton from "../ui/Skeleton";
import { resolveTimezone } from "../../utils/timezone";
import { degreesToCompass } from "../../utils/wind";

// ─── Component ────────────────────────────────────────────────────────────────

const WeatherParametersGrid = React.memo(function WeatherParametersGrid({
  weatherLoading,
  current,
  daily,
  hourly,
  isToday,
  tz,
  weatherError,
  onRetry = () => {},
}) {
  const windDegrees = isToday
    ? current?.wind_direction_10m
    : daily?.wind_direction_10m_dominant?.[0];

  const windSpeed = isToday
    ? current?.wind_speed_10m
    : daily?.wind_speed_10m_max?.[0];

  // FIX: Resolve tz before use. When GPS hasn't resolved yet `tz` is undefined.
  // resolveTimezone(undefined) behavior is unknown; fall back to "UTC" so the
  // component renders correctly (neutral timestamp) rather than throwing.
  // This also normalises deprecated IANA aliases (e.g. "Asia/Calcutta" → "Asia/Kolkata").
  const resolvedTz = useMemo(() => resolveTimezone(tz ?? "UTC"), [tz]);

  // ── All hooks — unconditional, before any early return ────────────────────

  const humidity = useMemo(() => {
    if (isToday) return current?.relative_humidity_2m;
    if (!hourly?.relative_humidity_2m || !hourly?.time) return null;

    const noonIdx = hourly.time.findIndex(
      (t) => parseInt(String(t).slice(11, 13), 10) === 12,
    );
    return hourly.relative_humidity_2m[noonIdx >= 0 ? noonIdx : 0];
  }, [isToday, current, hourly]);

  const visibilityIndex = useMemo(() => {
    if (!hourly?.time) return 0;

    if (isToday) {
      const targetHourStr = new Intl.DateTimeFormat("en-GB", {
        timeZone: resolvedTz,
        hour:     "2-digit",
        hour12:   false,
      }).format(new Date());
      const nowHour = targetHourStr === "24" ? 0 : parseInt(targetHourStr, 10);

      const idx = hourly.time.findIndex(
        (t) => parseInt(String(t).slice(11, 13), 10) === nowHour,
      );
      return idx >= 0 ? idx : Math.floor(hourly.time.length / 2);
    }

    // Archive path — noon slot for historical dates.
    const noonIdx = hourly.time.findIndex(
      (t) => parseInt(String(t).slice(11, 13), 10) === 12,
    );
    return noonIdx >= 0
      ? noonIdx
      : Math.min(12, (hourly.time.length ?? 0) - 1);
  }, [isToday, hourly, resolvedTz]);

  const visibilityKm = useMemo(() => {
    const raw = hourly?.visibility?.[visibilityIndex];
    return raw != null ? parseFloat((raw / 1000).toFixed(1)) : null;
  }, [hourly, visibilityIndex]);

  // ── Early returns — after all hooks ──────────────────────────────────────

  // FIX (MEDIUM): Previously the error branch returned only the error message
  // div, dropping the SectionLabel entirely. This caused a jarring layout
  // collapse — the "Weather Parameters" heading simply disappeared on error,
  // inconsistent with AirQualityGrid which correctly preserves its label.
  if (weatherError) {
    return (
      <div className="animate-fade-up-4 mt-6">
        <SectionLabel icon="🌤">Weather Parameters</SectionLabel>
        <div className="text-center text-red-400 py-6">
          <p>Failed to load weather data.</p>
          <button
            onClick={onRetry}
            className="mt-2 px-3 py-1 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-xs"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="animate-fade-up-4 mt-6">
      <SectionLabel icon="🌤">Weather Parameters</SectionLabel>

      {weatherLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} h="h-36" w="w-full" className="rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <WindCompass
            degrees={windDegrees}
            direction={degreesToCompass(windDegrees)}
            speed={windSpeed}
          />

          {/* Null on historical dates is a data gap, not an API error.
              trend hint tells the user why the value is absent.          */}
          <StatCard
            label="Visibility"
            value={visibilityKm}
            unit={visibilityKm != null ? "km" : undefined}
            icon="👁️"
            accent="#34d399"
            isLoaded={!weatherLoading}
            trend={!isToday && visibilityKm == null ? "N/A in history" : undefined}
          />

          <StatCard
            label="Humidity"
            value={humidity}
            unit="%"
            icon="💧"
            accent="#38bdf8"
            isLoaded={!weatherLoading}
          />

          <StatCard
            label="Daily Precip."
            value={daily?.precipitation_sum?.[0]}
            unit="mm"
            icon="🌧️"
            accent="#818cf8"
            isLoaded={!weatherLoading}
          />
        </div>
      )}
    </div>
  );
});
WeatherParametersGrid.displayName = "WeatherParametersGrid";

WeatherParametersGrid.propTypes = {
  weatherLoading: PropTypes.bool,
  current: PropTypes.shape({
    wind_direction_10m:   PropTypes.number,
    wind_speed_10m:       PropTypes.number,
    relative_humidity_2m: PropTypes.number,
  }),
  daily: PropTypes.shape({
    wind_direction_10m_dominant: PropTypes.arrayOf(PropTypes.number),
    wind_speed_10m_max:          PropTypes.arrayOf(PropTypes.number),
    precipitation_sum:           PropTypes.arrayOf(PropTypes.number),
  }),
  hourly: PropTypes.shape({
    time:                 PropTypes.arrayOf(PropTypes.string),
    relative_humidity_2m: PropTypes.arrayOf(PropTypes.number),
    visibility:           PropTypes.arrayOf(PropTypes.number),
  }),
  isToday:      PropTypes.bool,
  tz:           PropTypes.string,
  // FIX: tightened from PropTypes.any — all error values in this codebase are
  // proper Error instances so instanceOf(Error) is the correct constraint.
  weatherError: PropTypes.instanceOf(Error),
  onRetry:      PropTypes.func,
};

export default WeatherParametersGrid;