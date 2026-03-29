import { ERROR_TYPES } from "./constants";

/**
 * Cache write guard — only persist responses that carry real data and no error.
 *
 * Shared between weatherService and airQualityService to enforce a consistent
 * cache-validation contract across all data-fetching services.  Previously
 * each service duplicated this predicate verbatim; a single definition here
 * means a future change (e.g. allowing partial data through) applies everywhere.
 *
 * @param {{ data: unknown, error: unknown } | null | undefined} result
 * @returns {boolean}
 */
export const isValidServiceResult = (result) =>
  result?.data != null && !result?.error;

/**
 * Normalises a caught error into a typed service error object.
 *
 * Centralises the `err.name === "AbortError"` discrimination that was
 * duplicated in every catch block of every service function.
 *
 * @param   {unknown} err
 * @param   {string}  [fallbackMessage="Request failed"]
 * @returns {{ message: string, type: string }}
 *
 * @example
 * catch (err) {
 *   return { data: null, error: toServiceError(err) };
 * }
 */
export const toServiceError = (err, fallbackMessage = "Request failed") => ({
  message: err?.message || fallbackMessage,
  type:    err?.name === "AbortError" ? ERROR_TYPES.ABORT_ERROR : ERROR_TYPES.API_ERROR,
});

/**
 * Builds a pre-aborted service response. Extracted so callers don't have to
 * remember the exact error shape when they check `signal?.aborted` at the top
 * of a fetch function.
 *
 * @returns {{ data: null, error: { message: string, type: string } }}
 */
export const abortedResult = () => ({
  data:  null,
  error: { message: "Request aborted", type: ERROR_TYPES.ABORT_ERROR },
});