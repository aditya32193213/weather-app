
import React from "react";
import PropTypes from "prop-types";

function StatCard({
  label,
  value,
  unit,
  icon,
  accent   = "#38bdf8",
  trend,
  isError,
  isLoaded = true,
}) {

  const isLoading =
    !isLoaded &&
    (value === null || value === undefined) &&
    !isError;

  const isNumeric    = typeof value === "number" && !isNaN(value);
  // "—" (em-dash) for null/undefined, consistent across all components.
  // `displayValue` is always a non-null string or number after this line.
  const displayValue = isNumeric
    ? (Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1))
    : value ?? "—";

  // Compound strings (e.g. "75 (Moderate)") rendered at text-3xl overflow on
  // narrow cards. Drop to text-base for strings longer than 10 characters to
  // prevent layout breakage on 320px screens and small grid columns.
  const isLongString =
    typeof displayValue === "string" && displayValue.length > 10;
  const valueSizeClass = isLongString
    ? "text-base leading-tight break-words"
    : "text-3xl tracking-tight";

  return (
    <div className="group relative overflow-hidden rounded-2xl p-5 transition-all duration-300 cursor-default hover:-translate-y-[2px] shadow-sm hover:shadow-lg bg-surface border border-surface-border backdrop-blur-md">
      {/* Accent glow blob */}
      <div
        className="absolute -top-6 -left-6 w-16 h-16 rounded-full opacity-15 blur-xl pointer-events-none"
        style={{ background: accent }}
        aria-hidden="true"
      />

      {/* Header row: label + icon */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium uppercase tracking-widest font-mono text-text-muted">
          {label}
        </span>
        <span className="text-lg" aria-hidden="true">{icon}</span>
      </div>

      {/* Value area */}
      {isError ? (
        <div className="flex items-baseline gap-1.5 mt-2">
          <span className="text-sm font-medium text-text-faint">Data unavailable</span>
        </div>
      ) : isLoading ? (
        <div className="h-8 w-24 rounded-lg animate-pulse mt-1 bg-skeleton" />
      ) : (
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <span
            className={`font-bold tabular-nums font-display text-text-primary ${valueSizeClass}`}
          >
            {displayValue}
          </span>
          {unit && (
            <span className="text-sm font-medium flex-shrink-0" style={{ color: accent }}>
              {unit}
            </span>
          )}
        </div>
      )}

      {/* Trend / contextual hint — hidden while loading or in error state */}
      {trend && !isError && !isLoading && (
        <div className="mt-2 flex items-center gap-1 text-xs text-text-faint">
          <span>{trend}</span>
        </div>
      )}

      {/* Bottom accent line (hover reveal) */}
      <div
        className="absolute bottom-0 left-0 h-0.5 rounded-full transition-all duration-500 w-0 group-hover:w-full"
        style={{ background: `linear-gradient(90deg, ${accent}, transparent)` }}
        aria-hidden="true"
      />
    </div>
  );
}
StatCard.displayName = "StatCard";

StatCard.propTypes = {
  label:    PropTypes.string.isRequired,
  value:    PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  unit:     PropTypes.string,
  icon:     PropTypes.string,
  accent:   PropTypes.string,
  trend:    PropTypes.string,
  isError:  PropTypes.bool,
  isLoaded: PropTypes.bool,
};

export default React.memo(StatCard);