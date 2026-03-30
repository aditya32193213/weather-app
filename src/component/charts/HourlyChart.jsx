import React, {
  useState, useMemo, useCallback, useEffect, useId,
} from "react";
import PropTypes from "prop-types";
import {
  LineChart, Line,
  BarChart,  Bar,
  XAxis,     YAxis,
  CartesianGrid, Tooltip,
  Legend,    ReferenceLine,
  Brush,     ResponsiveContainer,
} from "recharts";
import dayjs from "dayjs";
import { useIsMobile } from "../../hooks/useIsMobile";
import { SharedTooltip, SharedLegend, ZoomControls } from "./ChartShared";
import { resolveTimezone } from "../../utils/timezone";
import { EmptyState } from "../ui/EmptyState";

const MIN_ZOOM_WINDOW = 5;

export default function HourlyChart({
  title,
  labels   = [],
  datasets = [],
  type     = "line",
  isToday  = false,
  error    = null,
  loading  = false,
  timezone = "auto",
}) {
  const chartId  = useId().replace(/:/g, "");
  const isMobile = useIsMobile();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [brushIndices, setBrushIndices] = useState({ startIndex: 0, endIndex: 0 });

  // FIX (🟡 MEDIUM): resolvedTz is now computed once here and shared between
  // chartData (label formatting) and currentHour (ReferenceLine position).
  // Previously chartData used `dayjs(time).format("HH:mm")` which parsed
  // Open-Meteo naive timestamps in the *browser's local timezone*. For a user
  // in UTC+5:30 viewing London data, every label was 5.5 hours off and the
  // "Now" ReferenceLine could never align with an actual label — it pointed to
  // an HH:mm value that didn't exist in the XAxis tick set.
  const resolvedTz = useMemo(() => resolveTimezone(timezone), [timezone]);

  // FIX (#3 🟡 MEDIUM): Include the midpoint label so that two date-ranges with
  // the same length but different dates produce distinct keys. e.g. today's 24h
  // vs yesterday's 24h both have length=24, same first/last *format*, but differ
  // at the midpoint (labels[12] = "2025-03-29T12:00" vs "2025-03-28T12:00").
  const midIdx    = Math.floor(labels.length / 2);
  const labelsKey = `${labels.length}:${labels[0] ?? ""}:${labels[midIdx] ?? ""}:${labels[labels.length - 1] ?? ""}`;

  // FIX (#5 🟡 MEDIUM): `datasets` is an array created by useMemo in the parent
  // (HourlyChartsContainer). Any parent re-render — even one that doesn't change
  // the actual data values — produces a new array reference, causing chartData
  // to recompute 6 × 24 = 144 iterations unnecessarily.
  // Using a string fingerprint (label + data length) as the dep keeps the memo
  // stable across identity changes while still invalidating on real data changes.
  const datasetsKey = datasets.map((d) => `${d.label}:${d.data?.length ?? 0}`).join("|");

  const chartData = useMemo(
    () =>
      labels.map((time, i) =>
        datasets.reduce(
          (acc, ds) => {
            acc[ds.label] = ds.data?.[i] ?? null;
            return acc;
          },
          {
            // FIX: `dayjs.tz(time, resolvedTz)` — static method parses the
            // Open-Meteo naive timestamp as a wall-clock time IN resolvedTz,
            // matching how Open-Meteo defines its hourly time array.
            // Was: `dayjs(time).format("HH:mm")` — parsed in browser local tz.
            time: (() => {
              const d = dayjs.tz(time, resolvedTz);
              return d.isValid() ? d.format("HH:mm") : "--";
            })(),
          }
        )
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [labelsKey, datasetsKey, resolvedTz]
  );

  useEffect(() => {
    if (chartData.length > 0) {
      setBrushIndices({ startIndex: 0, endIndex: chartData.length - 1 });
    }
  }, [labelsKey]); // intentionally keyed on labelsKey, not chartData reference

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

  // ── Chart helpers ─────────────────────────────────────────────────────────

  const currentHour = useMemo(() => {
    if (!isToday) return null;
    try {
      // Uses the already-resolved tz — consistent with chartData label format.
      return dayjs().tz(resolvedTz).startOf("hour").format("HH:mm");
    } catch {
      return dayjs().startOf("hour").format("HH:mm");
    }
  }, [isToday, resolvedTz]);

  const ChartComponent = type === "bar" ? BarChart : LineChart;

  const isEmpty =
    !labels.length ||
    datasets.every((ds) => !ds.data?.some((v) => v != null));

  const minWidth = useMemo(() => {
    const computed = Math.max(
      isMobile ? 420 : 640,
      chartData.length * (isMobile ? 18 : 26)
    );
    const cap =
      typeof window !== "undefined" ? window.innerWidth * 3 : 9_999;
    return Math.min(computed, cap);
  }, [isMobile, chartData.length]);

  const chartHeight  = isMobile ? 200 : 240;
  const primaryColor = datasets[0]?.color ?? "#38bdf8";
  const yAxisDomain  = type === "bar" ? [0, "auto"] : ["auto", "auto"];

  // ── Early returns — after all hooks ──────────────────────────────────────

  if (error) {
    const errorMessage =
      typeof error === "string"
        ? error
        : error?.message ?? "An error occurred loading this chart.";

    return (
      <div
        className="rounded-2xl text-center text-red-400 py-6 bg-surface border border-surface-border"
        data-testid={`hourly-chart-${title.toLowerCase().replace(/\s+/g, "-")}`}
      >
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs mt-1 text-red-400/70">Failed to load: {errorMessage}</p>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      className="rounded-2xl overflow-hidden transition-all duration-300 bg-surface border border-surface-border backdrop-blur-md shadow-sm"
      data-testid={`hourly-chart-${title.toLowerCase().replace(/\s+/g, "-")}`}
    >
      {/* Collapsible header */}
      <button
        type="button"
        onClick={() => setIsCollapsed((c) => !c)}
        style={{
          borderBottom: isCollapsed ? "none" : "1px solid var(--divider)",
          width:        "100%",
          background:   "transparent",
        }}
        className="flex items-center justify-between px-5 py-4 cursor-pointer select-none text-left"
        aria-expanded={!isCollapsed}
        aria-controls={`hourly-chart-body-${chartId}`}
      >
        <div className="flex items-center gap-3">
          <span
            className="w-1.5 h-5 rounded-full flex-shrink-0"
            style={{ background: primaryColor, boxShadow: `0 0 8px ${primaryColor}60` }}
            aria-hidden="true"
          />
          <h4 className="font-semibold text-sm font-display text-text-primary">
            {title}
          </h4>
        </div>
        <div className="flex items-center gap-3">
          {loading && (
            <svg className="w-3.5 h-3.5 animate-spin text-sky-400" fill="none" viewBox="0 0 24 24" aria-label="Loading">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path   className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          <span className="text-[10px] hidden sm:block font-mono text-text-faint">
            24h · hourly
          </span>
          <svg
            className="w-4 h-4 transition-transform duration-300 text-text-muted"
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
        <div id={`hourly-chart-body-${chartId}`} className="px-4 pb-4 pt-3">
          {loading ? (
            <div
              className="animate-pulse rounded-xl bg-skeleton"
              style={{ height: chartHeight + 20 }}
              aria-hidden="true"
            />
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
                  <ResponsiveContainer width="100%" height={chartHeight}>
                    <ChartComponent
                      data={chartData}
                      margin={{ top: 5, right: 16, left: -10, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="2 4" stroke="var(--divider)" vertical={false} />
                      <XAxis
                        dataKey="time"
                        tick={{ fill: "var(--text-faint)", fontSize: 10, fontFamily: "var(--font-mono)" }}
                        tickLine={false}
                        axisLine={false}
                        minTickGap={30}
                      />
                      <YAxis
                        domain={yAxisDomain}
                        tick={{ fill: "var(--text-faint)", fontSize: 10, fontFamily: "var(--font-mono)" }}
                        tickLine={false}
                        axisLine={false}
                        width={38}
                      />

                      <Tooltip
                        content={<SharedTooltip />}
                        cursor={{ stroke: "rgba(56,189,248,0.15)", strokeWidth: 1, strokeDasharray: "3 3" }}
                      />
                      <Legend content={<SharedLegend />} />

                      {currentHour && (
                        <ReferenceLine
                          x={currentHour}
                          stroke="rgba(56,189,248,0.3)"
                          strokeDasharray="3 3"
                          label={{ value: "Now", fill: "rgba(56,189,248,0.6)", fontSize: 9, fontFamily: "var(--font-mono)" }}
                        />
                      )}

                      <Brush
                        dataKey="time"
                        height={20}
                        stroke="rgba(56,189,248,0.3)"
                        fill="rgba(56,189,248,0.05)"
                        travellerWidth={isMobile ? 10 : 6}
                        startIndex={brushIndices.startIndex}
                        endIndex={brushIndices.endIndex}
                        onChange={handleBrushChange}
                      />

                      {datasets.map((ds, i) =>
                        type === "bar" ? (
                          <Bar
                            key={`${chartId}-bar-${ds.label}`}
                            dataKey={ds.label}
                            name={ds.label}
                            unit={ds.unit}
                            fill={ds.color}
                            radius={[3, 3, 0, 0]}
                            maxBarSize={14}
                            opacity={0.8}
                          />
                        ) : (
                          // connectNulls is a per-dataset property set in
                          // HourlyChartsContainer based on the semantic meaning of
                          // each series. Defaults to false so new datasets are safe.
                          <Line
                            key={`${chartId}-line-${ds.label}`}
                            type="monotone"
                            dataKey={ds.label}
                            name={ds.label}
                            unit={ds.unit}
                            stroke={ds.color}
                            strokeWidth={2}
                            dot={false}
                            activeDot={{ r: 4, fill: ds.color, strokeWidth: 0 }}
                            strokeDasharray={i % 2 === 1 ? "4 2" : undefined}
                            connectNulls={ds.connectNulls ?? false}
                          />
                        )
                      )}
                    </ChartComponent>
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
HourlyChart.displayName = "HourlyChart";

HourlyChart.propTypes = {
  title:    PropTypes.string.isRequired,
  labels:   PropTypes.arrayOf(PropTypes.string),
  datasets: PropTypes.arrayOf(
    PropTypes.shape({
      label:        PropTypes.string.isRequired,
      unit:         PropTypes.string,
      data:         PropTypes.arrayOf(PropTypes.number),
      color:        PropTypes.string,
      // connectNulls: true  = interpolate across missing slots (Temperature, Humidity)
      //               false = break the line at missing slots (Visibility, AQ) [default]
      connectNulls: PropTypes.bool,
    })
  ),
  type:     PropTypes.oneOf(["line", "bar"]),
  isToday:  PropTypes.bool,
  error:    PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.instanceOf(Error),
    PropTypes.shape({ message: PropTypes.string, type: PropTypes.string }),
  ]),
  loading:  PropTypes.bool,
  timezone: PropTypes.string,
};