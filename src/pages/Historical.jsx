import { useGPSContext }    from "../context/GPSContext";
import { useHistoricalData } from "../hooks/useHistoricalData";
import { useChartData }      from "../hooks/useChartData";
import DateRangePicker       from "../component/layout/DateRangePicker";
import HistoricalChart       from "../component/charts/HistoricalCharts";
import SectionLabel          from "../component/ui/SectionLabel";
import { getTzAbbr }         from "../utils/timezone";

// Page 2 assignment requirement: "Sunrise & Sunset (Display time as per IST)".
// IST_TZ is hardcoded here so the sun-cycle chart always shows times in
// Asia/Kolkata regardless of the user's GPS timezone. The chart data conversion
// must also happen in useChartData (passing "Asia/Kolkata" as the resolved
// timezone for sunrise/sunset processing).
const IST_TZ = "Asia/Kolkata";

// ─── Page component ───────────────────────────────────────────────────────────

export default function Historical() {
  const { coords, locationName } = useGPSContext();

  const {
    weatherData,
    airData,
    weatherLoading,
    airLoading,
    error,
    fetchedRange,
    isStale,
    setIsStale,
    today,
    doFetch,
    ARCHIVE_LAG_DAYS,
  } = useHistoricalData();

  const optimizedChartData = useChartData(weatherData, airData);

  // General timezone abbreviation derived from chart data — used for non-IST
  // sections. NOT used for the sun-cycle chart (see istAbbr below).
  const tzAbbr = getTzAbbr(optimizedChartData?.resolvedTZ);

  // IST abbreviation for the Sun Cycle chart — always "IST" / "UTC+5:30".
  // The assignment explicitly requires sunrise & sunset to display in IST
  // regardless of the user's physical location.
  // NOTE: The sunrise/sunset values inside optimizedChartData must also be
  // converted to IST inside useChartData by resolving "Asia/Kolkata" for
  // those fields — fixing this label alone is not sufficient.
  const istAbbr = getTzAbbr(IST_TZ);

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-8">

      {/* Page header */}
      <div className="animate-fade-up-1">
        <div className="flex items-center gap-2 mb-1">
          <svg
            className="w-4 h-4 text-indigo-400"
            fill="none" viewBox="0 0 24 24"
            stroke="currentColor" strokeWidth={2}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <span className="text-xs text-indigo-400 font-medium font-mono">
            HISTORICAL ANALYSIS
          </span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight font-display text-text-primary">
          Weather Trends
        </h1>
        <p className="text-sm mt-1 text-text-muted">
          Analyze up to 2 years of weather data for {locationName}
        </p>
      </div>

      {/* Date range picker + presets */}
      <DateRangePicker
        coords={coords}
        weatherLoading={weatherLoading}
        weatherData={weatherData}
        archiveLagDays={ARCHIVE_LAG_DAYS}
        today={today}
        onFetch={doFetch}
        onStale={setIsStale}
      />

      {/* Stale data notice */}
      {isStale && !weatherLoading && weatherData && (
        <div
          role="status"
          className="rounded-xl px-4 py-3 text-sm flex items-center justify-between gap-2 bg-amber-500/10 border border-amber-500/20 text-amber-400"
        >
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            <span>
              Date range changed — charts show previous results. Click <strong>Analyze</strong> to refresh.
            </span>
          </div>
        </div>
      )}

      {/* API error with retry */}
      {error && (
        <div
          role="alert"
          aria-live="assertive"
          className="rounded-xl px-4 py-3 text-sm flex items-center justify-between gap-2 bg-red-500/10 border border-red-500/20 text-red-400"
        >
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
          {/* FIX (MEDIUM): Previously there was no retry affordance on Page 2.
              Users who hit an API error had no way to recover without reloading.
              Retry re-invokes doFetch with the last fetched range and
              forceRefresh=true to bypass the stale cache entry. */}
          {fetchedRange && (
            <button
              onClick={() => doFetch(fetchedRange.start, fetchedRange.end, true)}
              className="shrink-0 px-3 py-1 rounded-lg text-xs font-semibold border border-red-400/40 hover:bg-red-400/10 transition-colors"
              aria-label="Retry the failed data fetch"
            >
              Retry
            </button>
          )}
        </div>
      )}

      {/* Loading skeletons */}
      {weatherLoading && (
        <div className="space-y-4">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="rounded-2xl h-52 animate-pulse bg-skeleton" />
          ))}
        </div>
      )}

      {/* Charts */}
      {optimizedChartData && !weatherLoading && (
        <>
          {/* "Showing results for" badge */}
          {fetchedRange && (
            <div className="animate-fade-up flex items-center gap-3 flex-wrap">
              <span className="text-sm text-text-secondary">Showing results for</span>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono">
                {fetchedRange.start} → {fetchedRange.end}
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20 font-mono">
                {fetchedRange.days} days
              </span>
              {optimizedChartData.factor > 1 && (
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-mono">
                  Aggregated ({optimizedChartData.factor}-day periods)
                </span>
              )}
            </div>
          )}

          {/* AQ data gap notice */}
          {!airLoading && optimizedChartData.pm10Empty && (
            <div
              role="status"
              className="rounded-xl px-4 py-3 text-sm flex items-start gap-2 bg-sky-500/10 border border-sky-500/20 text-sky-400"
            >
              <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>
                <strong>PM10 &amp; PM2.5 data unavailable for this range.</strong>{" "}
                The CAMS air quality reanalysis dataset only covers approximately the last 3 months.
              </span>
            </div>
          )}

          <div className="space-y-5">
            <SectionLabel icon="🌡️">Temperature Trends</SectionLabel>
            <HistoricalChart
              title="Mean / Max / Min Temperature"
              unit="°C"
              labels={optimizedChartData.time}
              type="line"
              datasets={optimizedChartData.tempDatasets}
            />

            {/* istAbbr is always "IST" — enforces the Page 2 assignment requirement
                that sunrise/sunset times are displayed in Asia/Kolkata time. */}
            <SectionLabel icon="🌅">Sun Cycle ({istAbbr})</SectionLabel>
            <HistoricalChart
              title={`Sunrise & Sunset (${istAbbr})`}
              unit={`hh:mm ${istAbbr}`}
              labels={optimizedChartData.time}
              type="area"
              isTimeChart
              datasets={optimizedChartData.sunDatasets}
            />

            <SectionLabel icon="🌧️">Precipitation</SectionLabel>
            <HistoricalChart
              title={
                optimizedChartData.factor > 1
                  ? "Aggregated Precipitation Total"
                  : "Daily Precipitation Total"
              }
              unit="mm"
              labels={optimizedChartData.time}
              type="bar"
              datasets={optimizedChartData.precipDatasets}
            />

            <SectionLabel icon="💨">Wind</SectionLabel>
            <HistoricalChart
              title="Max Wind Speed & Dominant Direction"
              unit="km/h (left axis) · degrees° (right axis)"
              labels={optimizedChartData.time}
              type="composed"
              datasets={optimizedChartData.windSpeedDatasets}
              secondaryDatasets={optimizedChartData.windDirDatasets}
              secondaryYDomain={[0, 360]}
              primaryUnit="km/h"
              secondaryUnit="°"
            />

            <SectionLabel icon="🏭">Air Quality</SectionLabel>
            {airLoading ? (
              <div className="rounded-2xl h-64 animate-pulse bg-skeleton" />
            ) : (
              <HistoricalChart
                title="PM10 & PM2.5 Levels"
                unit="μg/m³"
                labels={optimizedChartData.time}
                type="line"
                datasets={optimizedChartData.aqDatasets}
              />
            )}
          </div>
        </>
      )}

      {/* Empty state */}
      {!weatherData && !weatherLoading && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-5 bg-indigo-500/10 border border-indigo-500/20">
            <svg
              className="w-9 h-9 text-text-faint"
              fill="none" viewBox="0 0 24 24"
              stroke="currentColor" strokeWidth={1.5}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold mb-2 font-display text-text-secondary">
            No data selected
          </h3>
          <p className="text-sm max-w-xs text-text-muted">
            Click a quick-select preset above (it auto-fetches!), or pick a custom date range and click Analyze.
          </p>
        </div>
      )}
    </div>
  );
}