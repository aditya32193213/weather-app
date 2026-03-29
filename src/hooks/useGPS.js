import { useState, useEffect } from "react";
import {
  GPS_FALLBACK_COORDS,
  GPS_FALLBACK_NAME,
  GEO_CACHE_EXPIRY_MS,
  GPS_TIMEOUT_MS,
  GEO_CACHE_MAX_ENTRIES,
} from "../utils/constants";
import { isValidTimezone } from "../utils/timezone";
// FIX (SEPARATION OF CONCERNS): Bare fetch() calls for timezone resolution and
// reverse-geocoding have been extracted to geocodingService.js. useGPS now only
// manages state — it no longer knows how to talk to the network.
import { fetchTimezoneForCoords, fetchLocationName } from "../api/geocodingService";

const safeStorage =
  typeof localStorage !== "undefined" ? localStorage : null;

const logDev = (...args) => {
  if (import.meta.env?.DEV) console.warn(...args);
};

// ─── Internal cache utilities ─────────────────────────────────────────────────

const buildCacheKey = (lat, lon) =>
  `geo-${lat.toFixed(2)}-${lon.toFixed(2)}`;

const readCachedItem = (key) => {
  try {
    const raw = safeStorage?.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.timestamp && Date.now() - parsed.timestamp < GEO_CACHE_EXPIRY_MS) {
      return parsed;
    }
  } catch (err) {
    logDev("LocalStorage read failed:", err);
  }
  return null;
};

const evictOldestGeoCache = (storage) => {
  try {
    const keys = Object.keys(storage).filter((k) => k.startsWith("geo-"));
    if (keys.length < GEO_CACHE_MAX_ENTRIES) return;

    keys
      .map((k) => {
        try {
          return { key: k, timestamp: JSON.parse(storage.getItem(k) || "{}").timestamp ?? 0 };
        } catch {
          return { key: k, timestamp: 0 };
        }
      })
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(0, 3)
      .forEach(({ key }) => storage.removeItem(key));
  } catch (err) {
    logDev("Cache eviction failed:", err);
  }
};

// ─── Initialiser ─────────────────────────────────────────────────────────────

/**
 * Reads the last-known GPS state from localStorage for optimistic initialisation.
 * Called once per hook invocation via a useState lazy initialiser — NOT on every
 * render. The result is only used as the initial state value.
 */
