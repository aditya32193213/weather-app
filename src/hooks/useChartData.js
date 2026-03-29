import { useMemo } from "react";
import dayjs from "dayjs";
import { aggregateAQHourlyToDaily } from "../services/airQualityService";
import { resolveTimezone }           from "../utils/timezone";
import { downsample }                from "../utils/chartUtils";
import { useIsMobile }               from "../hooks/useIsMobile";

/**
 * Transforms raw API data into downsampled, chart-ready datasets.
 * Returns null when there is no weather data to display.
 *
 * Kept in its own hook so Historical.jsx stays free of data-transformation
 * logic, and so this memo can be unit-tested independently.
 *
 * Sunrise / sunset timezone
 * ─────────────────────────
 * Page 2 assignment requirement: "Sunrise & Sunset (Display time as per IST)".
 * Sunrise/sunset values are ALWAYS converted to Asia/Kolkata (IST) regardless
 * of the user's GPS location. IST_TZ is the single source of truth for this
 * constraint — Historical.jsx derives its "IST" axis label from the same
 * constant (via getTzAbbr(IST_TZ)) so the label and the data values are
 * always in sync.
 *
 * All other chart values (temperature, wind, precipitation, AQ) continue to
 * use resolvedTZ — the location's own IANA timezone from the API response.
 *
 * @param {object|null} weatherData
 * @param {object|null} airData
 * @returns {object|null} optimizedChartData
 */

// Assignment requirement: sunrise & sunset must always display in IST.
// Defined at module scope so it is a single source of truth — changing
// this one constant is all that is needed if the requirement changes.
const IST_TZ = "Asia/Kolkata";
export function useChartData(weatherData, airData) {
  const isMobileDevice = useIsMobile();

  return useMemo(() => {
    const daily = weatherData?.daily;
    if (!daily?.time?.length) return null;

    const airDaily = airData?.hourly
      ? aggregateAQHourlyToDaily(airData.hourly, daily.time)
      : { pm10: [], pm2_5: [] };

    const daysCount   = daily.time?.length || 0;
    const apiTimezone = weatherData.timezone || "auto";
    const resolvedTZ  = resolveTimezone(apiTimezone);

    let factor = 1;
    if      (daysCount > 365) factor = isMobileDevice ? 14 : 7;
    else if (daysCount > 180) factor = isMobileDevice ? 7  : 3;
    else if (daysCount > 90)  factor = isMobileDevice ? 3  : 1;

    // Sunrise & sunset: always converted to IST per the Page 2 spec.
    // resolvedTZ is intentionally NOT used here — the user's location timezone
    // is irrelevant for these two fields. IST_TZ matches the axis label shown
    // in Historical.jsx (which derives "IST" from the same constant).
    const rawSunrise = (daily.sunrise ?? []).map((t) => {
      const d = dayjs.tz(t, IST_TZ);
      return parseFloat((d.hour() + d.minute() / 60).toFixed(2));
    });
    const rawSunset = (daily.sunset ?? []).map((t) => {
      const d = dayjs.tz(t, IST_TZ);
      return parseFloat((d.hour() + d.minute() / 60).toFixed(2));
    });

    const time = downsample(daily.time ?? [], factor, "first");

    return {
      factor,
      time,
      resolvedTZ,
      tempDatasets: [
        { label: "Mean", data: downsample(daily.temperature_2m_mean ?? [], factor, "avg"), color: "#f97316" },
        { label: "Max",  data: downsample(daily.temperature_2m_max  ?? [], factor, "max"), color: "#f87171" },
        { label: "Min",  data: downsample(daily.temperature_2m_min  ?? [], factor, "min"), color: "#38bdf8" },
      ],
      sunDatasets: [
        { label: "Sunrise", data: downsample(rawSunrise, factor, "first"), color: "#fbbf24" },
        { label: "Sunset",  data: downsample(rawSunset,  factor, "first"), color: "#c084fc" },
      ],
      precipDatasets: [
        {
          label: "Precipitation",
          data:  downsample(
            (daily.precipitation_sum ?? []).map((v) => (Number.isFinite(v) ? v : null)),
            factor,
            "sum",
          ),
          color: "#818cf8",
        },
      ],
      windSpeedDatasets: [
        { label: "Speed (km/h)", data: downsample(daily.wind_speed_10m_max ?? [], factor, "max"), color: "#34d399" },
      ],
      windDirDatasets: [
        {
          label: "Direction (°)",
          data:  downsample(
            (daily.wind_direction_10m_dominant ?? []).map((v) =>
              Number.isFinite(v) ? v : null,
            ),
            factor,
            "circularAvg",
          ),
          color: "#a3e635",
        },
      ],
      aqDatasets: [
        {
          label: "PM10",
          data:  downsample(
            (airDaily.pm10 ?? []).map((v) => (Number.isFinite(v) ? v : null)),
            factor,
            "avg",
          ),
          color: "#f87171",
        },
        {
          label: "PM2.5",
          data:  downsample(
            (airDaily.pm2_5 ?? []).map((v) => (Number.isFinite(v) ? v : null)),
            factor,
            "avg",
          ),
          color: "#c084fc",
        },
      ],
      pm10Empty: !airDaily?.pm10?.length || airDaily.pm10.every((v) => v == null),
    };
  }, [weatherData, airData, isMobileDevice]);
}