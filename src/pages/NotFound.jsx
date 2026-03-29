import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";

/**
 * 404 Not Found page.
 *
 * Improvements over the previous 16-line stub:
 *   1. Glitch animation  — the "404" heading uses the .glitch-404 CSS class
 *      (defined in index.css) which pulses chromatic-aberration slices every
 *      ~5 s without being distracting on repeat visits.
 *   2. data-testid attrs — enables Playwright / Testing Library selectors
 *      without coupling tests to class names or text content.
 *   3. Back-button focus — useEffect moves keyboard focus to the "Back to
 *      Today" link on mount, so a user who lands here by accident can press
 *      Enter immediately without extra tab stops.
 *      (autoFocus on a Link is not recommended because screen-readers
 *       announce the page before the focus move; useEffect fires after paint.)
 */
export default function NotFound() {
  const backRef = useRef(null);

  // Move focus to the back-link after the page has painted.
  // Keyboard and screen-reader users can navigate back without tabbing through
  // the decorative elements above.
  useEffect(() => {
    backRef.current?.focus();
  }, []);

  return (
    <div
      data-testid="not-found-page"
      className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4"
    >
      {/* Glitch-animated 404 — .glitch-404 + data-text attr defined in index.css */}
      <p
        data-testid="not-found-heading"
        data-text="404"
        className="glitch-404 text-7xl font-bold font-display text-text-faint mb-4 select-none"
        aria-label="404"
      >
        404
      </p>

      <h2 className="text-xl font-semibold font-display text-text-primary mb-2">
        Page not found
      </h2>
      <p className="text-sm text-text-muted mb-6">
        The page you&apos;re looking for doesn&apos;t exist.
      </p>

      <Link
        ref={backRef}
        data-testid="not-found-back-link"
        to="/"
        className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-br from-sky-400 to-indigo-400 text-slate-900 shadow-[0_4px_20px_rgba(56,189,248,0.3)] focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 focus:ring-offset-transparent transition-opacity hover:opacity-90"
      >
        Back to Today
      </Link>
    </div>
  );
}