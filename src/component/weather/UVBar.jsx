// src/component/weather/UVBar.jsx

import React from "react";
import PropTypes from "prop-types";

// ─── Lookup table ─────────────────────────────────────────────────────────────

const UV_LEVELS = [
  { maxThreshold: 2,        label: "Low",       color: "#22c55e" },
  { maxThreshold: 5,        label: "Moderate",  color: "#eab308" },
  { maxThreshold: 7,        label: "High",      color: "#f97316" },
  { maxThreshold: 10,       label: "Very High", color: "#ef4444" },
  { maxThreshold: Infinity, label: "Extreme",   color: "#a855f7" },
];

const UV_SCALE_MAX = 11;

// FIX: Scale markers now carry their numeric value so they can be positioned
// proportionally on the bar (left = value/UV_SCALE_MAX × 100%).
// The previous `justify-between` approach spread them at equal intervals
// (0 / 25 / 50 / 75 / 100 %) even though the actual thresholds fall at
// 0 / 18 / 45 / 64 / 91 % — causing visible misalignment between the fill
// and the tick labels.
const UV_SCALE_MARKERS = [
  { label: "0",   value: 0  },
  { label: "2",   value: 2  },
  { label: "5",   value: 5  },
  { label: "7",   value: 7  },
  { label: "10+", value: 10 },
];

// ─── Component ────────────────────────────────────────────────────────────────

function UVBar({ value }) {
  if (value == null) return null;

  const level = UV_LEVELS.find((l) => value <= l.maxThreshold) ?? UV_LEVELS.at(-1);
  const pct   = Math.min(100, (value / UV_SCALE_MAX) * 100);

  return (
    <div
      className="rounded-2xl p-5 backdrop-blur-md"
      style={{
        background: `${level.color}18`,
        border:     `1px solid ${level.color}30`,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold uppercase tracking-widest font-mono text-text-muted">
          UV Index
        </span>
        <span className="text-sm font-semibold" style={{ color: level.color }}>
          ☀️ {level.label}
        </span>
      </div>

      {/* Numeric value */}
      <p className="text-3xl font-bold mb-3 font-display" style={{ color: level.color }}>
        {value.toFixed(1)}
      </p>

      {/* Progress bar
          minWidth: "3px" ensures the bar is always visible even at UV index 0.
          Without it, pct=0% renders an invisible bar that looks broken. */}
      <div className="h-2.5 rounded-full overflow-hidden bg-divider">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width:      `${pct}%`,
            minWidth:   pct > 0 ? "3px" : "0",
            background: "linear-gradient(90deg, #22c55e, #eab308, #f97316, #ef4444, #a855f7)",
          }}
        />
      </div>

      {/* Scale markers — absolutely positioned at their proportional threshold
          value so each label aligns with the correct point on the bar fill.  */}
      <div className="relative mt-1 h-3">
        {UV_SCALE_MARKERS.map(({ label, value }) => (
          <span
            key={label}
            className="absolute text-[9px] font-mono text-text-faint"
            style={{
              left:      `${(value / UV_SCALE_MAX) * 100}%`,
              transform: "translateX(-50%)",
            }}
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
UVBar.displayName = "UVBar";

UVBar.propTypes = {
  value: PropTypes.number,
};

export default React.memo(UVBar);