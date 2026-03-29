import React, { useState, useEffect, useMemo } from "react";
import DatePicker from "react-datepicker";
import dayjs from "dayjs";
import AQIGauge from "../weather/AQIGauge";
import Skeleton from "../ui/Skeleton";
import PropTypes from "prop-types";
import { formatCacheAge } from "../../utils/format";
import { ARCHIVE_MIN_DATE_STR } from "../../utils/constants";
import { resolveTimezone } from "../../utils/timezone";

// Pre-computed once — ARCHIVE_MIN_DATE_STR is a static string constant, so
// converting it to a Date here is safe and avoids re-allocating on every render.
const ARCHIVE_MIN_DATE = new Date(ARCHIVE_MIN_DATE_STR);

// ─── Component ────────────────────────────────────────────────────────────────

const HeroSection = React.memo(function HeroSection({
  location,
  dateState,
  tempState,
  weatherData,
  airCurrent,
  weatherLoading,
  airLoading,
}) {
  const {
    coords,
    coordsCacheAge,
    locationName,
    timezone: tz,
    gpsDetected,
    gpsLoading,
  } = location;

  const { date, setDate, isToday } = dateState;
  const { tempUnit, setTempUnit, convertTemp, tempLabel } = tempState;

  // FIX (🟢 TIER 2): Was `useMemo(() => new Date(), [])` — computed once on
  // mount and never updated. After midnight the component still held yesterday
  // as maxDate, letting users pick "tomorrow" and receive an API 400 error.
  //
  // Now `maxDate` is state initialized to "now at mount time". A self-scheduling
  // setTimeout fires just after the next midnight and updates it. The effect
  // cleans up on unmount so no timer leaks.
  const [maxDate, setMaxDate] = useState(() => new Date());
  useEffect(() => {
    const msUntilMidnight = dayjs().endOf("day").diff(dayjs()) + 1;
    const t = setTimeout(() => setMaxDate(new Date()), msUntilMidnight);
    return () => clearTimeout(t);
  }, []);

  // resolveTimezone normalises undefined, "auto", and deprecated IANA aliases
  // so dayjs.tz() always receives a valid timezone string.
  const resolvedTz = resolveTimezone(tz ?? "UTC");

  const latLabel = coords
    ? `${Math.abs(coords.lat).toFixed(4)}°${coords.lat >= 0 ? "N" : "S"}`
    : "";
  const lonLabel = coords
    ? `${Math.abs(coords.lon).toFixed(4)}°${coords.lon >= 0 ? "E" : "W"}`
    : "";

  const { current, daily } = weatherData ?? {};

  const displayTemp = isToday
    ? current?.temperature_2m
    : daily?.temperature_2m_mean?.[0];

  const displayWind = isToday
    ? current?.wind_speed_10m
    : daily?.wind_speed_10m_max?.[0];

  const convertedTemp = convertTemp(displayTemp);
  // FIX (🟢 TIER 3): Was `"---"` — inconsistent with the em-dash "—" used
  // throughout the rest of the UI (wind, sunrise, sunset, hi/lo fallbacks).
  // Standardised to "—" (U+2014 em dash).
  const tempDisplay = Number.isFinite(convertedTemp) ? Math.floor(convertedTemp) : "—";

  // ── GPS badge rendering ───────────────────────────────────────────────────
  // Four states, evaluated in priority order:
  //   1. Loading: GPS request in progress
  //   2. Detected: fresh GPS resolved this session
  //   3. Cached: real GPS coords from a previous session (coordsCacheAge set)
  //   4. Fallback: no GPS and no prior cache entry
  const gpsBadge = (() => {
    if (gpsLoading) {
      return (
        <>
          <span className="relative flex h-2 w-2" aria-hidden="true">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-400" />
          </span>
          <span className="text-xs text-sky-400 font-medium font-mono">
            DETECTING LOCATION…
          </span>
        </>
      );
    }

    if (gpsDetected) {
      return (
        <>
          <span className="relative flex h-2 w-2" aria-hidden="true">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-400" />
          </span>
          <span className="text-xs text-sky-400 font-medium font-mono">
            LIVE · DETECTED
          </span>
        </>
      );
    }

    if (coordsCacheAge != null) {
      return (
        <>
          <span className="relative flex h-2 w-2" aria-hidden="true">
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
          </span>
          <span className="text-xs text-emerald-400 font-medium font-mono">
            GPS CACHED · {formatCacheAge(coordsCacheAge)}
          </span>
        </>
      );
    }

    return (
      <>
        <span className="relative flex h-2 w-2" aria-hidden="true">
          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
        </span>
        <span className="text-xs text-amber-400 font-medium font-mono">
          FALLBACK LOCATION
        </span>
      </>
    );
  })();

  return (
    <>
      {/* ── Location / date header ──────────────────────────────────────── */}
      <div className="animate-fade-up flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {gpsBadge}
          </div>

          <h1 className="text-3xl md:text-4xl font-bold tracking-tight font-display text-text-primary">
            {locationName}
          </h1>

          {coords && (
            <p className="text-xs mt-1 font-mono text-text-faint">
              {latLabel} · {lonLabel} · {tz ?? "—"}
            </p>
          )}

          {!gpsLoading && !gpsDetected && coordsCacheAge == null && (
            <p className="text-xs text-amber-400 font-mono mt-1">
              Using fallback location (GPS unavailable)
            </p>
          )}
        </div>

        {/* ── Controls: °C / °F toggle + Date picker ─────────────────────── */}
        <div className="flex flex-wrap items-center gap-3">
          <div
            className="flex rounded-xl overflow-hidden border border-surface-border"
            role="group"
            aria-label="Temperature unit"
          >
            {["C", "F"].map((unit) => (
              <button
                key={unit}
                onClick={() => setTempUnit(unit)}
                aria-pressed={tempUnit === unit}
                className={`px-3 py-1.5 text-xs font-semibold transition-all font-mono ${
                  tempUnit === unit
                    ? "bg-sky-400 text-slate-900"
                    : "bg-transparent text-text-muted hover:bg-surface-hover"
                }`}
              >
                °{unit}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface border border-surface-border backdrop-blur-md">
            <svg
              className="w-4 h-4 text-sky-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            {/* minDate must be a Date object, not a string — a string causes
                react-datepicker to silently ignore the constraint. */}
            <DatePicker
              selected={date}
              onChange={setDate}
              maxDate={maxDate}
              minDate={ARCHIVE_MIN_DATE}
              dateFormat="MMM dd, yyyy"
              className="text-sm font-medium cursor-pointer outline-none w-32 bg-transparent text-text-primary"
              portalId="datepicker-root"
              popperPlacement="bottom-end"
            />
          </div>
        </div>
      </div>

      {/* ── No-data fallback ────────────────────────────────────────────── */}
      {!weatherData && !weatherLoading && (
        <div className="text-center text-text-muted py-6 mt-4">
          No weather data available.
        </div>
      )}

      {/* ── Hero temperature card + AQI gauge ─────────────────────────────── */}
      {(weatherData || weatherLoading) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">

          {/* Temperature card */}
          <div className="md:col-span-2 rounded-3xl p-6 md:p-8 relative overflow-hidden bg-glass border border-surface-border backdrop-blur-lg shadow-sm">
            <div
              className="absolute top-0 right-0 w-64 h-64 rounded-full pointer-events-none opacity-10"
              style={{
                background: "radial-gradient(circle, #38bdf8, transparent 70%)",
                transform:  "translate(30%,-30%)",
              }}
              aria-hidden="true"
            />

            <div className="relative">
              <p className="text-xs uppercase tracking-widest mb-2 font-mono text-text-muted">
                {isToday
                  ? "Current Temperature"
                  : `Mean Temperature · ${dayjs.tz(date, resolvedTz).format("MMM D")}`}
              </p>

              {weatherLoading ? (
                <Skeleton h="h-16" w="w-40" />
              ) : (
                <>
                  <div className="flex items-baseline gap-3">
                    <span className="text-6xl md:text-7xl font-bold font-display tracking-tighter text-text-primary">
                      {tempDisplay}
                    </span>
                    <span className="text-2xl font-medium text-sky-400">
                      {tempLabel}
                    </span>
                  </div>
                  <p className="text-sm mt-2 text-text-secondary">
                    Wind {displayWind != null ? `${displayWind} km/h` : "—"}
                  </p>
                </>
              )}

              {/* High / Low / Sunrise / Sunset row */}
              <div className="flex flex-wrap gap-5 mt-5">
                {[
                  { label: "HIGH", val: daily?.temperature_2m_max?.[0], color: "text-orange-500" },
                  { label: "LOW",  val: daily?.temperature_2m_min?.[0], color: "text-sky-400"    },
                ].map(({ label, val, color }) => {
                  const converted = convertTemp(val);
                  return (
                    <div key={label}>
                      <p className="text-[10px] mb-0.5 font-mono text-text-faint">{label}</p>
                      {weatherLoading ? (
                        <Skeleton h="h-6" w="w-16" />
                      ) : (
                        <p className={`text-xl font-bold font-display ${color}`}>
                          {Number.isFinite(converted)
                            ? `${Math.round(converted)}${tempLabel}`
                            : "—"}
                        </p>
                      )}
                    </div>
                  );
                })}

                <div className="w-px bg-divider" aria-hidden="true" />

                <div>
                  <p className="text-[10px] mb-0.5 font-mono text-text-faint">SUNRISE</p>
                  {weatherLoading ? (
                    <Skeleton h="h-6" w="w-20" />
                  ) : (
                    <p className="text-lg font-bold font-display text-amber-400">
                      {daily?.sunrise?.[0]
                        ? dayjs.tz(daily.sunrise[0], resolvedTz).format("hh:mm A")
                        : "—"}
                    </p>
                  )}
                </div>

                <div>
                  <p className="text-[10px] mb-0.5 font-mono text-text-faint">SUNSET</p>
                  {weatherLoading ? (
                    <Skeleton h="h-6" w="w-20" />
                  ) : (
                    <p className="text-lg font-bold font-display text-orange-500">
                      {daily?.sunset?.[0]
                        ? dayjs.tz(daily.sunset[0], resolvedTz).format("hh:mm A")
                        : "—"}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* AQI gauge panel */}
          <div className="rounded-3xl p-5 flex flex-col items-center justify-center bg-surface border border-surface-border backdrop-blur-md shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-widest mb-2 font-mono text-text-muted">
              AQI
            </p>

            {airLoading ? (
              <Skeleton h="h-24" w="w-36" className="rounded-full" />
            ) : airCurrent?.us_aqi != null ? (
              <AQIGauge aqi={airCurrent.us_aqi} />
            ) : (
              <div className="text-sm text-text-faint font-mono text-center">
                AQI data unavailable
              </div>
            )}

            {!airLoading && airCurrent?.us_aqi != null && (
              <div className="mt-3 w-full flex justify-between text-xs text-text-faint font-mono px-2">
                <span>PM10: {airCurrent?.pm10?.toFixed(1) ?? "—"}</span>
                <span>PM2.5: {airCurrent?.pm2_5?.toFixed(1) ?? "—"}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
});
HeroSection.displayName = "HeroSection";

HeroSection.propTypes = {
  location: PropTypes.shape({
    coords: PropTypes.shape({
      lat: PropTypes.number,
      lon: PropTypes.number,
    }),
    coordsCacheAge: PropTypes.number,
    locationName:   PropTypes.string,
    timezone:       PropTypes.string,
    gpsDetected:    PropTypes.bool,
    gpsLoading:     PropTypes.bool,
  }).isRequired,
  dateState: PropTypes.shape({
    date:    PropTypes.instanceOf(Date),
    setDate: PropTypes.func.isRequired,
    isToday: PropTypes.bool,
  }).isRequired,
  tempState: PropTypes.shape({
    tempUnit:    PropTypes.oneOf(["C", "F"]),
    setTempUnit: PropTypes.func.isRequired,
    convertTemp: PropTypes.func.isRequired,
    tempLabel:   PropTypes.string,
  }).isRequired,
  weatherData: PropTypes.shape({
    current: PropTypes.object,
    daily:   PropTypes.object,
  }),
  airCurrent:     PropTypes.object,
  weatherLoading: PropTypes.bool,
  airLoading:     PropTypes.bool,
};

export default HeroSection;