// src/hooks/useDebounce.js

import { useState, useEffect } from "react";

/**
 * Returns a debounced copy of `value` that only updates after `delay` ms of
 * inactivity. Useful for suppressing rapid-fire re-renders (e.g. date-pickers,
 * resize events, text inputs that trigger API calls).
 *
 * Why there is no `prev === value` short-circuit guard
 * ────────────────────────────────────────────────────
 * An earlier version contained: `if (prev === value) return;` inside the
 * setTimeout callback. This was broken in two ways:
 *
 *   1. For objects (e.g. Date instances passed from Page 1), referential
 *      equality is almost never true between renders even when the logical
 *      value hasn't changed. `prev === value` was always false for Date
 *      objects, so the "optimisation" triggered setState on every debounce
 *      tick — the opposite of its intent.
 *
 *   2. For primitives, React's useState setter applies an Object.is
 *      comparison internally and skips the re-render when the value is
 *      identical. This deduplication happens at the *state update / render*
 *      level, not at the *effect scheduling* level. The useEffect here will
 *      still re-run whenever [value, delay] change (React always re-runs
 *      effects when deps change by reference), but the subsequent
 *      setDebouncedValue call will be a no-op if the primitive value hasn't
 *      changed — React bails out of the render without committing.
 *
 *      Bailing early in userland before calling setDebouncedValue is
 *      therefore redundant for primitives: React's scheduler does it for
 *      free. For objects it is incorrect (see point 1 above).
 *
 * The correct implementation calls setDebouncedValue unconditionally after
 * the delay and lets React deduplicate state updates where appropriate.
 *
 * @param   {T}      value        The value to debounce.
 * @param   {number} [delay=500]  Quiet period in ms.
 * @returns {T}      Debounced value.
 * @template T
 */
export function useDebounce(value, delay = 500) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}