const readPersistedGeoState = () => {
  const coordEntry = readCachedItem("last-coords");
  const nameEntry  = readCachedItem("last-loc-name");

  return {
    coords:         coordEntry
      ? { lat: coordEntry.lat, lon: coordEntry.lon }
      : GPS_FALLBACK_COORDS,
    coordsCacheAge: coordEntry ? Date.now() - coordEntry.timestamp : null,
    locationName:   nameEntry?.name ?? `${GPS_FALLBACK_NAME} (Detecting...)`,
  };
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useGPS() {
  // FIX: readPersistedGeoState was previously called directly in the function
  // body, making it run on EVERY render (GPS badge updates, tz changes, etc.).
  // Using useState lazy initialisers means it runs exactly once — on mount.
  // Three separate lazy calls are intentional: each state slot initialises
  // independently, and three synchronous localStorage reads on mount is trivial.
  const [coords,         setCoords]         = useState(() => readPersistedGeoState().coords);
  const [coordsCacheAge, setCoordsCacheAge] = useState(() => readPersistedGeoState().coordsCacheAge);
  const [locationName,   setLocationName]   = useState(() => readPersistedGeoState().locationName);

  const [timezone,    setTimezone]    = useState(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
  );
  const [error,       setError]       = useState(null);
  const [gpsDetected, setGpsDetected] = useState(false);
  const [gpsLoading,  setGpsLoading]  = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    let isMounted    = true;

    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      setLocationName((prev) =>
        prev.includes("Detecting") ? `${GPS_FALLBACK_NAME} (Fallback)` : prev,
      );
      setGpsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        if (!isMounted) return;

        const { latitude, longitude } = pos.coords;
        const newCoords = { lat: latitude, lon: longitude };

        setCoords(newCoords);
        setCoordsCacheAge(null);
        setGpsDetected(true);
        // FIX: setGpsLoading(false) intentionally NOT called here.
        // It is deferred until after Promise.allSettled below, so that
        // coords + timezone are guaranteed to be committed in the same render
        // that releases the gpsLoading gate. Releasing early caused:
        //   1. stableCoords becoming non-null before tz resolved, triggering a
        //      fetch with the wrong (system) timezone.
        //   2. When tz resolved seconds later, stableTz changed and triggered a
        //      second fetch — the visible duplicate API calls.

        try {
          safeStorage?.setItem(
            "last-coords",
            JSON.stringify({ ...newCoords, timestamp: Date.now() }),
          );
        } catch (err) {
          logDev("LocalStorage write failed:", err);
        }

        const cacheKey  = buildCacheKey(latitude, longitude);
        const cachedGeo = readCachedItem(cacheKey);

        const coordFallback =
          `${Math.abs(latitude).toFixed(2)}°${latitude >= 0 ? "N" : "S"}, ` +
          `${Math.abs(longitude).toFixed(2)}°${longitude >= 0 ? "E" : "W"}`;

        // ── Timezone fetch (via geocodingService) ─────────────────────────
        // FIX: Moved from inline bare fetch() to geocodingService.fetchTimezoneForCoords.
        // forecast_days=1 is the Open-Meteo minimum — 0 returns HTTP 400.
        const tzFetch = fetchTimezoneForCoords(latitude, longitude, controller.signal)
          .then((data) => {
            if (!isMounted) return;
            if (data?.timezone && isValidTimezone(data.timezone)) {
              setTimezone(data.timezone);
            } else if (data?.timezone) {
              logDev("Open-Meteo returned unrecognised timezone:", data.timezone);
            }
          })
          .catch((tzErr) => {
            if (tzErr.name === "AbortError") return;
            logDev("Open-Meteo timezone fetch failed:", tzErr);
          });

        // ── Geocoding fetch (via geocodingService) ────────────────────────
        // FIX: Moved from inline bare fetch() to geocodingService.fetchLocationName.
        // FIX: Uses data.countryName instead of data.countryCode ("India" not "IN").
        const geoFetch = cachedGeo
          ? Promise.resolve().then(() => {
              if (isMounted) setLocationName(cachedGeo.name);
            })
          : fetchLocationName(latitude, longitude, controller.signal)
              .then((data) => {
                if (!isMounted) return;

                const area    = data.locality || data.city || data.principalSubdivision || data.countryName;
                const city    = data.city;
                // FIX: was data.countryCode (e.g. "IN") — now data.countryName ("India").
                const country = data.countryName;
                const parts   = [area, city !== area ? city : null, country].filter(Boolean);
                const name    = parts.join(", ") || coordFallback;

                setLocationName(name);

                try {
                  if (safeStorage) evictOldestGeoCache(safeStorage);
                  const entry = JSON.stringify({ name, timestamp: Date.now() });
                  safeStorage?.setItem(cacheKey, entry);
                  safeStorage?.setItem("last-loc-name", entry);
                } catch (err) {
                  logDev("LocalStorage write failed:", err);
                }
              })
              .catch((fetchErr) => {
                if (!isMounted || fetchErr.name === "AbortError") return;
                setLocationName(coordFallback);
              });

        // FIX: Wait for BOTH timezone and geocoding to finish before releasing
        // the gpsLoading gate. This guarantees the single render triggered by
        // setGpsLoading(false) carries correct coords AND the correct IANA
        // timezone — so useHomeState fires exactly one weather fetch with the
        // right params.
        await Promise.allSettled([tzFetch, geoFetch]);

        if (isMounted) setGpsLoading(false);
      },

      (err) => {
        if (!isMounted) return;

        setGpsLoading(false);

        let errMsg = "Unable to retrieve location.";
        if (err.code === 1) errMsg = "Location permission denied.";
        if (err.code === 3) errMsg = "Location request timed out.";

        setError(`${errMsg} Using fallback location.`);
        setLocationName((prev) =>
          prev.includes("Detecting") ? `${GPS_FALLBACK_NAME} (Fallback)` : prev,
        );
      },

      {
        enableHighAccuracy: false,
        timeout:            GPS_TIMEOUT_MS,
        maximumAge:         GEO_CACHE_EXPIRY_MS,
      },
    );

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);

  return {
    coords,
    coordsCacheAge,
    locationName,
    timezone,
    error,
    gpsDetected,
    gpsLoading,
  };
}