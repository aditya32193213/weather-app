import React, {
  useState, useMemo, useCallback, useEffect, useId,
} from "react";
import PropTypes from "prop-types";
import {
  LineChart,      Line,
  AreaChart,      Area,
  BarChart,       Bar,
  ComposedChart,
  XAxis,          YAxis,
  CartesianGrid,  Tooltip,
  Legend,         Brush,
  ResponsiveContainer,
} from "recharts";
import dayjs from "dayjs";
import { useIsMobile } from "../../hooks/useIsMobile";
import {
  SharedTooltip, SharedLegend, ZoomControls, formatTimeValue,
} from "./ChartShared";
import { EmptyState } from "../ui/EmptyState";

// ─── Shared axis configuration ────────────────────────────────────────────────

const xAxisProps = {
  tick:       { fill: "var(--text-faint)", fontSize: 10, fontFamily: "var(--font-mono)" },
  tickLine:   false,
  axisLine:   false,
  minTickGap: 20,
  tickFormatter: (v) => dayjs(v).format("DD MMM"),
};

const makeYAxisProps = (formatFn, domain) => ({
  tick:          { fill: "var(--text-faint)", fontSize: 10, fontFamily: "var(--font-mono)" },
  tickLine:      false,
  axisLine:      false,
  width:         48,
  tickFormatter: formatFn,
  domain:        domain ?? ["auto", "auto"],
});

const brushBaseProps = {
  height:         22,
  stroke:         "rgba(56,189,248,0.3)",
  fill:           "rgba(56,189,248,0.05)",
  travellerWidth: 10,
  tickFormatter:  (v) => (dayjs(v).isValid() ? dayjs(v).format("MMM D") : v),
};

const MIN_ZOOM_WINDOW = 7;

// ─── Dataset PropType shape ───────────────────────────────────────────────────

const datasetShape = PropTypes.shape({
  label: PropTypes.string.isRequired,
  unit:  PropTypes.string,
  data:  PropTypes.arrayOf(PropTypes.number),
  color: PropTypes.string,
});

// ─── ComposedTooltip ──────────────────────────────────────────────────────────

/**
 * Tooltip for dual-Y-axis composed charts.
 *
 * RULES OF HOOKS FIX:
 * `useMemo` MUST be called before any conditional return. Previously the
 * `if (!active || !payload?.length) return null` guard appeared before the
 * useMemo call, violating Rules of Hooks.
 */
const ComposedTooltip = React.memo(function ComposedTooltip({
  active, payload, label, isHistorical,
  primaryUnit, secondaryUnit,
  datasets, secondaryDatasets,
}) {
  const unitMap = useMemo(() => {
    const map = new Map();
    (datasets          || []).forEach((ds) => { if (ds.unit) map.set(ds.label, ds.unit); });
    (secondaryDatasets || []).forEach((ds) => { if (ds.unit) map.set(ds.label, ds.unit); });
    return map;
  }, [datasets, secondaryDatasets]);

  if (!active || !payload?.length) return null;

  const displayLabel =
    isHistorical && dayjs(label).isValid()
      ? dayjs(label).format("MMM D, YYYY")
      : label;

  const getUnit = (name) => {
    if (unitMap.has(name)) return unitMap.get(name);
    if (secondaryDatasets?.some((ds) => ds.label === name)) return secondaryUnit ?? "";
    return primaryUnit ?? "";
  };

  return (
    <div style={{
      background:     "var(--surface-solid)",
      border:         "1px solid rgba(56,189,248,0.25)",
      borderRadius:   12,
      padding:        "10px 14px",
      minWidth:       180,
      backdropFilter: "blur(12px)",
      boxShadow:      "0 8px 32px rgba(0,0,0,0.15)",
    }}>
      <p style={{ color: "var(--text-muted)", fontSize: 11, fontFamily: "var(--font-mono)", marginBottom: 6 }}>
        {displayLabel}
      </p>
      {payload.map((entry, i) => {
        const key = entry.name ?? entry.dataKey ?? i;

        return (
          <div
            key={key}
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 2 }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-secondary)" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: entry.color, display: "inline-block", flexShrink: 0 }} />
              {entry.name}
            </span>
            <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--text-primary)", fontSize: 12 }}>
              {typeof entry.value === "number"
                ? `${entry.value.toFixed(1)} ${getUnit(entry.name)}`
                : "—"}
            </span>
          </div>
        );
      })}
    </div>
  );
});
ComposedTooltip.displayName = "ComposedTooltip";

