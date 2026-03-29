import React, { useMemo } from "react";
import PropTypes from "prop-types";
import dayjs from "dayjs";
import { resolveTimezone } from "../../utils/timezone";
import { toFahrenheit } from "../../utils/format";


function HourlyStrip({ hourly, tempUnit, selectedDate, timezone }) {
  // Memoized — only recomputes when `timezone` prop changes.
  const tz = useMemo(() => resolveTimezone(timezone), [timezone]);

  // isToday, dateLabel, and rangeLabel all derive from selectedDate and tz.
  // Extracting them to a memo makes the dependency chain explicit and avoids
  // recomputation on unrelated re-renders.
  const { isToday, dateLabel, rangeLabel } = useMemo(() => {
    const today = selectedDate
      ? dayjs(selectedDate).tz(tz).isSame(dayjs().tz(tz), "day")
      : true;
    return {
      isToday:   today,
      // Uses .tz(tz) so the label always matches the timezone used for the
      // isToday comparison above — avoids "Jun 14" when the data is "Jun 15".
      dateLabel: today ? "Today" : dayjs(selectedDate).tz(tz).format("MMM D"),
      rangeLabel: today ? "24h forecast" : "24h data",
    };
  }, [selectedDate, tz]);

  const processedData = useMemo(() => {
    if (!hourly?.time) return [];

    const now = dayjs().tz(tz);

    return hourly.time.map((t, i) => {
      // FIX (🟡 MEDIUM): Was `dayjs(t).tz(t, tz)` — completely wrong.
      //
      // `dayjs(t)` parses the Open-Meteo naive timestamp string
      // (e.g. "2024-06-15T14:00") in the *browser's local timezone*, not the
      // location's timezone. For a user in UTC+5:30 looking at London data the
      // "Now" highlight would fire one hour early or late.
      //
      // `.tz(t, tz)` is also wrong: the instance method `.tz(timezone)` takes
      // a single string argument (the target timezone). Passing `t` as the
      // first argument treats the timestamp string as a timezone identifier —
      // always returning undefined or throwing, so isNow was always false.
      //
      // FIX: `dayjs.tz(t, tz)` — the static method interprets `t` as a
      // wall-clock time IN `tz`, which is exactly what Open-Meteo naive
      // timestamps represent. This matches the `now` variable above.
      const isNow = dayjs.tz(t, tz).isSame(now, "hour");

      let tempVal = hourly.temperature_2m?.[i];
      // Uses the shared toFahrenheit utility — handles null/undefined gracefully
      // (returns null), removing the need for the extra `&& tempVal != null` guard.
      if (tempUnit === "F") tempVal = toFahrenheit(tempVal);

      const isDay =
        hourly.is_day?.[i] !== undefined ? hourly.is_day[i] === 1 : true;

      return {
        timeStr: t,
        isNow,
        temp:   tempVal != null ? Math.round(tempVal) : null,
        precip: Number.isFinite(hourly.precipitation?.[i])
          ? hourly.precipitation[i]
          : null,
        isDay,
      };
    });
  }, [hourly, tempUnit, tz]);

  return (
    <div className="rounded-2xl overflow-hidden bg-surface border border-surface-border backdrop-blur-md">
      <div className="px-5 pt-4 pb-2 flex items-center justify-between border-b border-divider">
        <p className="text-xs font-semibold uppercase tracking-widest font-mono text-text-muted">
          Hourly · {dateLabel}
        </p>
        <p className="text-xs font-mono text-text-faint">{rangeLabel}</p>
      </div>

      <div
        className="overflow-x-auto px-4 py-3"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        <div className="flex gap-2 min-w-max">
          {processedData.map(({ timeStr, isNow, temp, precip, isDay }) => (
            <div
              key={timeStr}
              className={`flex flex-col items-center gap-1 px-2 py-2 rounded-xl transition-all duration-200 min-w-[44px] ${
                isNow
                  ? "bg-sky-400/15 border border-sky-400/30"
                  : "bg-transparent border border-transparent"
              }`}
            >
              <p
                className={`text-[10px] font-mono ${
                  isNow ? "text-sky-400" : "text-text-faint"
                }`}
              >
                {isNow ? "Now" : timeStr.slice(11, 16)}
              </p>
              <span className="text-sm" aria-hidden="true">
                {precip > 0 ? "🌧️" : isDay ? "☀️" : "🌙"}
              </span>
              <p className="text-xs font-bold font-display text-text-primary">
                {temp !== null ? `${temp}°` : "—"}
              </p>
              {precip > 0 && (
                <p className="text-[9px] text-indigo-400">
                  {precip.toFixed(1)}mm
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
HourlyStrip.displayName = "HourlyStrip";

HourlyStrip.propTypes = {
  hourly: PropTypes.shape({
    time:           PropTypes.arrayOf(PropTypes.string).isRequired,
    temperature_2m: PropTypes.arrayOf(PropTypes.number),
    precipitation:  PropTypes.arrayOf(PropTypes.number),
    is_day:         PropTypes.arrayOf(PropTypes.number),
  }),
  tempUnit: PropTypes.oneOf(["C", "F"]),
  // Narrowed to string only — API contract requires "YYYY-MM-DD" strings.
  // Callers must convert Date objects before passing this prop.
  selectedDate: PropTypes.string,
  timezone:     PropTypes.string,
};

export default React.memo(HourlyStrip);