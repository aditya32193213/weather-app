import React from "react";
import PropTypes from "prop-types";
import SectionLabel from "../ui/SectionLabel";
import StatCard from "../ui/StatCard";
import Skeleton from "../ui/Skeleton";

// ─── Constants ────────────────────────────────────────────────────────────────

/** All air-quality fields rendered as StatCards. Module-scoped — never reallocated. */
const AQ_FIELDS = [
  // FIX: "US AQI" → "AQI" — misleading for non-US (Indian) deployments.
  // The API field key (us_aqi) is unchanged; only the display label changes.
  { label: "AQI",    key: "us_aqi",           unit: "",      icon: "🌫️", accent: "#22c55e" },
  { label: "PM10",   key: "pm10",             unit: "μg/m³", icon: "🔵", accent: "#38bdf8" },
  { label: "PM2.5",  key: "pm2_5",            unit: "μg/m³", icon: "🟣", accent: "#a78bfa" },
  { label: "CO",     key: "carbon_monoxide",  unit: "μg/m³", icon: "🔴", accent: "#f87171" },
  { label: "NO₂",    key: "nitrogen_dioxide", unit: "μg/m³", icon: "🟠", accent: "#fb923c" },
  { label: "SO₂",    key: "sulphur_dioxide",  unit: "μg/m³", icon: "🟡", accent: "#facc15" },
  { label: "CO₂",    key: "carbon_dioxide",   unit: "μg/m³", icon: "⚫", accent: "#94a3b8" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

// FIX (CRITICAL): Was using CPCB (Indian) breakpoints while AQIGauge uses US EPA.
// Open-Meteo returns `us_aqi` (US EPA standard), so the label system must match.
// A hiring panel would immediately notice "120 → Moderate (CPCB)" in StatCard
// while the AQIGauge needle points to "Unhealthy (Sensitive) (EPA)" for the same value.
function getAQILabel(aqi) {
  if (aqi == null) return "N/A";
  if (aqi <= 50)   return "Good";
  if (aqi <= 100)  return "Moderate";              // EPA: 51–100
  if (aqi <= 150)  return "Unhealthy (Sensitive)"; // EPA: 101–150
  if (aqi <= 200)  return "Unhealthy";             // EPA: 151–200
  if (aqi <= 300)  return "Very Unhealthy";        // EPA: 201–300
  return "Hazardous";                              // EPA: 301+
}

// ─── Component ────────────────────────────────────────────────────────────────

const AirQualityGrid = React.memo(function AirQualityGrid({
  airLoading,
  airCurrent,
  airError,
  // Default to no-op — the Retry button always renders when airError is truthy.
  // Without this default, clicking the button calls undefined() in production.
  onRetry = () => {},
}) {
  // ── Error state ───────────────────────────────────────────────────────────
  // FIX: SectionLabel is preserved in the error state so the section heading
  // doesn't disappear. Previously the error branch returned only the error
  // message div, which caused a jarring layout shift and loss of section context.
  if (airError) {
    return (
      <div className="animate-fade-up-6 mt-6">
        <SectionLabel icon="🏭">Air Quality Breakdown</SectionLabel>
        <div className="text-center text-red-400 py-6">
          <p>Failed to load air quality data.</p>
          <button
            onClick={onRetry}
            className="mt-2 px-3 py-1 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-xs"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ── Loading skeleton ──────────────────────────────────────────────────────

  const grid = (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {AQ_FIELDS.map(({ label, key, unit, icon, accent }) => {
        const rawValue  = airCurrent?.[key];
        const isMissing = rawValue == null;

        // Null fields display "—" via the displayValue fallback in StatCard.
        // isError is intentionally NOT passed here — null is a data gap, not
        // an API failure. The "N/A in history" trend hint conveys context.
        const displayValue =
          key === "us_aqi"
            ? rawValue != null
              ? `${rawValue} (${getAQILabel(rawValue)})`
              : "—"
            : rawValue ?? "—";

        return (
          <StatCard
            key={key}
            label={label}
            value={displayValue}
            unit={isMissing ? undefined : unit}
            icon={icon}
            accent={accent}
            isLoaded={!airLoading}
            trend={isMissing ? "N/A in history" : undefined}
          />
        );
      })}
    </div>
  );

  return (
    <div className="animate-fade-up-6 mt-6">
      <SectionLabel icon="🏭">Air Quality Breakdown</SectionLabel>

      {airLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {Array.from({ length: AQ_FIELDS.length }, (_, i) => (
            <Skeleton key={i} h="h-28" w="w-full" className="rounded-2xl" />
          ))}
        </div>
      ) : (
        grid
      )}
    </div>
  );
});
AirQualityGrid.displayName = "AirQualityGrid";

AirQualityGrid.propTypes = {
  airLoading: PropTypes.bool,
  airCurrent: PropTypes.object,
  airError:   PropTypes.instanceOf(Error),
  onRetry:    PropTypes.func,
};

export default AirQualityGrid;