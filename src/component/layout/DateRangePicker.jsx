import { useState, useCallback, useMemo } from "react";
import DatePicker from "react-datepicker";
import dayjs from "dayjs";
import PropTypes from "prop-types";
import PresetButton from "../ui/PresetButton";
import { MAX_RANGE_DAYS, ARCHIVE_MIN_DATE_STR } from "../../utils/constants";
import { isValidDateRange } from "../../utils/validation";

// FIX: Pre-compute the Date object once at module scope. ARCHIVE_MIN_DATE_STR
// is a static constant, so constructing new Date() here is safe and prevents
// a new allocation on every render. Passing a string to react-datepicker's
// minDate silently ignores the constraint, allowing users to pick dates before
// 1940-01-01 and triggering API 400 errors.
const ARCHIVE_MIN_DATE = new Date(ARCHIVE_MIN_DATE_STR);

const PRESETS = [
  { label: "Last 30d", days: 30            },
  { label: "Last 6mo", days: 180           },
  { label: "Last 1yr", days: 365           },
  { label: "Last 2yr", days: MAX_RANGE_DAYS },
];

/**
 * Self-contained date range panel:
 * - Quick-select presets (auto-fetch on click)
 * - Start / End date pickers
 * - Range validation feedback
 * - Analyze button
 *
 * All date state lives here; the parent receives resolved dates only via
 * onFetch, keeping Historical.jsx free of picker implementation details.
 */
const DateRangePicker = function DateRangePicker({
  coords,
  weatherLoading,
  weatherData,
  archiveLagDays,
  today,
  onFetch,
  onStale,
}) {
  const [startDate, setStartDate] = useState(null);
  const [endDate,   setEndDate]   = useState(null);

  const maxEndDate = useMemo(() => {
    const latestAvailable = dayjs(today).subtract(archiveLagDays, "day").toDate();
    if (!startDate) return latestAvailable;
    const twoYearsOut = dayjs(startDate).add(MAX_RANGE_DAYS, "day").toDate();
    return twoYearsOut < latestAvailable ? twoYearsOut : latestAvailable;
  }, [startDate, today, archiveLagDays]);

  const handleStartDateChange = useCallback((date) => {
    setStartDate(date);
    if (weatherData) onStale(true);
    if (date && endDate) {
      const newMax = dayjs(date).add(MAX_RANGE_DAYS, "day").toDate();
      if (endDate > newMax) setEndDate(null);
    }
  }, [endDate, weatherData, onStale]);

  const handleEndDateChange = useCallback((date) => {
    setEndDate(date);
    if (weatherData) onStale(true);
  }, [weatherData, onStale]);

  const handlePreset = useCallback((days) => {
    const end   = dayjs().subtract(archiveLagDays, "day").toDate();
    const start = dayjs(end).subtract(days, "day").toDate();
    setStartDate(start);
    setEndDate(end);
    onFetch(start, end);
  }, [archiveLagDays, onFetch]);

  const handleFetch = useCallback(() => {
    if (!coords || !startDate || !endDate) return;
    onFetch(startDate, endDate);
  }, [coords, startDate, endDate, onFetch]);

  const canFetch = !!(coords && startDate && endDate && !weatherLoading);

  // FIX: replaced isValidRange (which accepted Date objects and used dayjs
  // internally) with isValidDateRange (which operates on strict YYYY-MM-DD
  // strings and also validates format). When both dates are absent the range
  // is not considered "exceeding max" — the UI only shows the feedback when
  // both dates are selected.
  const rangeExceedsMax = !!(
    startDate &&
    endDate &&
    !isValidDateRange(
      dayjs(startDate).format("YYYY-MM-DD"),
      dayjs(endDate).format("YYYY-MM-DD"),
    )
  );

  return (
    <div className="animate-fade-up-2 rounded-2xl p-5 md:p-6 space-y-5 bg-surface border border-surface-border backdrop-blur-md shadow-sm">
      {/* Quick-select presets */}
      <div>
        <p className="text-xs uppercase tracking-widest mb-3 font-mono text-text-faint">
          Quick Select · auto-fetches
        </p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <PresetButton
              key={p.label}
              label={p.label}
              days={p.days}
              onSelect={handlePreset}
              disabled={!coords || weatherLoading}
            />
          ))}
        </div>
      </div>

      <div className="h-px bg-divider" />

      {/* Date pickers */}
      <div className="flex flex-wrap items-end gap-4">
        {/* Start date */}
        <div>
          <p className="text-xs uppercase tracking-widest mb-2 font-mono text-text-muted">
            Start Date
          </p>
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer bg-glass border border-glass-border">
            <svg
              className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0"
              fill="none" viewBox="0 0 24 24"
              stroke="currentColor" strokeWidth={2}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {/* FIX: minDate is a Date object, not the raw ARCHIVE_MIN_DATE_STR string. */}
            <DatePicker
              selected={startDate}
              onChange={handleStartDateChange}
              maxDate={maxEndDate}
              minDate={ARCHIVE_MIN_DATE}
              dateFormat="MMM dd, yyyy"
              placeholderText="Select start"
              className="text-sm outline-none w-32 cursor-pointer bg-transparent text-text-primary"
              portalId="datepicker-root"
              popperPlacement="bottom-start"
            />
          </div>
        </div>

        {/* End date */}
        <div>
          <p className="text-xs uppercase tracking-widest mb-2 font-mono text-text-muted">
            End Date
          </p>
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer bg-glass border border-glass-border">
            <svg
              className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0"
              fill="none" viewBox="0 0 24 24"
              stroke="currentColor" strokeWidth={2}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <DatePicker
              selected={endDate}
              onChange={handleEndDateChange}
              maxDate={maxEndDate}
              minDate={startDate}
              dateFormat="MMM dd, yyyy"
              placeholderText="Select end"
              className="text-sm outline-none w-32 cursor-pointer bg-transparent text-text-primary"
              portalId="datepicker-root"
              popperPlacement="bottom-end"
            />
          </div>
        </div>
      </div>

      {/* Range feedback */}
      {startDate && endDate && (
        <p className={`text-xs pb-2 font-mono ${rangeExceedsMax ? "text-red-400" : "text-text-faint"}`}>
          {dayjs(endDate).diff(dayjs(startDate), "day") + 1} days
          {rangeExceedsMax && " · exceeds 2-year max"}
        </p>
      )}

      {/* Analyze button */}
      <button
        type="button"
        onClick={handleFetch}
        disabled={!canFetch || rangeExceedsMax}
        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 font-display shadow-sm
          ${canFetch && !rangeExceedsMax
            ? "bg-gradient-to-br from-sky-400 to-indigo-400 text-slate-900 cursor-pointer shadow-[0_4px_20px_rgba(56,189,248,0.3)]"
            : "bg-glass text-text-faint cursor-not-allowed border border-glass-border"
          }`}
      >
        {weatherLoading ? (
          <>
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Fetching...
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Analyze
          </>
        )}
      </button>

      {/* Archive info note */}
      <p className="flex items-center gap-2 text-xs text-text-faint">
        <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Archive data has a ~7 day lag. Maximum range: 2 years.
      </p>
    </div>
  );
};

DateRangePicker.propTypes = {
  coords:         PropTypes.object,
  weatherLoading: PropTypes.bool.isRequired,
  weatherData:    PropTypes.object,
  archiveLagDays: PropTypes.number.isRequired,
  today:          PropTypes.instanceOf(Date).isRequired,
  onFetch:        PropTypes.func.isRequired,
  onStale:        PropTypes.func.isRequired,
};

export default DateRangePicker;