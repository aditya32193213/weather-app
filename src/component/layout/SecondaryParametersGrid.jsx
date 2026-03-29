import React from "react";
import PropTypes from "prop-types";
import UVBar from "../weather/UVBar";
import StatCard from "../ui/StatCard";
import Skeleton from "../ui/Skeleton";
import SectionLabel from "../ui/SectionLabel";

const SecondaryParametersGrid = React.memo(function SecondaryParametersGrid({
  weatherLoading,
  daily,
  isToday,
}) {
  return (
    <div className="animate-fade-up-5 mt-6">
      {/* Section heading — matches the pattern used by WeatherParametersGrid
          and AirQualityGrid so all three sections have consistent labelling. */}
      <SectionLabel icon="🌬️">UV &amp; Wind</SectionLabel>

      {weatherLoading ? (
        // Mirrors the real layout: 1 full-width + 2-column sub-grid.
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Skeleton h="h-28" w="w-full" className="rounded-2xl md:col-span-1" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton h="h-28" w="w-full" className="rounded-2xl" />
            <Skeleton h="h-28" w="w-full" className="rounded-2xl" />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {daily?.uv_index_max?.[0] != null ? (
            <UVBar value={daily.uv_index_max[0]} />
          ) : (
            <StatCard
              label="UV Index"
              value="N/A"
              icon="☀️"
              accent="#facc15"
              isLoaded
              trend="History unavailable"
            />
          )}

          <div className="grid grid-cols-2 gap-3">
            <StatCard
              label="Max Wind Speed"
              value={daily?.wind_speed_10m_max?.[0]}
              unit="km/h"
              icon="💨"
              accent="#34d399"
              isLoaded={!weatherLoading}
            />

            {/* Precipitation probability is a forecast-only field.
                value=null → "—", no isError → no "Data unavailable",
                trend hint tells the user why the value is absent.    */}
            <StatCard
              label="Precip. Prob. Max"
              value={isToday ? daily?.precipitation_probability_max?.[0] : null}
              unit={isToday ? "%" : undefined}
              icon="🌂"
              accent="#f97316"
              isLoaded={!weatherLoading}
              trend={!isToday ? "Forecast only" : undefined}
            />
          </div>
        </div>
      )}
    </div>
  );
});
SecondaryParametersGrid.displayName = "SecondaryParametersGrid";

SecondaryParametersGrid.propTypes = {
  weatherLoading: PropTypes.bool,
  daily: PropTypes.shape({
    uv_index_max:                  PropTypes.arrayOf(PropTypes.number),
    wind_speed_10m_max:            PropTypes.arrayOf(PropTypes.number),
    precipitation_probability_max: PropTypes.arrayOf(PropTypes.number),
  }),
  isToday: PropTypes.bool,
};

export default SecondaryParametersGrid;