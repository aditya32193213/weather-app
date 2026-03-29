/**
 * geocodingService.js
 *
 * Thin fetch wrappers for the two external APIs that useGPS needs.
 * Extracting them here gives each layer a single responsibility:
 *
 *   geocodingService  — knows HOW to talk to the network endpoints
 *   useGPS            — knows HOW to manage GPS / timezone state
 *
 * Both functions throw on HTTP error or network failure.
 * Callers must catch AbortError (intentional cancellation) separately.
 *
 * Environment variable:
 *   VITE_GEOCODE_URL — override the reverse-geocode endpoint (e.g. self-hosted
 *                      or a privacy-preserving proxy). Falls back to bigdatacloud.
 */

const GEOCODE_BASE_URL =
  import.meta.env?.VITE_GEOCODE_URL ??
  "https://api.bigdatacloud.net/data/reverse-geocode-client";

const OPEN_METEO_FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

// ─── Timezone resolution ──────────────────────────────────────────────────────

/**
 * Resolves the IANA timezone for a GPS coordinate pair via Open-Meteo.
 *
 * `forecast_days=1` is the API minimum — we only need the `timezone` field
 * in the response, not actual forecast data. Using 0 returns HTTP 400.
 *
 * @param   {number}       lat
 * @param   {number}       lon
 * @param   {AbortSignal}  [signal]
 * @returns {Promise<{ timezone: string, [key: string]: unknown }>}
 * @throws  {Error}          On HTTP error (non-2xx).
 * @throws  {DOMException}   If aborted (name = "AbortError").
 */
export async function fetchTimezoneForCoords(lat, lon, signal = null) {
  const url =
    `${OPEN_METEO_FORECAST_URL}` +
    `?latitude=${lat}&longitude=${lon}&timezone=auto&forecast_days=1`;

  const res = await fetch(url, signal ? { signal } : {});
  if (!res.ok) throw new Error(`Timezone fetch failed: HTTP ${res.status}`);
  return res.json();
}

// ─── Reverse geocoding ────────────────────────────────────────────────────────

/**
 * Reverse-geocodes a GPS coordinate pair to a structured location object.
 *
 * Returns the raw bigdatacloud response. Callers should read:
 *   • data.locality            — neighbourhood / town
 *   • data.city                — city
 *   • data.principalSubdivision — state / province
 *   • data.countryName         — full country name (NOT countryCode)
 *
 * ⚠️  PRIVACY / GDPR NOTE: This call sends the user's precise GPS coordinates
 * to bigdatacloud.net — a third-party service. In a production deployment:
 *   1. Show a UI disclosure or consent prompt before requesting GPS.
 *   2. Reference bigdatacloud.net in your privacy policy as a data processor.
 *   3. Set VITE_GEOCODE_URL in .env to substitute a self-hosted alternative.
 * See README §Privacy for deployment guidance.
 *
 * @param   {number}       lat
 * @param   {number}       lon
 * @param   {AbortSignal}  [signal]
 * @returns {Promise<{
 *   locality:             string,
 *   city:                 string,
 *   principalSubdivision: string,
 *   countryName:          string,
 *   countryCode:          string,
 * }>}
 * @throws  {Error}          On HTTP error (non-2xx).
 * @throws  {DOMException}   If aborted (name = "AbortError").
 */
export async function fetchLocationName(lat, lon, signal = null) {
  const url =
    `${GEOCODE_BASE_URL}` +
    `?latitude=${lat}&longitude=${lon}&localityLanguage=en`;

  // FIX (#4 🟡 MEDIUM): Without a timeout the BigDataCloud fetch could hang
  // indefinitely if the service is slow or unresponsive. The GPS geolocation
  // itself times out at GPS_TIMEOUT_MS (5 s in useGPS), but the geocode fetch
  // runs *after* that and is not covered by the same guard — so gpsLoading
  // could stay true well past the GPS timeout, blocking the weather fetch.
  //
  // Fix: wrap with a 4-second local AbortController and combine it with any
  // caller-supplied signal via AbortSignal.any(). clearTimeout in finally
  // ensures no timer leak regardless of how the fetch resolves.
  const timeoutController = new AbortController();
  const timeoutId         = setTimeout(() => timeoutController.abort(), 4_000);

  const combined = signal
    ? AbortSignal.any([signal, timeoutController.signal])
    : timeoutController.signal;

  try {
    const res = await fetch(url, { signal: combined });
    if (!res.ok) throw new Error(`Geocode failed: HTTP ${res.status}`);
    return res.json();
  } finally {
    clearTimeout(timeoutId);
  }
}