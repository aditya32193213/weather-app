// src/api/cache.js

import { CACHE_VERSION, MAX_CACHE_ITEM_BYTES } from "../utils/constants";

/**
 * In-flight request registry.
 * Prevents parallel requests for the same cache key from racing to the network.
 *
 * Each entry stores the raw Promise returned by fetchFn (not { promise, controller }).
 * A new caller awaits the shared promise and inspects the resolved value:
 *   • If it resolved with real data or a non-abort error — the result is shared.
 *   • If it resolved with an abort result (ABORT_ERROR, e.g. React StrictMode
 *     cleanup) — the caller falls through to make its own independent request.
 *
 * React StrictMode (effect → cleanup → remount) flow:
 *   Effect 1 fires → pendingRequests.set(key, promise1)
 *   Cleanup    → AbortController1.abort() → promise1 resolves with abortedResult
 *   Effect 2   → pendingRequests still has key → awaits promise1 → gets abortedResult
 *              → detects ABORT_ERROR → falls through → fires real request ✓
 *
 * Note: controller is NOT stored here — abort is the responsibility of the
 * caller (e.g. useWeather) via the AbortController it passes to fetchFn.
 */
const pendingRequests = new Map();

const DEFAULT_EXPIRY_MS = 5 * 60 * 1000;

const MANAGED_PREFIXES = [
  CACHE_VERSION + "_",
  "geo-",
];

// ─── Logging ─────────────────────────────────────────────────────────────────

const logDev = (...args) => {
  if (import.meta.env?.DEV) console.warn("[cache]", ...args);
};

// ─── Safe localStorage wrappers ───────────────────────────────────────────────

const safeGet = (key) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const safeSet = (key, value) => {
  try {
    const serialized = JSON.stringify(value);

    if (serialized.length > MAX_CACHE_ITEM_BYTES) {
      logDev(
        `Cache item too large (${serialized.length} bytes > ${MAX_CACHE_ITEM_BYTES} limit) ` +
        `for key "${key}" — skipping write.`,
      );
      return;
    }

    localStorage.setItem(key, serialized);
  } catch (e) {
    // Reactive guard: catches quota exhaustion from accumulated smaller writes.
    if (e?.name === "QuotaExceededError") {
      logDev(`localStorage quota exceeded for key "${key}" — data will not be cached.`);
    }
    // All other storage failures (SSR, private-browsing) are silently ignored.
  }
};

const safeRemove = (key) => {
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore.
  }
};

// ─── Abort result detection ───────────────────────────────────────────────────

/**
 * Returns true if the resolved service result represents an aborted request.
 * Matches the shape returned by abortedResult() in serviceUtils.js.
 */
const isAbortResult = (result) =>
  result?.error?.type === "ABORT_ERROR";

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Fetches data with layered caching:
 *
 *   1. localStorage read     — returns immediately for live, valid entries
 *   2. In-flight dedup       — concurrent callers share one pending Promise,
 *                              UNLESS the shared promise resolved with an abort
 *                              (e.g. React StrictMode cleanup) — in that case
 *                              the new caller falls through to make its own request.
 *   3. Network fetch         — calls `fetchFn` only when cache misses
 *   4. localStorage write    — persists results that pass the `validate` check
 *
 * @param {string}                     cacheKey
 * @param {() => Promise<unknown>}     fetchFn
 * @param {object}                     [options]
 * @param {number}                     [options.cacheExpiry=300000]
 * @param {boolean}                    [options.forceRefresh=false]
 * @param {(data: unknown) => boolean} [options.validate]
 * @returns {Promise<unknown>}
 */
export const fetchWithCache = async (cacheKey, fetchFn, options = {}) => {
  const {
    cacheExpiry  = DEFAULT_EXPIRY_MS,
    forceRefresh = false,
    validate,
  } = options;

  // ── 1. Cache read ──────────────────────────────────────────────────────────
  if (!forceRefresh) {
    const cached = safeGet(cacheKey);

    if (cached) {
      const { data, timestamp } = cached;
      const alive = Date.now() - timestamp < cacheExpiry;
      const valid = !validate || validate(data);

      if (alive && valid) return data;

      if (!alive) safeRemove(cacheKey);
    }
  }

  // ── 2. In-flight deduplication ─────────────────────────────────────────────
  // FIX: If there's a pending promise for this key, await it — but only return
  // it to the caller if it resolved with real data. If it resolved with an
  // abort result (e.g. React StrictMode Effect 1 was cleaned up), we fall
  // through so this caller makes its own independent request.
  if (pendingRequests.has(cacheKey)) {
    const sharedResult = await pendingRequests.get(cacheKey);

    if (!isAbortResult(sharedResult)) {
      // Real data or a non-abort error — safe to share with this caller.
      return sharedResult;
    }

    // The shared request was aborted by a different caller (e.g. StrictMode
    // cleanup). Don't propagate the abort to this caller. Fall through to
    // make a fresh request below.
    logDev(`Shared pending request for "${cacheKey}" was aborted — retrying independently.`);
  }

  // ── 3. Network fetch ───────────────────────────────────────────────────────
  const promise = fetchFn();
  pendingRequests.set(cacheKey, promise);

  try {
    const data = await promise;

    // ── 4. Conditional cache write ─────────────────────────────────────────
    // Abort results and validation failures are never written to localStorage,
    // so a subsequent refresh always triggers a real fetch for those cases.
    if (!validate || validate(data)) {
      safeSet(cacheKey, { data, timestamp: Date.now() });
    }

    return data;
  } finally {
    pendingRequests.delete(cacheKey);
  }
};

/**
 * Removes all localStorage entries whose key begins with `prefix`.
 */
export const clearCacheByPrefix = (prefix) => {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(prefix))
      .forEach((k) => safeRemove(k));
  } catch {
    // localStorage unavailable.
  }
};

/**
 * Removes all localStorage entries managed by this application.
 */
export const clearAllCache = () => {
  MANAGED_PREFIXES.forEach(clearCacheByPrefix);
};

/** @internal — exposed only for test isolation. */
export const _clearPendingRequests = () => pendingRequests.clear();