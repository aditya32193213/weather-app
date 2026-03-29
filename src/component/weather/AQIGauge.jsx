// src/component/weather/AQIGauge.jsx

import React, { useMemo } from "react";
import PropTypes from "prop-types";

// FIX: Switched from CPCB breakpoints (0/50/100/200/300/400/∞) to US EPA
// breakpoints (0/50/100/150/200/300/∞) to match the `us_aqi` field returned
// by the Open-Meteo API. Using CPCB labels against a US AQI value produced
// wrong health guidance — e.g. AQI 120 rendered as "Moderate" (CPCB) when
// the API actually means "Unhealthy for Sensitive Groups" (EPA).
//
// Arc span values sum to 500 (the AQI_MAX), mapping each level's range to a
// proportional slice of the semicircular gauge.
const LEVELS = [
  { max: 50,       label: "Good",                  color: "#22c55e", bg: "#22c55e20", span: 50  },
  { max: 100,      label: "Moderate",              color: "#eab308", bg: "#eab30820", span: 50  },
  { max: 150,      label: "Unhealthy (Sensitive)", color: "#f97316", bg: "#f9731620", span: 50  },
  { max: 200,      label: "Unhealthy",             color: "#ef4444", bg: "#ef444420", span: 50  },
  { max: 300,      label: "Very Unhealthy",        color: "#a855f7", bg: "#a855f720", span: 100 },
  { max: Infinity, label: "Hazardous",             color: "#7f1d1d", bg: "#7f1d1d20", span: 200 },
];

// ─── SVG geometry constants ───────────────────────────────────────────────────

const r  = 68;
const cx = 80;
const cy = 88;

const AQI_MAX = 500;
const ARC_LEN = Math.PI * r;

// ─── Arc path helper ──────────────────────────────────────────────────────────

function makeArcPath(start, end) {
  const toRad    = (d) => ((d - 90) * Math.PI) / 180;
  const x1       = cx + r * Math.cos(toRad(start));
  const y1       = cy + r * Math.sin(toRad(start));
  const x2       = cx + r * Math.cos(toRad(end));
  const y2       = cy + r * Math.sin(toRad(end));
  const largeArc = Math.abs(end - start) > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
}

// ─── Pre-computed arc segments ────────────────────────────────────────────────

const STATIC_ARCS = (() => {
  let start = -90;
  return LEVELS.map((lvl) => {
    const angleSpan = (lvl.span / 500) * 180;
    const end  = start + angleSpan;
    const path = makeArcPath(start, end);
    start = end;
    return { path, color: lvl.color };
  });
})();

// ─── Component ────────────────────────────────────────────────────────────────

function AQIGauge({ aqi }) {
  const { angle, lvl } = useMemo(() => {
    if (aqi == null) return { angle: 0, lvl: null };

    const calculatedLvl =
      LEVELS.find((l) => aqi <= l.max) ?? LEVELS[LEVELS.length - 1];

    const calculatedAngle = Math.min(
      90,
      Math.max(-90, (aqi / AQI_MAX) * 180 - 90)
    );

    return { angle: calculatedAngle, lvl: calculatedLvl };
  }, [aqi]);

  if (aqi == null) {
    return <div className="text-sm text-text-muted">AQI not available</div>;
  }

  const needleRotation = angle + 90;

  return (
    <div className="flex flex-col items-center">
      {/*
        FIX (Issue #12): The pivot circle is drawn at cy=88 with r=5, so its
        bottom edge reaches y=93. The previous viewBox height of 90 clipped the
        lower 3px of the circle, creating a visually flat bottom on the pivot dot.
        Height increased to 95 to give the circle 2px of breathing room below.
        Width is unchanged (160px).
      */}
      <svg
        width="160"
        height="95"
        viewBox="0 0 160 95"
        role="meter"
        aria-valuenow={aqi}
        aria-valuemin={0}
        aria-valuemax={AQI_MAX}
        aria-label={`Air Quality Index: ${aqi} — ${lvl.label}`}
      >
        {/* Colour band arcs */}
        {STATIC_ARCS.map((arc, i) => (
          <path key={i} d={arc.path} fill={arc.color} opacity="0.25" stroke="none" />
        ))}

        {/* Track arc */}
        <path
          d="M 12 88 A 68 68 0 0 1 148 88"
          fill="none"
          stroke="var(--divider)"
          strokeWidth="6"
          strokeLinecap="round"
        />

        {/* Progress arc */}
        <path
          d="M 12 88 A 68 68 0 0 1 148 88"
          fill="none"
          stroke={lvl.color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${ARC_LEN} ${ARC_LEN}`}
          strokeDashoffset={ARC_LEN - (aqi / AQI_MAX) * ARC_LEN}
          opacity="0.9"
        />

        {/* Needle — transform-box + transform-origin on the element itself for
            reliable cross-browser pivot at the line's own geometry origin.    */}
        <g>
          <line
            x1={cx}      y1={cy}
            x2={cx - 52} y2={cy}
            stroke={lvl.color}
            strokeWidth="2.5"
            strokeLinecap="round"
            style={{
              transform:       `rotate(${needleRotation}deg)`,
              transformBox:    "fill-box",
              transformOrigin: "center bottom",
              transition:      "transform 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}
          />
        </g>

        {/* Centre pivot */}
        <circle cx={cx} cy={cy} r="5" fill={lvl.color} />
      </svg>

      <div className="text-center -mt-1">
        <p className="text-2xl font-bold font-display" style={{ color: lvl.color }}>
          {aqi}{" "}
          <span className="text-sm font-medium font-sans text-text-muted">AQI</span>
        </p>
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold mt-0.5"
          style={{
            background: lvl.bg,
            color:      lvl.color,
            border:     `1px solid ${lvl.color}40`,
          }}
        >
          {lvl.label}
        </span>
      </div>
    </div>
  );
}
AQIGauge.displayName = "AQIGauge";

AQIGauge.propTypes = {
  aqi: PropTypes.number,
};

export default React.memo(AQIGauge);