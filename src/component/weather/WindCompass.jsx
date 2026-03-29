// src/component/weather/WindCompass.jsx

import React from "react";
import PropTypes from "prop-types";
import { COMPASS_DIRECTIONS } from "../../utils/wind";
import { formatValue } from "../../utils/format";

const CARDINAL_POSITIONS = [
  { label: COMPASS_DIRECTIONS[0], x: 50, y: 8  }, // N
  { label: COMPASS_DIRECTIONS[4], x: 50, y: 96 }, // S
  { label: COMPASS_DIRECTIONS[2], x: 96, y: 53 }, // E
  { label: COMPASS_DIRECTIONS[6], x: 4,  y: 53 }, // W
];

// Array.from is semantically cleaner than [...Array(8)].
const TICK_MARKS = Array.from({ length: 8 }, (_, i) => {
  const a = (i * 45 * Math.PI) / 180;
  return {
    x1: 50 + 40 * Math.sin(a),
    y1: 50 - 40 * Math.cos(a),
    x2: 50 + 44 * Math.sin(a),
    y2: 50 - 44 * Math.cos(a),
  };
});

function WindCompass({ degrees, direction, speed }) {
  const angle = typeof degrees === "number"
    ? ((degrees % 360) + 360) % 360
    : 0;

  const dirLabel   = direction ?? `${angle}°`;
  // formatValue returns "—" for null/undefined, so no extra guard needed here.
  const speedLabel = speed != null ? ` at ${formatValue(speed, "wind")}` : "";

  return (
    <div className="rounded-2xl p-5 flex flex-col items-center justify-center bg-surface border border-surface-border backdrop-blur-md min-h-[160px]">
      <p className="text-xs font-semibold uppercase tracking-widest mb-3 font-mono text-text-muted">
        Wind Direction
      </p>
      <svg
        width="100"
        height="100"
        viewBox="0 0 100 100"
        role="img"
        aria-label={`Wind direction: ${dirLabel}${speedLabel}`}
      >
        {/* FIX: fill-glass and stroke-divider are not real Tailwind utilities.
            Replaced with inline fill/stroke referencing CSS custom properties. */}
        <circle
          cx="50" cy="50" r="46"
          fill="var(--glass)"
          stroke="var(--divider)"
          strokeWidth="1.5"
        />
        <circle
          cx="50" cy="50" r="38"
          fill="none"
          stroke="var(--divider)"
          strokeWidth="0.5"
          strokeDasharray="2 4"
        />

        {CARDINAL_POSITIONS.map(({ label, x, y }) => (
          <text
            key={label}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            style={{
              fontSize:   9,
              fill:       label === COMPASS_DIRECTIONS[0] ? "#38bdf8" : "var(--text-muted)",
              fontWeight: label === COMPASS_DIRECTIONS[0] ? 700 : 400,
            }}
            className="font-mono"
          >
            {label}
          </text>
        ))}

        {/* FIX: stroke-divider is not a real Tailwind utility — inline style. */}
        {TICK_MARKS.map((mark, i) => (
          <line
            key={i}
            x1={mark.x1} y1={mark.y1}
            x2={mark.x2} y2={mark.y2}
            stroke="var(--divider)"
            strokeWidth="1"
          />
        ))}

        <g transform={`rotate(${angle}, 50, 50)`}>
          <polygon points="50,14 53,50 50,46 47,50" fill="#38bdf8" opacity="0.9" />
          {/* FIX: fill-text-faint is not a real Tailwind utility — inline style. */}
          <polygon points="50,86 53,50 50,54 47,50" fill="var(--text-faint)" opacity="0.6" />
        </g>
        <circle cx="50" cy="50" r="4" fill="#38bdf8" />
      </svg>

      <p className="mt-2 text-base font-bold font-display text-text-primary">
        {angle}° {direction ?? "—"}
      </p>

      {/* formatValue handles null safely — no extra null-check needed */}
      {speed != null && (
        <p className="text-xs mt-0.5 text-text-muted">{formatValue(speed, "wind")}</p>
      )}
    </div>
  );
}

WindCompass.displayName = "WindCompass";

WindCompass.propTypes = {
  degrees:   PropTypes.number,
  direction: PropTypes.string,
  speed:     PropTypes.number,
};

export default React.memo(WindCompass);