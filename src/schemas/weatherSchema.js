import { z } from "zod";

// ─── Module-scope shared validators ──────────────────────────────────────────
// FIX: Previously defined as factory functions (`const num = () => z.number()…`)
// which created a new Zod validator object on every call. Hoisting them to
// named constants means the same Zod schema object is reused across all
// z.object({}) definitions in this file, eliminating the per-call allocation.
const NUM     = z.number().nullable().optional();
const NUM_ARR = z.array(z.number().nullable()).optional();
const STR_ARR = z.array(z.string()).optional();

// ─── Internal sub-schemas (not exported — composed only within this file) ─────

const currentSchema = z.object({
  temperature_2m:       NUM,
  relative_humidity_2m: NUM,
  wind_speed_10m:       NUM,
  wind_direction_10m:   NUM,
  weather_code:         NUM,
  apparent_temperature: NUM,
}).optional();

const dailySchema = z.object({
  weather_code:                  NUM_ARR,
  temperature_2m_max:            NUM_ARR,
  temperature_2m_min:            NUM_ARR,
  temperature_2m_mean:           NUM_ARR,
  precipitation_sum:             NUM_ARR,
  precipitation_probability_max: NUM_ARR,
  wind_speed_10m_max:            NUM_ARR,
  wind_direction_10m_dominant:   NUM_ARR,
  uv_index_max:                  NUM_ARR,
  sunrise:                       STR_ARR,
  sunset:                        STR_ARR,
}).optional();

const hourlySchema = z.object({
  time:                 z.array(z.string()).min(1),
  temperature_2m:       NUM_ARR,
  relative_humidity_2m: NUM_ARR,
  precipitation:        NUM_ARR,
  visibility:           NUM_ARR,
  wind_speed_10m:       NUM_ARR,
  wind_direction_10m:   NUM_ARR,
  weather_code:         NUM_ARR,
  is_day:               NUM_ARR,
}).optional();

// ─── Public: top-level single-day weather response ───────────────────────────
export const weatherSchema = z.object({
  current: currentSchema,
  daily:   dailySchema,
  hourly:  hourlySchema,
});

// ─── Public: air quality response ────────────────────────────────────────────

const aqPollutants = {
  us_aqi:           NUM,
  pm10:             NUM,
  pm2_5:            NUM,
  carbon_monoxide:  NUM,
  nitrogen_dioxide: NUM,
  sulphur_dioxide:  NUM,
  carbon_dioxide:   NUM,
};

export const airSchema = z.object({
  current: z.object(aqPollutants).optional(),

  hourly: z.object({
    time:             STR_ARR,
    us_aqi:           NUM_ARR,
    pm10:             NUM_ARR,
    pm2_5:            NUM_ARR,
    carbon_monoxide:  NUM_ARR,
    nitrogen_dioxide: NUM_ARR,
    sulphur_dioxide:  NUM_ARR,
    carbon_dioxide:   NUM_ARR,
  }).optional(),
});

// ─── Public: historical weather (multi-day range) ─────────────────────────────
// weatherDailySchema and airQualityHourlySchema are used only as building
// blocks for the two exported schemas below — they are not exported themselves.

const weatherDailySchema = z.object({
  time:                          z.array(z.string()).min(1),
  temperature_2m_mean:           z.array(z.number().nullable()).optional(),
  temperature_2m_max:            z.array(z.number().nullable()).optional(),
  temperature_2m_min:            z.array(z.number().nullable()).optional(),
  sunrise:                       z.array(z.string()).optional(),
  sunset:                        z.array(z.string()).optional(),
  precipitation_sum:             z.array(z.number().nullable()).optional(),
  wind_speed_10m_max:            z.array(z.number().nullable()).optional(),
  wind_direction_10m_dominant:   z.array(z.number().nullable()).optional(),
});

export const historicalWeatherSchema = z.object({
  timezone: z.string().optional(),
  daily:    weatherDailySchema,
});

const airQualityHourlySchema = z.object({
  time:  z.array(z.string()).min(1),
  pm10:  z.array(z.number().nullable()).optional(),
  pm2_5: z.array(z.number().nullable()).optional(),
});

export const historicalAirQualitySchema = z.object({
  hourly: airQualityHourlySchema,
});