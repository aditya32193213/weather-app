import { REQUEST_TIMEOUT } from "../utils/constants";

const MAX_RETRIES = 2;
const BASE_DELAY  = 300;   // ms — doubles each attempt
const MAX_DELAY   = 5000;  // ms — cap for exponential back-off

/** Emit warnings in development without leaking logs to production builds. */
const logDev = (...args) => {
  if (import.meta.env?.DEV) console.warn("[apiFetch]", ...args);
};

const isRetryable = (status) => status === 429 || status >= 500;

const backoffDelay = (attempt) => {
  const base   = BASE_DELAY * 2 ** attempt;
  const jitter = base * 0.2 * Math.random();
  return Math.min(base + jitter, MAX_DELAY);
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * GETs a JSON endpoint with:
 *   • Hard request timeout (REQUEST_TIMEOUT ms, from constants)
 *   • Caller-supplied AbortSignal forwarding
 *   • Exponential back-off + jitter retries for transient failures
 *   • Cache-Control: no-cache header when forceRefresh is true
 *
 * Retry policy
 * ────────────
 *   HTTP 429 / 5xx  → retried up to MAX_RETRIES times (2 attempts)
 *   HTTP 4xx other  → thrown immediately (caller error, not transient)
 *   AbortError      → thrown immediately (intentional cancellation)
 *   Network error   → retried
 *
 * Back-off schedule (approximate, before ±20% jitter):
 *   Attempt 1 — 300 ms
 *   Attempt 2 — 600 ms
 *
 * @param   {string}       url
 * @param   {AbortSignal}  [signal]        Caller-supplied cancellation signal.
 * @param   {boolean}      [forceRefresh]  When true, adds Cache-Control: no-cache
 *                                         so CDN / proxy caches are bypassed and
 *                                         the origin returns a fresh response.
 * @returns {Promise<unknown>}             Parsed JSON body.
 * @throws  {DOMException}                 If the request is aborted (name = "AbortError").
 * @throws  {Error}                        On non-retryable HTTP errors or exhausted retries.
 */
export const apiFetch = (url, signal = null, forceRefresh = false) =>
  _apiFetch(url, signal, forceRefresh, MAX_RETRIES, 0);

// ─── Internal recursive implementation ───────────────────────────────────────

async function _apiFetch(url, externalSignal, forceRefresh, retries, attempt) {
  if (typeof REQUEST_TIMEOUT !== "number" || REQUEST_TIMEOUT <= 0) {
    throw new Error(
      `[apiFetch] REQUEST_TIMEOUT must be a positive number, got: ${REQUEST_TIMEOUT}`
    );
  }

  if (externalSignal?.aborted) {
    throw new DOMException("Request aborted by caller", "AbortError");
  }

  const controller = new AbortController();

  const timeoutId = setTimeout(() => {
    controller.abort();
  }, REQUEST_TIMEOUT);

  if (externalSignal) {
    externalSignal.addEventListener(
      "abort",
      () => controller.abort(),
      { once: true }
    );
  }

  const signal = controller.signal;

  const cleanupAndRetry = async (delay) => {
    clearTimeout(timeoutId);
    await sleep(delay);
    // FIX: forceRefresh is forwarded to the recursive call so all retry
    // attempts also carry the Cache-Control: no-cache header.
    return _apiFetch(url, externalSignal, forceRefresh, retries - 1, attempt + 1);
  };

  // FIX: Build headers once. When forceRefresh is true, Cache-Control: no-cache
  // is added so CDN and proxy caches are bypassed — this is the mechanism that
  // makes the "Retry" button on the Historical error banner actually work.
  // Without it, a retry always hits the same (potentially corrupted) cache entry.
  const headers = {
    Accept: "application/json",
    ...(forceRefresh && { "Cache-Control": "no-cache" }),
  };

  try {
    const res = await fetch(url, { signal, headers });

    clearTimeout(timeoutId);

    if (!res.ok) {
      if (retries > 0 && isRetryable(res.status)) {
        const delay = backoffDelay(attempt);
        logDev(`HTTP ${res.status} — retry ${attempt + 1}/${MAX_RETRIES} in ${Math.round(delay)}ms`, url);
        return cleanupAndRetry(delay);
      }

      const body = await res.text().catch(() => "");
      throw new Error(
        `HTTP ${res.status} — ${url}${body ? `: ${body.slice(0, 200)}` : ""}`,
      );
    }

    let data;
    try {
      data = await res.json();
    } catch {
      throw new Error(`Invalid JSON response from ${url}`);
    }

    return data;
  } catch (err) {
    clearTimeout(timeoutId);

    if (err.name === "AbortError") {
      throw err;
    }

    if (retries > 0) {
      const delay = backoffDelay(attempt);
      logDev(`Network error — retry ${attempt + 1}/${MAX_RETRIES} in ${Math.round(delay)}ms`, url, err.message);
      return cleanupAndRetry(delay);
    }

    logDev("API request failed (retries exhausted):", url, err.message);
    throw err;
  }
}