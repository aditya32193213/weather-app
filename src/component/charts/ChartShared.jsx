import React from "react";
import PropTypes from "prop-types";
import dayjs from "dayjs";

// ─── Shared inline style ─────────────────────────────────────────────────────

export const TOOLTIP_CONTAINER_STYLE = {
  background:     "var(--surface-solid)",
  border:         "1px solid rgba(56,189,248,0.25)",
  borderRadius:   12,
  padding:        "10px 14px",
  minWidth:       148,
  backdropFilter: "blur(12px)",
  boxShadow:      "0 8px 32px rgba(0,0,0,0.15)",
};

// ─── Utilities ────────────────────────────────────────────────────────────────


export function formatTimeValue(value) {
  if (value == null || !Number.isFinite(value)) return "—";

  let hrs  = Math.floor(value);
  let mins = Math.round((value - hrs) * 60);

  if (mins === 60) {
    hrs  += 1;
    mins  = 0;
  }

  return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

// ─── SharedTooltip ────────────────────────────────────────────────────────────

export const SharedTooltip = React.memo(function SharedTooltip({
  active,
  payload,
  label,
  isHistorical = false,
  isTimeChart  = false,
}) {
  if (!active || !payload?.length) return null;

  const displayLabel =
    isHistorical && dayjs(label).isValid()
      ? dayjs(label).format("MMM D, YYYY")
      : label;

  return (
    <div style={TOOLTIP_CONTAINER_STYLE}>
      <p style={{
        color:        "var(--text-muted)",
        fontSize:     11,
        fontFamily:   "var(--font-mono)",
        marginBottom: 6,
      }}>
        {displayLabel}
      </p>

      {payload.map((entry, i) => {
        const unit = entry.unit ?? entry.payload?.unit;
        const key = entry.name ?? entry.dataKey ?? i;

        return (
          <div
            key={key}
            style={{
              display:        "flex",
              alignItems:     "center",
              justifyContent: "space-between",
              gap:            16,
              marginBottom:   2,
            }}
          >
            <span style={{
              display:    "flex",
              alignItems: "center",
              gap:        6,
              fontSize:   12,
              color:      "var(--text-secondary)",
            }}>
              <span style={{
                width:        6,
                height:       6,
                borderRadius: "50%",
                background:   entry.color,
                display:      "inline-block",
                flexShrink:   0,
              }} />
              {entry.name}
            </span>

            <span style={{
              fontFamily: "var(--font-mono)",
              fontWeight: 700,
              color:      "var(--text-primary)",
              fontSize:   12,
            }}>
              {isTimeChart
                ? formatTimeValue(entry.value)
                : typeof entry.value === "number"
                  ? Number.isInteger(entry.value)
                    ? `${entry.value}${unit ? ` ${unit}` : ""}`
                    : `${entry.value.toFixed(1)}${unit ? ` ${unit}` : ""}`
                  : entry.value ?? "—"}
            </span>
          </div>
        );
      })}
    </div>
  );
});
SharedTooltip.displayName = "SharedTooltip";

SharedTooltip.propTypes = {
  active:       PropTypes.bool,
  payload:      PropTypes.array,
  label:        PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  isHistorical: PropTypes.bool,
  isTimeChart:  PropTypes.bool,
};

// ─── SharedLegend ─────────────────────────────────────────────────────────────

export const SharedLegend = React.memo(function SharedLegend({ payload }) {
  if (!payload?.length) return null;

  return (
    <div style={{
      display:        "flex",
      justifyContent: "center",
      gap:            16,
      marginTop:      8,
      flexWrap:       "wrap",
    }}>
      {payload.map((entry, i) => {
        const key = entry.value ?? entry.dataKey ?? i;

        return (
          <span
            key={key}
            style={{
              display:    "flex",
              alignItems: "center",
              gap:        6,
              fontSize:   11,
              color:      "var(--text-muted)",
              fontFamily: "var(--font-mono)",
            }}
          >
            <span style={{
              width:        20,
              height:       2,
              background:   entry.color,
              display:      "inline-block",
              borderRadius: 2,
            }} />
            {entry.value}
          </span>
        );
      })}
    </div>
  );
});
SharedLegend.displayName = "SharedLegend";

SharedLegend.propTypes = {
  payload: PropTypes.array,
};

// ─── ZoomControls ─────────────────────────────────────────────────────────────

export const ZoomControls = React.memo(function ZoomControls({
  onZoomIn  = () => {},
  onZoomOut = () => {},
  onReset   = () => {},
  isZoomed  = false,
  canZoomIn = false,
}) {
  const btnBase =
    "p-1.5 rounded-lg transition-colors border text-text-muted " +
    "bg-surface border-surface-border hover:bg-sky-400/10 hover:text-sky-400 " +
    "disabled:opacity-30 disabled:cursor-not-allowed";

  return (
    <div className="flex items-center gap-1">
      {/* Zoom in */}
      <button
        type="button"
        onClick={onZoomIn}
        disabled={!canZoomIn}
        className={btnBase}
        title="Zoom in"
        aria-label="Zoom in"
      >
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
        </svg>
      </button>

      {/* Zoom out */}
      <button
        type="button"
        onClick={onZoomOut}
        disabled={!isZoomed}
        className={btnBase}
        title="Zoom out"
        aria-label="Zoom out"
      >
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
        </svg>
      </button>

      {/* Reset — only visible when zoomed in */}
      {isZoomed && (
        <button
          type="button"
          onClick={onReset}
          className="px-2 py-1 rounded-lg text-[10px] font-mono transition-colors bg-sky-400/10 border border-sky-400/20 text-sky-400 hover:bg-sky-400/20"
          aria-label="Reset zoom"
        >
          Reset
        </button>
      )}
    </div>
  );
});
ZoomControls.displayName = "ZoomControls";

ZoomControls.propTypes = {
  onZoomIn:  PropTypes.func,
  onZoomOut: PropTypes.func,
  onReset:   PropTypes.func,
  isZoomed:  PropTypes.bool,
  canZoomIn: PropTypes.bool,
};