# 🌤️ Atmos.live — Weather Dashboard

<div align="center">

![React](https://img.shields.io/badge/React-19.2-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-8.0-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind-3.4-38BDF8?style=for-the-badge&logo=tailwindcss&logoColor=white)
![Recharts](https://img.shields.io/badge/Recharts-3.8-FF6B6B?style=for-the-badge)
![Zod](https://img.shields.io/badge/Zod-4.3-3068B7?style=for-the-badge)
![Open-Meteo](https://img.shields.io/badge/Open--Meteo-API-00B4D8?style=for-the-badge)

**A production-grade, real-time weather intelligence dashboard built with React 19, powered by the Open-Meteo API. Detects your location automatically, visualizes weather and air quality across 7 interactive charts, and supports up to 2 years of historical trend analysis.**

[🌍 Live Demo](#) · [🐛 Report Bug](#) · [💡 Request Feature](#)

</div>

---

## 📸 Preview

> 🖼️ *Page 1 — Current Weather & Hourly Forecast with GPS auto-detection, AQI gauge, and 6 interactive charts*

> 🖼️ *Page 2 — Historical Analysis with date-range picker, 5 trend charts, and adaptive downsampling for 2-year datasets*

---

## 📋 Table of Contents

- [✨ Features](#-features)
- [🏗️ Architecture](#️-architecture)
- [📁 Folder Structure](#-folder-structure)
- [🔄 Data Flow](#-data-flow)
- [🛠️ Tech Stack](#️-tech-stack)
- [⚡ Performance](#-performance)
- [🚀 Getting Started](#-getting-started)
- [🌐 Environment Variables](#-environment-variables)
- [📊 API Reference](#-api-reference)
- [🎨 Theming](#-theming)
- [♿ Accessibility](#-accessibility)
- [🔒 Privacy](#-privacy)
- [⚠️ Known Limitations](#️-known-limitations)
- [🗺️ Roadmap](#️-roadmap)

---

## ✨ Features

### 📍 Page 1 — Current Weather & Hourly Forecast

| Feature | Details |
|---|---|
| 🛰️ **Auto GPS Detection** | Browser geolocation on load; falls back to New Delhi with clear user notice |
| 📅 **Date Selector** | Calendar picker to browse any date from 1940-01-01 to today |
| 🌡️ **Temperature** | Current, Min, Max — toggleable °C / °F in real time |
| 🌧️ **Precipitation** | Daily total (mm) + max probability |
| 🌅 **Sunrise & Sunset** | Times in the location's own timezone |
| 💨 **Wind** | Max speed (km/h) + 16-point compass direction |
| 💧 **Humidity** | Relative humidity % (current hour or noon for historical) |
| ☀️ **UV Index** | Animated progress bar with WHO risk labels (Low → Extreme) |
| 👁️ **Visibility** | Hourly slot in km |
| 🏭 **Air Quality** | AQI (US EPA), PM10, PM2.5, CO, CO2, NO2, SO2 |
| 📈 **6 Hourly Charts** | Temperature, Humidity, Precipitation, Visibility, Wind Speed, PM10+PM2.5 |

### 📊 Page 2 — Historical Analysis (Up to 2 Years)

| Feature | Details |
|---|---|
| 📆 **Date Range Picker** | Start/End with hard 2-year maximum enforcement |
| ⚡ **Quick Presets** | Last 30d / 6mo / 1yr / 2yr — auto-fetch on click |
| 🌡️ **Temperature Trends** | Mean / Max / Min — line chart |
| 🌅 **Sun Cycle** | Sunrise & Sunset in **IST (Asia/Kolkata)** — area chart |
| 🌧️ **Precipitation** | Daily totals — bar chart |
| 💨 **Wind** | Max speed + dominant direction — composed dual-axis chart |
| 🏭 **Air Quality** | PM10 + PM2.5 trends — line chart |
| 📱 **Adaptive Downsampling** | Auto-aggregates data (3–14 day periods) on mobile for performance |

### 🎯 Graph Features (All Charts)

- 🔍 **Zoom In / Out / Reset** — keyboard-accessible zoom controls
- ↔️ **Horizontal Scrolling** — drag-scrollable brush for dense datasets
- 📱 **Mobile Adaptive** — chart height, tick density, and downsampling factor adjust per viewport
- 🕐 **"Now" Reference Line** — highlights current hour on today's charts
- 🔁 **Collapsible Headers** — each chart collapses independently to reduce visual noise

---

## 🏗️ Architecture

Atmos.live follows a strict **layered architecture** with one-way data flow and clear separation of concerns:

```
📦 src/
├── 🌐 api/           # Network layer (apiClient, cache, geocodingService)
├── 🗂️ context/       # React Contexts (GPS, Theme)
├── 🔧 hooks/         # Custom hooks (useHomeState, useHistoricalData, useWeatherData, useChartData, useGPS…)
├── 📄 pages/         # Route-level components (Home, Historical, NotFound)
├── 🧱 component/
│   ├── charts/       # HourlyChart, HistoricalCharts, ChartShared
│   ├── common/       # Navbar, AnimatedBackground, ErrorBoundary, ThemeToggle
│   ├── layout/       # HeroSection, WeatherParametersGrid, HourlyChartsContainer…
│   ├── ui/           # StatCard, Skeleton, SectionLabel, EmptyState, PresetButton
│   └── weather/      # AQIGauge, UVBar, WindCompass, HourlyStrip
├── 📡 services/      # weatherService, airQualityService
├── 🔍 schemas/       # Zod validation schemas
└── 🛠️ utils/         # constants, format, helpers, timezone, validation, wind, chartUtils
```

### 🔑 Key Design Principles

| Principle | Implementation |
|---|---|
| **Single Responsibility** | `useHomeState` owns Home page state; `Home.jsx` is a pure layout shell |
| **Service Abstraction** | All API calls go through `weatherService` / `airQualityService` — never directly from components |
| **Schema Validation** | Every API response is validated with Zod before touching state |
| **Parallel Fetching** | `Promise.allSettled` fetches weather + air quality simultaneously |
| **Race-condition Safety** | `requestIdRef` + `AbortController` per effect; stale results discarded |
| **Optimistic UI** | Previous data stays visible during retry; loading flags are the only indicator |

---

## 📁 Folder Structure

```
atmos-live/
├── 📄 index.html
├── ⚙️ vite.config.js
├── 🎨 tailwind.config.js
├── 📦 package.json
└── src/
    ├── 🚀 main.jsx              # Bootstrap: ThemeProvider > GPSProvider > App
    ├── 🏠 App.jsx               # BrowserRouter + ErrorBoundaries + AnimatedBackground
    ├── 🗺️ appRoutes.jsx         # Lazy-loaded Historical & NotFound; eager Home
    ├── 🎨 index.css             # CSS custom properties, Tailwind, animations
    │
    ├── api/
    │   ├── 🌐 apiClient.js      # fetch with timeout, retry, back-off, forceRefresh
    │   ├── 💾 cache.js          # localStorage cache with TTL, dedup, quota guard
    │   └── 🗺️ geocodingService.js # Timezone + reverse-geocode fetch wrappers
    │
    ├── context/
    │   ├── 📍 GPSContext.jsx    # GPS state + memoized context value
    │   └── 🎨 ThemeContext.jsx  # Dark/light theme + OS preference + localStorage
    │
    ├── hooks/
    │   ├── 🏠 useHomeState.js       # All Home page state in one hook
    │   ├── 📊 useHistoricalData.js  # Historical fetch lifecycle
    │   ├── 🌩️ useWeatherData.js     # Parallel WX + AQ fetch with abort
    │   ├── 📡 useGPS.js             # Geolocation, reverse-geocode, timezone
    │   ├── 📈 useChartData.js       # Raw data → downsampled chart datasets
    │   ├── 📱 useIsMobile.js        # Debounced resize breakpoint detection
    │   └── ⏱️ useDebounce.js        # Generic debounce hook
    │
    ├── services/
    │   ├── 🌦️ weatherService.js     # fetchDayWeather, fetchHistoricalWeather
    │   └── 🏭 airQualityService.js  # fetchDayAirQuality, fetchHistoricalAirQuality
    │
    ├── schemas/
    │   └── 🔍 weatherSchema.js      # Zod schemas for all API response shapes
    │
    ├── pages/
    │   ├── 🏠 Home.jsx              # Page 1 — today / single date
    │   ├── 📊 Historical.jsx        # Page 2 — date range analysis
    │   └── ❌ NotFound.jsx          # 404 with glitch animation
    │
    ├── component/
    │   ├── charts/
    │   │   ├── 📈 HourlyChart.jsx       # Recharts LineChart/BarChart with zoom/scroll/brush
    │   │   ├── 📊 HistoricalCharts.jsx  # Historical multi-dataset charts
    │   │   └── 🎨 ChartShared.jsx       # SharedTooltip, SharedLegend, ZoomControls
    │   ├── common/
    │   │   ├── 🌲 AnimatedBackground.jsx  # SVG nature scene (mountains, sun, mist)
    │   │   ├── 🛡️ ErrorBoundary.jsx      # Top-level + per-route error boundaries
    │   │   ├── 🔗 Navbar.jsx             # Sticky nav with theme toggle + cache clear
    │   │   └── 🌗 ThemeToggle.jsx        # Dark/light toggle button
    │   ├── layout/
    │   │   ├── 🦸 HeroSection.jsx            # Temp card + AQI gauge + date/GPS controls
    │   │   ├── 🌤️ WeatherParametersGrid.jsx   # Wind/humidity/visibility/precipitation
    │   │   ├── 🏭 AirQualityGrid.jsx          # All AQ metrics as StatCards
    │   │   ├── 🌬️ SecondaryParametersGrid.jsx # UV bar + wind speed + precip probability
    │   │   ├── 📈 HourlyChartsContainer.jsx   # 6 hourly chart orchestrator
    │   │   └── 📅 DateRangePicker.jsx         # Historical date range + presets
    │   ├── ui/
    │   │   ├── 🃏 StatCard.jsx      # Universal metric display card
    │   │   ├── 💀 Skeleton.jsx      # Loading placeholder
    │   │   ├── 🏷️ SectionLabel.jsx  # Section heading with divider
    │   │   ├── 🌫️ EmptyState.jsx    # No-data placeholder
    │   │   └── ⚡ PresetButton.jsx  # Quick-select preset chip
    │   └── weather/
    │       ├── 🎯 AQIGauge.jsx      # SVG semicircle gauge (US EPA breakpoints)
    │       ├── 🕐 HourlyStrip.jsx   # Horizontal scroll hourly forecast strip
    │       ├── ☀️ UVBar.jsx         # UV index progress bar
    │       └── 🧭 WindCompass.jsx   # SVG 16-point compass rose
    │
    └── utils/
        ├── 📊 chartUtils.js   # downsample() with 6 aggregation methods incl. circularAvg
        ├── 📋 constants.js    # API URLs, cache TTLs, field lists, GPS defaults
        ├── 🖨️ format.js       # formatValue, toFahrenheit, formatCacheAge
        ├── 🔧 helpers.js      # roundCoord, extractHour, buildUrl, mean4dp
        ├── 🛠️ serviceUtils.js # isValidServiceResult, toServiceError, abortedResult
        ├── 🕰️ timezone.js     # normalizeTimezone, resolveTimezone, getTzDateStr
        ├── ✅ validation.js   # isValidCoord, isValidDateStr, isValidDateRange
        └── 🌬️ wind.js         # degreesToCompass (16-point, 22.5° resolution)
```

---

## 🔄 Data Flow

### 🏠 Page 1 — Full Lifecycle Trace

```
Browser Launch
  └─► GPSProvider (useGPS)
        ├─ navigator.geolocation.getCurrentPosition()
        ├─ fetchTimezoneForCoords(lat, lon) → Open-Meteo → IANA timezone
        ├─ fetchLocationName(lat, lon)      → BigDataCloud → "New Delhi, India"
        └─ Promise.allSettled([tz, geo]) → setGpsLoading(false)  ← single render

Home.jsx
  └─► useHomeState()
        ├─ stableCoords (gated on !gpsLoading)
        ├─ dateStr = localDateStr(date, tz) → "2025-03-29"
        └─► useWeatherData(coords, dateStr, tz, retryCount)
              ├─ AbortController created
              ├─ setWeatherLoading(true), setAirLoading(true)
              └─ Promise.allSettled([
                   fetchDayWeather(lat, lon, date, tz, signal)
                     └─ fetchWithCache("v7_wx_28.6139_77.209_2025-03-29_Asia/Kolkata")
                          ├─ HIT  → return localStorage JSON instantly ⚡
                          └─ MISS → apiFetch(FORECAST_URL, signal)
                               └─ { current, hourly[24], daily[1] }
                   fetchDayAirQuality(lat, lon, date, tz, signal)
                     └─ fetchWithCache("v7_air_...")
                          └─ apiFetch(AIR_URL, signal)
                               └─ { current, hourly[24] }
                 ])
              ├─ weatherSchema.safeParse(data) ← Zod validates shape
              ├─ setWeatherData(parsed.data)
              └─ setWeatherLoading(false)

Renders (staggered fade-up):
  HeroSection         ← current temp, AQI gauge, sunrise/sunset, GPS badge
  HourlyStrip         ← 24 hourly slots with temp + precip + day/night icon
  WeatherParamsGrid   ← wind compass, visibility, humidity, precipitation
  AirQualityGrid      ← 7 StatCards: AQI, PM10, PM2.5, CO, CO2, NO2, SO2
  SecondaryParamsGrid ← UV bar, max wind speed, precip probability
  HourlyChartsContainer ← 6 Recharts instances with zoom + scroll + brush
```

### 📊 Page 2 — Historical Trace

```
User clicks "Last 1yr" preset
  └─► DateRangePicker.handlePreset(365)
        ├─ end   = today − 7 days (archive lag)
        ├─ start = end  − 365 days
        └─► doFetch(start, end) in useHistoricalData
              ├─ isValidDateRange() guard
              ├─ abortCtrlRef.current?.abort()  ← cancel previous
              └─ Promise.allSettled([
                   fetchHistoricalWeather(lat, lon, start, end, tz)
                     └─ ARCHIVE_URL → daily[365] only (no hourly — too large)
                   fetchHistoricalAirQuality(lat, lon, start, end, tz)
                     └─ AIR_URL → hourly[8760] pm10 + pm2_5 only
                 ])

useChartData(weatherData, airData)  ← useMemo
  ├─ aggregateAQHourlyToDaily()  ← O(n) single-pass index map
  ├─ factor = isMobile ? 7 : 3   ← adaptive downsampling
  ├─ downsample(time[365], 3)    → time[122]
  ├─ Sunrise/sunset → IST (Asia/Kolkata) as decimal hours
  └─ 5 dataset groups ready for HistoricalChart

Historical.jsx renders 5 chart sections:
  🌡️ Temperature  → LineChart (mean/max/min, 3 series)
  🌅 Sun Cycle    → AreaChart (decimal hours in IST)
  🌧️ Precipitation → BarChart (aggregated sums)
  💨 Wind         → Composed dual-Y (speed + direction)
  🏭 Air Quality  → LineChart (PM10 + PM2.5)
```

---

## 🛠️ Tech Stack

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| ⚛️ **Framework** | React | 19.2 | UI with concurrent features |
| ⚡ **Build** | Vite | 8.0 | Dev server + optimised production build |
| 🎨 **Styling** | Tailwind CSS | 3.4 | Utility-first, CSS-var theming |
| 📊 **Charts** | Recharts | 3.8 | Composable SVG chart library |
| 🗺️ **Routing** | React Router DOM | 7.13 | Client-side SPA routing |
| 🔍 **Validation** | Zod | 4.3 | Runtime API response schema validation |
| 📅 **Dates** | Day.js | 1.11 | Lightweight date manipulation + timezone |
| 📅 **Date Picker** | react-datepicker | 9.1 | Accessible calendar widget |
| 🔧 **Types** | prop-types | 15.8 | Runtime prop validation |
| 🤖 **Compiler** | babel-plugin-react-compiler | 1.0 | Automatic memoization (experimental) |
| 🌐 **Weather API** | Open-Meteo | — | Free, no-key weather + archive data |
| 🗺️ **Geocoding** | BigDataCloud | — | Reverse geocoding (configurable) |
| 📍 **Timezone** | Open-Meteo | — | IANA timezone from coordinates |

---

## ⚡ Performance

### 🚀 Caching Strategy

| Cache Layer | TTL | Scope |
|---|---|---|
| Today's weather | **5 minutes** | Per {lat, lon, date, tz} |
| Historical weather | **60 minutes** | Per {lat, lon, start, end, tz} |
| GPS coordinates | **1 hour** | localStorage (last-coords) |
| Location name | **1 hour** | Per {lat, lon} rounded to 0.01° |

### 📱 Adaptive Downsampling

Data is aggregated before charting to keep rendering fast on large historical ranges:

| Date Range | Desktop Factor | Mobile Factor |
|---|---|---|
| ≤ 90 days | 1 (raw) | 1 (raw) |
| 91–180 days | 1 (raw) | 3-day avg |
| 181–365 days | 3-day avg | 7-day avg |
| 366–731 days | 7-day avg | 14-day avg |

### ⚙️ Other Optimisations

- 🔀 **Parallel API calls** — `Promise.allSettled` halves fetch wall-clock time
- 🚫 **Request deduplication** — `pendingRequests` Map prevents duplicate in-flight calls
- 🎯 **Selective rendering** — all layout components wrapped in `React.memo`
- 📦 **Code splitting** — `Historical` + `NotFound` are lazily loaded via `React.lazy`
- 💾 **Proactive cache guard** — items over 400KB are skipped rather than causing `QuotaExceededError`
- 🧲 **Module-scope statics** — chart skeletons, preset arrays, field configs never reallocated per render
- 🌀 **Circular wind average** — uses `atan2` mean angle to correctly average bearings across the 359°→1° boundary

> ⚠️ **500ms Rendering Note:** The assignment's 500ms target is met on cache-warm loads. Cold network fetches to Open-Meteo take 200–800ms on their own. The 4-second request timeout and 2-attempt exponential back-off (300ms + 600ms) are tuned to surface failures quickly without blocking the UI.

---

## 🚀 Getting Started

### 📋 Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9

### 📦 Installation

```bash
# Clone the repository
git clone https://github.com/your-username/atmos-live.git
cd atmos-live

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### 🏗️ Build for Production

```bash
npm run build       # Outputs to dist/
npm run preview     # Serve production build locally
```

### 🔍 Lint

```bash
npm run lint
```

---

## 🌐 Environment Variables

Create a `.env` file in the project root. All variables are optional — sensible defaults are built in:

```env
# ─── API Base URLs ─────────────────────────────────────────────────────────────
# Override to use a self-hosted Open-Meteo instance or a CORS proxy
VITE_FORECAST_URL=https://api.open-meteo.com/v1/forecast
VITE_ARCHIVE_URL=https://archive-api.open-meteo.com/v1/archive
VITE_AIR_URL=https://air-quality-api.open-meteo.com/v1/air-quality

# ─── Geocoding ──────────────────────────────────────────────────────────────────
# Replace with a self-hosted reverse geocoder for GDPR compliance
VITE_GEOCODE_URL=https://api.bigdatacloud.net/data/reverse-geocode-client
```

> 💡 No API keys required — Open-Meteo and BigDataCloud both offer free tiers with no registration.

---

## 📊 API Reference

### 🌦️ Weather (Open-Meteo Forecast)

**Endpoint:** `https://api.open-meteo.com/v1/forecast`

Fields fetched for **today**:

| Block | Fields |
|---|---|
| `current` | `temperature_2m`, `relative_humidity_2m`, `wind_speed_10m`, `wind_direction_10m`, `weather_code`, `apparent_temperature` |
| `hourly` | `temperature_2m`, `relative_humidity_2m`, `precipitation`, `visibility`, `wind_speed_10m`, `wind_direction_10m`, `weather_code`, `is_day` |
| `daily` | `weather_code`, `temperature_2m_max/min/mean`, `precipitation_sum`, `precipitation_probability_max`, `wind_speed_10m_max`, `wind_direction_10m_dominant`, `sunrise`, `sunset`, `uv_index_max` |

### 🏭 Air Quality (Open-Meteo CAMS)

**Endpoint:** `https://air-quality-api.open-meteo.com/v1/air-quality`

Fields: `pm10`, `pm2_5`, `carbon_monoxide`, `nitrogen_dioxide`, `sulphur_dioxide`, `carbon_dioxide`, `us_aqi`

### 🗄️ Historical (Open-Meteo Archive)

**Endpoint:** `https://archive-api.open-meteo.com/v1/archive`

- Supports dates from **1940-01-01**
- Archive data has an approximately **7-day processing lag**
- Historical AQ (CAMS reanalysis) covers approximately the **last 3 months** only

---

## 🎨 Theming

The app supports **full light and dark modes** controlled by CSS custom properties:

```css
:root {
  --accent:       #38bdf8;   /* Sky blue — primary accent */
  --accent-2:     #818cf8;   /* Indigo — secondary accent */
  --surface:      rgba(255, 255, 255, 0.72);
  --text-primary: #0f172a;
  /* ... 20+ more tokens */
}

html.dark {
  --surface:      rgba(15, 23, 42, 0.82);
  --text-primary: #f1f5f9;
  /* ... dark overrides */
}
```

**Theme resolution priority (highest → lowest):**

1. 🖱️ Explicit user toggle → stored in `localStorage`
2. 💻 OS `prefers-color-scheme` → live-watched, no reload needed
3. ☀️ Light mode (safe SSR fallback)

**Fonts used:**
- 🔤 Display: `Outfit` (headings, large numbers)
- 📝 Body: `DM Sans` (prose, labels)
- 💻 Mono: `Space Mono` (timestamps, badges, axes)

---

## ♿ Accessibility

| Feature | Implementation |
|---|---|
| 🔴 **Error announcements** | `aria-live="assertive"` on fetch error banners |
| 🟡 **Status announcements** | `aria-live="polite"` on GPS status + cache clear |
| 📊 **Gauge semantics** | `role="meter"` with `aria-valuenow/min/max/label` on AQIGauge |
| 🧭 **SVG labels** | `role="img"` + `aria-label` on WindCompass |
| ⌨️ **Focus management** | 404 page auto-focuses the "Back" link on mount via `useEffect` |
| 🔘 **Toggle ARIA** | `aria-pressed` on ThemeToggle (persistent state); removed from one-shot Clear Cache button |
| ♿ **Reduced motion** | `@media (prefers-reduced-motion: reduce)` disables all animations |
| 🌡️ **Temperature toggle** | `role="group"` + `aria-label` on °C/°F button group |
| 📋 **Form controls** | All date pickers have visible labels and `portalId` for z-index safety |
| ✅ **Keyboard navigation** | All interactive elements reachable via Tab; charts have `aria-expanded` on collapse |

---

## 🔒 Privacy

> ⚠️ **This app sends user GPS coordinates to two third-party services:**

| Service | Data Sent | Purpose | Privacy Policy |
|---|---|---|---|
| **Open-Meteo** | `latitude`, `longitude` | Weather + timezone lookup | [open-meteo.com/en/privacy](https://open-meteo.com/en/privacy) |
| **BigDataCloud** | `latitude`, `longitude` | Reverse geocoding (location name) | [bigdatacloud.com/privacy](https://www.bigdatacloud.com/privacy) |

**For production deployment:**

- 🛡️ Set `VITE_GEOCODE_URL` to a self-hosted reverse geocoder
- 📜 Reference both services in your Privacy Policy as data processors
- 🇪🇺 Add a consent prompt before requesting browser GPS (GDPR Article 7)
- 🔐 Consider proxying API requests server-side to mask coordinates from clients

---

## ⚠️ Known Limitations

| Limitation | Detail |
|---|---|
| 📡 **500ms on cold load** | Cold network round-trips to Open-Meteo take 200–800ms. The 500ms SLA is met on cache-warm loads. Cold loads are outside the app's control. |
| 🏭 **CO2 data sparsity** | `carbon_dioxide` from the CAMS air quality API is frequently `null` outside of major monitoring regions. The UI shows "—" gracefully. |
| 🗄️ **Historical AQ coverage** | CAMS reanalysis data covers only approximately the last 3 months. The UI shows a blue info notice when PM10/PM2.5 are unavailable for the selected range. |
| 📅 **Archive lag** | Open-Meteo archive has a ~7-day processing delay. The date picker and all validations account for this automatically. |
| 🌍 **IST sunrise/sunset** | The assignment requires Page 2 sun-cycle charts to display in IST (Asia/Kolkata) regardless of the user's location. Page 1 correctly uses the local timezone. |
| 📱 **React Compiler** | `babel-plugin-react-compiler` is experimental. Manual `React.memo` + `useMemo` are retained as fallback for production safety. |

---

## 🗺️ Roadmap

- [ ] 🧪 **Unit Tests** — Vitest + React Testing Library for hooks and utils
- [ ] 🧩 **E2E Tests** — Playwright for GPS → fetch → chart render flows
- [ ] 🌍 **i18n** — Internationalisation for non-English deployments
- [ ] 📍 **Location Search** — Type-ahead search as alternative to GPS
- [ ] 📤 **Export Charts** — PNG / CSV download for historical data
- [ ] 🔔 **Weather Alerts** — Open-Meteo weather code → push notification
- [ ] 📴 **Offline Mode** — Service Worker + stale-while-revalidate for PWA
- [ ] 🖥️ **Server Proxy** — Express / Cloudflare Worker to keep coordinates server-side
- [ ] 📊 **Compare Locations** — Side-by-side two-location historical comparison

---

## 📜 License

MIT © 2025 — Free to use, modify and deploy.

---

<div align="center">

**Built with ❤️ using React 19 + Open-Meteo**

🌤️ *Clear skies, clean code.*

</div>