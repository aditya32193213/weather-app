import React, { useMemo } from "react";
import SectionLabel from "../ui/SectionLabel";
import Skeleton from "../ui/Skeleton";
import HourlyChart from "../charts/HourlyChart";
import { EmptyState } from "../ui/EmptyState";
import PropTypes from "prop-types";
import { toFahrenheit } from "../../utils/format";


// Stable skeleton array — prevents JSX recreation inside the loading branch.
const CHART_SKELETONS = Array.from({ length: 6 }, (_, i) => (
  <Skeleton key={i} h="h-72" w="w-full" className="rounded-2xl" />
));

const HourlyChartsContainer = React.memo(function HourlyChartsContainer({
  hourly,
  airHourly,
  tempUnit,
  isToday,
  weatherLoading,
  airLoading,
  weatherError,
  airError,
  timezone,
}) {
  // ── All hooks — unconditional, before any early return ────────────────────

  const tempData = useMemo(
    () =>
      tempUnit === "C"
        ? hourly?.temperature_2m
        : hourly?.temperature_2m?.map(toFahrenheit) ?? [],
    [hourly, tempUnit]
  );

  const visibilityKmData = useMemo(
    () =>
      hourly?.visibility?.map((v) =>
        Number.isFinite(v) ? Number((v / 1000).toFixed(1)) : null
      ),
    [hourly]
  );

  const aqLabels = useMemo(
    () => airHourly?.time || hourly?.time || [],
    [airHourly, hourly]
  );

  // FIX (MEDIUM): connectNulls is now a per-dataset property passed down to
  // HourlyChart, which reads ds.connectNulls instead of applying it globally.
  //
  // Rules applied:
  //   • Temperature & Humidity — connectNulls: true. A brief sensor gap in
  //     continuous measurements is safely interpolated.
  //   • Precipitation — bar chart; connectNulls is irrelevant for Bar elements.
  //   • Visibility — connectNulls: false. Connecting across a null slot implies
  //     a smooth transition when there is actually missing data — misleading.
  //   • Wind Speed — connectNulls: false. Same reasoning as visibility.
  //   • PM10 / PM2.5 — connectNulls: false. Bridging null AQ readings with a
  //     visual line would show air quality "improving" during data gaps, which
  //     is actively misleading for environmental data.

  const tempDatasets = useMemo(
    () => [{
      label:        "Temperature",
      unit:         tempUnit === "C" ? "°C" : "°F",
      data:         tempData,
      color:        "#f97316",
      connectNulls: true,
    }],
    [tempUnit, tempData]
  );

  const rhDatasets = useMemo(
    () => [{
      label:        "Humidity",
      unit:         "%",
      data:         hourly?.relative_humidity_2m ?? [],
      color:        "#38bdf8",
      connectNulls: true,
    }],
    [hourly]
  );

  const precipDatasets = useMemo(
    () => [{
      label: "Precipitation",
      unit:  "mm",
      // FIX: Use null for missing values instead of 0. Charting a missing slot
      // as 0 creates false-zero bars that look like real "no-rain" readings.
      // Chart.js / Recharts skip null points cleanly.
      data:  hourly?.precipitation?.map((v) => (Number.isFinite(v) ? v : null)) ?? [],
      color: "#818cf8",
      // connectNulls is irrelevant for bar charts — omitted intentionally.
    }],
    [hourly]
  );

  const visDatasets = useMemo(
    () => [{
      label:        "Visibility",
      unit:         "km",
      data:         visibilityKmData ?? [],
      color:        "#34d399",
      connectNulls: false,
    }],
    [visibilityKmData]
  );

  const windDatasets = useMemo(
    () => [{
      label:        "Wind Speed",
      unit:         "km/h",
      data:         hourly?.wind_speed_10m ?? [],
      color:        "#facc15",
      connectNulls: false,
    }],
    [hourly]
  );

  const aqDatasets = useMemo(() => {
    const pm10Data = airHourly?.pm10  ?? [];
    const pm25Data = airHourly?.pm2_5 ?? [];
    const length   = Math.min(aqLabels.length, pm10Data.length, pm25Data.length);

    return [
      {
        label:        "PM10",
        unit:         "μg/m³",
        // FIX: Use null for missing values instead of 0 — same reason as
        // precipDatasets above. A 0 μg/m³ reading looks like clean air, which
        // is misleading when the sensor simply has no data for that slot.
        data:         pm10Data.slice(0, length).map((v) => (Number.isFinite(v) ? v : null)),
        color:        "#f87171",
        connectNulls: false,
      },
      {
        label:        "PM2.5",
        unit:         "μg/m³",
        data:         pm25Data.slice(0, length).map((v) => (Number.isFinite(v) ? v : null)),
        color:        "#c084fc",
        connectNulls: false,
      },
    ];
  }, [airHourly, aqLabels]);

  // ── Early returns — after all hooks ──────────────────────────────────────

  if (weatherLoading || airLoading) {
    return (
      <div className="animate-fade-up-7 mt-6 space-y-3">
        <SectionLabel icon="📈">Hourly Breakdown</SectionLabel>
        <div className="space-y-3">{CHART_SKELETONS}</div>
      </div>
    );
  }

  if (!hourly?.time?.length && !airHourly?.time?.length) {
    return (
      <div className="animate-fade-up-7 mt-6 space-y-3">
        <SectionLabel icon="📈">Hourly Breakdown</SectionLabel>
        <EmptyState message="No hourly data available." />
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="animate-fade-up-7 mt-6 space-y-3">
      <SectionLabel icon="📈">Hourly Breakdown</SectionLabel>

      <HourlyChart title={`Temperature (${tempUnit === "C" ? "°C" : "°F"})`} labels={hourly?.time} datasets={tempDatasets}  type="line" isToday={isToday} loading={weatherLoading} error={weatherError} timezone={timezone} />
      <HourlyChart title="Relative Humidity"   labels={hourly?.time} datasets={rhDatasets}     type="line" isToday={isToday} loading={weatherLoading} error={weatherError} timezone={timezone} />
      <HourlyChart title="Precipitation"       labels={hourly?.time} datasets={precipDatasets} type="bar"  isToday={isToday} loading={weatherLoading} error={weatherError} timezone={timezone} />
      <HourlyChart title="Visibility"          labels={hourly?.time} datasets={visDatasets}    type="line" isToday={isToday} loading={weatherLoading} error={weatherError} timezone={timezone} />
      <HourlyChart title="Wind Speed (10m)"    labels={hourly?.time} datasets={windDatasets}   type="line" isToday={isToday} loading={weatherLoading} error={weatherError} timezone={timezone} />
      <HourlyChart title="PM10 & PM2.5"        labels={aqLabels}     datasets={aqDatasets}     type="line" isToday={isToday} loading={airLoading} error={airError}     timezone={timezone} />
    </div>
  );
});
HourlyChartsContainer.displayName = "HourlyChartsContainer";

HourlyChartsContainer.propTypes = {
  hourly: PropTypes.shape({
    time:                 PropTypes.arrayOf(PropTypes.string),
    temperature_2m:       PropTypes.arrayOf(PropTypes.number),
    relative_humidity_2m: PropTypes.arrayOf(PropTypes.number),
    precipitation:        PropTypes.arrayOf(PropTypes.number),
    visibility:           PropTypes.arrayOf(PropTypes.number),
    wind_speed_10m:       PropTypes.arrayOf(PropTypes.number),
  }),
  airHourly: PropTypes.shape({
    time:  PropTypes.arrayOf(PropTypes.string),
    pm10:  PropTypes.arrayOf(PropTypes.number),
    pm2_5: PropTypes.arrayOf(PropTypes.number),
  }),
  tempUnit:       PropTypes.oneOf(["C", "F"]),
  isToday:        PropTypes.bool,
  weatherLoading: PropTypes.bool,
  airLoading:     PropTypes.bool,
  weatherError:   PropTypes.instanceOf(Error),
  airError:       PropTypes.instanceOf(Error),
  timezone:       PropTypes.string,
};

export default HourlyChartsContainer;