// ─── HistoricalChart ──────────────────────────────────────────────────────────

export default function HistoricalChart({
  title,
  unit,
  labels            = [],
  datasets          = [],
  type              = "line",
  isTimeChart       = false,
  yDomain,
  secondaryDatasets,
  secondaryYDomain,
  primaryUnit,
  secondaryUnit,
  loading           = false,
}) {
  const chartId  = useId().replace(/:/g, "");
  const isMobile = useIsMobile();

  const [brushIndices, setBrushIndices] = useState(() => ({
    startIndex: 0,
    endIndex:   Math.max(0, labels.length - 1),
  }));

  const [isCollapsed, setIsCollapsed] = useState(false);

  // ── Chart data ────────────────────────────────────────────────────────────

  const chartData = useMemo(
    () =>
      labels.map((label, i) =>
        [...(datasets || []), ...(secondaryDatasets || [])].reduce(
          (acc, ds) => {
            acc[ds.label] = ds.data?.[i] ?? null;
            return acc;
          },
          { time: label }
        )
      ),
    [labels, datasets, secondaryDatasets]
  );

  // FIX: Using [labels] directly causes unnecessary brush resets on every parent
  // re-render that creates a new array reference for the same data. A stable
  // string key — identical to how HourlyChart avoids the same problem — prevents
  // the user's zoom selection from being discarded on unrelated re-renders.
  const midIdx    = Math.floor(labels.length / 2);
  const labelsKey = `${labels.length}:${labels[0] ?? ""}:${labels[midIdx] ?? ""}:${labels.at(-1) ?? ""}`;

  useEffect(() => {
    if (chartData.length > 0) {
      setBrushIndices({ startIndex: 0, endIndex: chartData.length - 1 });
    }
  }, [labelsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Zoom derived state ────────────────────────────────────────────────────

  const isZoomed = useMemo(
    () =>
      chartData.length > 0 &&
      (brushIndices.startIndex > 0 ||
        brushIndices.endIndex < chartData.length - 1),
    [brushIndices, chartData.length]
  );

  const canZoomIn = useMemo(
    () => brushIndices.endIndex - brushIndices.startIndex > MIN_ZOOM_WINDOW,
    [brushIndices]
  );

  // ── Zoom handlers ─────────────────────────────────────────────────────────

  const handleZoomIn = useCallback(() => {
    const center = Math.floor((brushIndices.startIndex + brushIndices.endIndex) / 2);
    const half   = Math.floor((brushIndices.endIndex - brushIndices.startIndex) / 4);
    setBrushIndices({
      startIndex: Math.max(0, center - half),
      endIndex:   Math.min(chartData.length - 1, center + half),
    });
  }, [brushIndices, chartData.length]);

  const handleZoomOut = useCallback(() => {
    const span   = brushIndices.endIndex - brushIndices.startIndex;
    const expand = Math.floor(span / 2);
    setBrushIndices({
      startIndex: Math.max(0, brushIndices.startIndex - expand),
      endIndex:   Math.min(chartData.length - 1, brushIndices.endIndex + expand),
    });
  }, [brushIndices, chartData.length]);

  const handleReset = useCallback(() => {
    setBrushIndices({ startIndex: 0, endIndex: chartData.length - 1 });
  }, [chartData.length]);

  const handleBrushChange = useCallback((r) => {
    if (r?.startIndex != null && r?.endIndex != null) {
      setBrushIndices({ startIndex: r.startIndex, endIndex: r.endIndex });
    }
  }, []);

  // ── Misc chart helpers ────────────────────────────────────────────────────

  const isEmpty = !labels.length || (
    datasets.every((ds) => !ds.data?.some((v) => v != null)) &&
    (!secondaryDatasets?.length ||
      secondaryDatasets.every((ds) => !ds.data?.some((v) => v != null)))
  );

  const primaryColor = datasets[0]?.color ?? "#38bdf8";

  // FIX (MEDIUM): Previous floor of 800px forced a scrollable chart for 7-day
  // ranges (800px for 7 bars is terrible UX on mobile). New formula scales with
  // data density and uses a lower mobile floor.
  const minWidth = isMobile
    ? Math.max(320, chartData.length * 18)
    : Math.max(400, chartData.length * 8);

  const yFormatter = isTimeChart
    ? (v) => (v == null ? "—" : formatTimeValue(v))
    : (v) => (typeof v === "number" ? v.toFixed(0) : v);

  const secondaryFormatter = (v) => (typeof v === "number" ? v.toFixed(0) : v);

  const sharedChartProps = {
    data:   chartData,
    margin: { top: 5, right: 16, left: -10, bottom: isMobile ? 30 : 10 },
  };

  // ── Chart renderers ───────────────────────────────────────────────────────
  // FIX (CRITICAL): The original code wrapped entire JSX chart trees in
  // `useMemo`. This is an anti-pattern for four reasons:
  //   A — useMemo is for expensive computations, not JSX elements; React
  //       already reconciles unchanged subtrees without extra memoization.
  //   B — sharedChartProps, yAxisEl, tooltipEl, legendEl, and brushEl were
  //       referenced inside the useMemo but MISSING from the deps arrays,
  //       causing stale closures: axis/tooltip config would silently render
  //       stale values when brushIndices changed but chartData didn't.
  //   C — Every useMemo block needed `eslint-disable` to suppress the
  //       exhaustive-deps warning — a strong signal the pattern is wrong.
  //   D — `renderChart()` was a plain function called in JSX, so the memoized
  //       values were re-evaluated on every render anyway (no benefit at all).
  //
  // Fix: render chart JSX directly inside renderChart(). React reconciliation
  // handles the rest. Use React.memo on child components if memoization is
  // genuinely needed for a specific subtree.

  const renderChart = () => {
    const brushEl = (
      <Brush
        dataKey="time"
        {...brushBaseProps}
        startIndex={brushIndices.startIndex}
        endIndex={brushIndices.endIndex}
        onChange={handleBrushChange}
      />
    );

    const tooltipEl = (
      <Tooltip
        content={<SharedTooltip isHistorical isTimeChart={isTimeChart} />}
        cursor={{ stroke: "rgba(56,189,248,0.15)", strokeWidth: 1 }}
      />
    );

    const legendEl = <Legend content={<SharedLegend />} />;
    const yAxisEl  = <YAxis {...makeYAxisProps(yFormatter, yDomain)} />;

    if (type === "area") {
      return (
        <AreaChart {...sharedChartProps}>
          <defs>
            {datasets.map((ds, i) => (
              <linearGradient key={`${chartId}-grad-${ds.label}`} id={`areaGrad_${chartId}_${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={ds.color} stopOpacity={0.25} />
                <stop offset="95%" stopColor={ds.color} stopOpacity={0.02} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="2 4" stroke="var(--divider)" vertical={false} />
          <XAxis dataKey="time" {...xAxisProps} />
          {yAxisEl}{tooltipEl}{legendEl}{brushEl}
          {datasets.map((ds, i) => (
            <Area
              key={`${chartId}-${ds.label}`}
              type="monotone"
              dataKey={ds.label}
              name={ds.label}
              unit={ds.unit}
              stroke={ds.color}
              strokeWidth={2}
              fill={`url(#areaGrad_${chartId}_${i})`}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
              connectNulls
            />
          ))}
        </AreaChart>
      );
    }

    if (type === "bar") {
      return (
        <BarChart {...sharedChartProps} barCategoryGap="30%">
          <CartesianGrid strokeDasharray="2 4" stroke="var(--divider)" vertical={false} />
          <XAxis dataKey="time" {...xAxisProps} />
          {yAxisEl}{tooltipEl}{legendEl}{brushEl}
          {datasets.map((ds) => (
            <Bar
              key={`${chartId}-${ds.label}`}
              dataKey={ds.label}
              name={ds.label}
              unit={ds.unit}
              fill={ds.color}
              radius={[3, 3, 0, 0]}
              maxBarSize={14}
              opacity={0.8}
            />
          ))}
        </BarChart>
      );
    }

    if (type === "composed") {
      return (
        <ComposedChart {...sharedChartProps}>
          <CartesianGrid strokeDasharray="2 4" stroke="var(--divider)" vertical={false} />
          <XAxis dataKey="time" {...xAxisProps} />

          <YAxis yAxisId="left"  {...makeYAxisProps(yFormatter, yDomain)} />
          <YAxis
            yAxisId="right"
            orientation="right"
            {...makeYAxisProps(secondaryFormatter, secondaryYDomain ?? ["auto", "auto"])}
            width={44}
          />

          <Tooltip
            content={
              <ComposedTooltip
                isHistorical
                primaryUnit={primaryUnit}
                secondaryUnit={secondaryUnit}
                datasets={datasets}
                secondaryDatasets={secondaryDatasets}
              />
            }
            cursor={{ stroke: "rgba(56,189,248,0.15)", strokeWidth: 1 }}
          />
          {legendEl}{brushEl}

          {datasets.map((ds, i) => (
            <Line
              key={`${chartId}-${ds.label}`}
              yAxisId="left"
              type="monotone"
              dataKey={ds.label}
              name={ds.label}
              stroke={ds.color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
              strokeDasharray={i % 2 === 1 ? "4 2" : undefined}
              connectNulls
            />
          ))}
          {(secondaryDatasets || []).map((ds) => (
            <Bar
              key={`${chartId}-sec-${ds.label}`}
              yAxisId="right"
              dataKey={ds.label}
              name={ds.label}
              fill={ds.color}
              radius={[3, 3, 0, 0]}
              maxBarSize={14}
              opacity={0.7}
            />
          ))}
        </ComposedChart>
      );
    }

    // Default: line
    return (
      <LineChart {...sharedChartProps}>
        <CartesianGrid strokeDasharray="2 4" stroke="var(--divider)" vertical={false} />
        <XAxis dataKey="time" {...xAxisProps} />
        {yAxisEl}{tooltipEl}{legendEl}{brushEl}
        {datasets.map((ds, i) => (
          <Line
            key={`${chartId}-${ds.label}`}
            type="monotone"
            dataKey={ds.label}
            name={ds.label}
            unit={ds.unit}
            stroke={ds.color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
            strokeDasharray={i % 2 === 1 ? "4 2" : undefined}
            connectNulls
          />
        ))}
      </LineChart>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      className="rounded-2xl overflow-hidden transition-all duration-300 bg-surface border border-surface-border backdrop-blur-md shadow-sm"
      data-testid={`historical-chart-${title.toLowerCase().replace(/\s+/g, "-")}`}
    >
      {/* Collapsible header */}
      <button
        type="button"
        onClick={() => setIsCollapsed((c) => !c)}
        style={{
          width:        "100%",
          background:   "transparent",
          borderBottom: isCollapsed ? "none" : "1px solid var(--divider)",
        }}
        className="flex items-center justify-between px-5 py-4 cursor-pointer select-none text-left w-full"
        aria-expanded={!isCollapsed}
        aria-controls={`hist-chart-body-${chartId}`}
      >
        <div className="flex items-center gap-3">
          <span
            className="w-1.5 h-5 rounded-full flex-shrink-0"
            style={{ background: primaryColor, boxShadow: `0 0 8px ${primaryColor}60` }}
            aria-hidden="true"
          />
          <div>
            <h4 className="font-semibold text-sm font-display text-text-primary">{title}</h4>
            {unit && (
              <p className="text-[10px] font-mono text-text-faint mt-0.5">{unit}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {loading && (
            <svg
              className="w-3.5 h-3.5 animate-spin text-sky-400"
              fill="none"
              viewBox="0 0 24 24"
              aria-label="Loading"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path  className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          <svg
            className="w-4 h-4 transition-transform duration-300 text-text-muted flex-shrink-0"
            style={{ transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)" }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {!isCollapsed && (
        <div id={`hist-chart-body-${chartId}`} className="px-4 pb-4 pt-3">
          {labels.length > 731 ? (
            <div className="text-red-400 text-sm text-center py-6">
              Date range exceeds 2-year limit — please narrow your selection.
            </div>
          ) : isEmpty ? (
            <EmptyState message="No data available" className="py-10" />
          ) : (
            <>
              <div className="flex items-center justify-end mb-2">
                <ZoomControls
                  onZoomIn={handleZoomIn}
                  onZoomOut={handleZoomOut}
                  onReset={handleReset}
                  isZoomed={isZoomed}
                  canZoomIn={canZoomIn}
                />
              </div>

              <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: "touch" }}>
                <div style={{ minWidth }}>
                  <ResponsiveContainer width="100%" height={280} aria-busy={loading}>
                    {renderChart()}
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
HistoricalChart.displayName = "HistoricalChart";

HistoricalChart.propTypes = {
  title:             PropTypes.string.isRequired,
  unit:              PropTypes.string,
  labels:            PropTypes.arrayOf(PropTypes.string),
  datasets:          PropTypes.arrayOf(datasetShape),
  type:              PropTypes.oneOf(["line", "area", "bar", "composed"]),
  isTimeChart:       PropTypes.bool,
  yDomain:           PropTypes.array,
  secondaryDatasets: PropTypes.arrayOf(datasetShape),
  secondaryYDomain:  PropTypes.array,
  primaryUnit:       PropTypes.string,
  secondaryUnit:     PropTypes.string,
  loading:           PropTypes.bool,
};