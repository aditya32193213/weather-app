import { useState, useCallback, useRef, useEffect } from "react";
import PropTypes from "prop-types";
import { NavLink, Link } from "react-router-dom";
import ThemeToggle from "./ThemeToggle";
import { clearAllCache } from "../../api/cache";

// Module-level — never reallocated on re-render.
const navLinkClass = (isActive) =>
  `relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
    isActive
      ? "text-sky-400 bg-sky-400/10"
      : "text-text-muted hover:bg-black/5 dark:hover:bg-white/5"
  }`;

// Home icon
function HomeIcon({ strokeWidth }) {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={strokeWidth} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  );
}
HomeIcon.propTypes = { strokeWidth: PropTypes.number };

// Historical / chart icon
function ChartIcon({ strokeWidth }) {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={strokeWidth} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}
ChartIcon.propTypes = { strokeWidth: PropTypes.number };

// Reusable nav item — renders icon + label + active underline indicator.
function NavItem({ isActive, Icon, children }) {
  return (
    <>
      <Icon strokeWidth={isActive ? 2.5 : 2} />
      {children}
      {isActive && (
        <span
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full bg-sky-400 shadow-[0_0_8px_#38bdf8]"
          aria-hidden="true"
        />
      )}
    </>
  );
}
NavItem.propTypes = {
  isActive: PropTypes.bool.isRequired,
  Icon:     PropTypes.elementType.isRequired,
  children: PropTypes.node,
};

export default function Navbar() {
  const [cacheCleared, setCacheCleared] = useState(false);
  const timeoutRef = useRef(null);

  const handleClearCache = useCallback(() => {
    clearAllCache();
    setCacheCleared(true);
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setCacheCleared(false), 2000);
  }, []);

  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  return (
    <nav
      role="navigation"
      aria-label="Main navigation"
      className="sticky top-0 z-50 px-6 py-3 flex items-center justify-between bg-nav-bg border-b border-nav-border backdrop-blur-xl"
    >
      <div className="flex items-center gap-8">
        {/* ── Brand ──────────────────────────────────────────────────────── */}
        <Link
          to="/"
          className="flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 rounded-lg"
          aria-label="Atmos.live — go to home"
        >
          <div className="relative">
            <span className="text-2xl" aria-hidden="true">🌤</span>
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-sky-400 shadow-[0_0_6px_#38bdf8]" aria-hidden="true" />
          </div>
          <div>
            <span className="font-bold text-lg tracking-tight font-display text-text-primary">Atmos</span>
            <span className="text-sky-400 font-bold text-lg font-display">.live</span>
          </div>
        </Link>

        {/* ── Navigation links ───────────────────────────────────────────── */}
        <div className="flex items-center gap-1">
          <NavLink to="/" className={({ isActive }) => navLinkClass(isActive)}>
            {({ isActive }) => (
              <NavItem isActive={isActive} Icon={HomeIcon}>Today</NavItem>
            )}
          </NavLink>

          <NavLink to="/historical" className={({ isActive }) => navLinkClass(isActive)}>
            {({ isActive }) => (
              <NavItem isActive={isActive} Icon={ChartIcon}>Historical</NavItem>
            )}
          </NavLink>
        </div>
      </div>

      {/* ── Right-side controls ────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        {/*
          Clear Cache button — calls clearAllCache() from api/cache.js.
          Useful when the user wants fresh data without a full page reload
          (e.g. after a known API outage, or when testing changes).
          Shows "✓" confirmation for 2 s to acknowledge the action.

          FIX: Removed aria-pressed={cacheCleared}. aria-pressed is for toggle
          buttons with a persistent on/off state (e.g. bold, mute). This button
          triggers a one-shot action and resets automatically — it is not a
          toggle. Using aria-pressed here would tell screen readers the button
          is "pressed" (i.e. active/on), which is semantically wrong.
          An aria-live region announces the transient "cleared" feedback instead.
        */}
        <button
          type="button"
          onClick={handleClearCache}
          title="Clear all cached weather data"
          aria-label={cacheCleared ? "Cache cleared" : "Clear cached data"}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200
            bg-surface border border-surface-border backdrop-blur-md
            ${cacheCleared
              ? "text-emerald-400 border-emerald-400/20"
              : "text-text-muted hover:text-sky-400 hover:border-sky-400/20"
            }`}
        >
          {cacheCleared ? (
            /* Checkmark */
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            /* Refresh/clear icon */
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          )}
          <span className="hidden sm:block">
            {cacheCleared ? "Cleared" : "Clear cache"}
          </span>
        </button>

        {/* Screen-reader announcement for the cache-cleared action. */}
        <span aria-live="polite" className="sr-only">
          {cacheCleared ? "Cache cleared" : ""}
        </span>

        <ThemeToggle />
      </div>
    </nav>
  );
}