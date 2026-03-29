import { useHomeState }          from "../hooks/useHomeState";
import HeroSection               from "../component/layout/HeroSection";
import WeatherParametersGrid     from "../component/layout/WeatherParametersGrid";
import HourlyChartsContainer     from "../component/layout/HourlyChartsContainer";
import SecondaryParametersGrid   from "../component/layout/SecondaryParametersGrid";
import AirQualityGrid            from "../component/layout/AirQualityGrid";
import Skeleton                  from "../component/ui/Skeleton";
import HourlyStrip               from "../component/weather/HourlyStrip";

export default function Home() {
  const {
    // Date
    date, setDate, dateStr, isToday,
    // GPS
    coords, coordsCacheAge, locationName, tz, gpsError, gpsDetected, gpsLoading,
    // Temperature
    tempUnit, setTempUnit, convertTemp, tempLabel,
    // Data
    weatherData, airCurrent,
    hourly, daily, current, airHourly,
    // Loading / error
    weatherLoading, airLoading, weatherError, airError,
    isLoading, showFetchError, weatherMsg, airMsg,
    // Actions
    handleRetry,
  } = useHomeState();

  return (
    <div
      className="max-w-7xl mx-auto px-4 md:px-6 py-6 pb-24 space-y-2"
      aria-busy={isLoading}
    >
      {/* GPS permission / fallback notice */}
      {gpsError && (
        <div
          role="alert"
          aria-live="polite"
          className="rounded-xl px-4 py-3 text-sm flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 mb-2 shadow-sm"
        >
          <svg
            className="w-4 h-4 flex-shrink-0"
            fill="none" viewBox="0 0 24 24"
            stroke="currentColor" strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
            />
          </svg>
          {gpsError}
        </div>
      )}

      {/* API fetch error with retry action */}
      {showFetchError && (
        <div
          role="alert"
          aria-live="assertive"
          className="rounded-xl px-4 py-3 text-sm flex items-center justify-between gap-2 bg-red-500/10 border border-red-500/20 text-red-400 mb-4 shadow-sm"
        >
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4 flex-shrink-0"
              fill="none" viewBox="0 0 24 24"
              stroke="currentColor" strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            {weatherMsg && airMsg
              ? "Failed to connect to API"
              : weatherMsg || airMsg}
          </div>
          <button
            disabled={isLoading}
            onClick={handleRetry}
            className={`flex-shrink-0 ml-2 px-3 py-1 rounded-lg text-xs font-semibold border transition-colors
              ${isLoading
                ? "opacity-50 cursor-not-allowed border-red-400/20"
                : "border-red-400/30 hover:bg-red-500/10 cursor-pointer"
              }`}
          >
            {isLoading ? "Retrying..." : "Retry"}
          </button>
        </div>
      )}

      <HeroSection
        location={{ coords, coordsCacheAge, locationName, timezone: tz, gpsDetected, gpsLoading }}
        dateState={{ date, setDate, isToday }}
        tempState={{ tempUnit, setTempUnit, convertTemp, tempLabel }}
        weatherData={weatherData}
        airCurrent={airCurrent}
        weatherLoading={weatherLoading}
        airLoading={airLoading}
      />

      <div className="animate-fade-up-3 mt-6">
        {weatherLoading ? (
          <Skeleton h="h-28" w="w-full" className="rounded-2xl" />
        ) : (
          <HourlyStrip
            hourly={hourly}
            tempUnit={tempUnit}
            selectedDate={dateStr}
            timezone={tz}
          />
        )}
      </div>

      <section className="space-y-4">
        <WeatherParametersGrid
          weatherLoading={weatherLoading}
          current={current}
          daily={daily}
          hourly={hourly}
          isToday={isToday}
          tz={tz}
          weatherError={weatherError}
          onRetry={handleRetry}
        />

        <AirQualityGrid
          airLoading={airLoading}
          airCurrent={airCurrent}
          airError={airError}
          onRetry={handleRetry}
        />

        <SecondaryParametersGrid
          weatherLoading={weatherLoading}
          daily={daily}
          isToday={isToday}
        />
      </section>

      {isLoading ? (
        <Skeleton h="h-96" w="w-full" className="rounded-2xl" />
      ) : (
        <HourlyChartsContainer
          hourly={hourly}
          airHourly={airHourly}
          tempUnit={tempUnit}
          isToday={isToday}
          weatherLoading={weatherLoading}
          airLoading={airLoading}
          weatherError={weatherError}
          airError={airError}
          timezone={tz}
        />
      )}
    </div>
  );
}