import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";

const ThemeContext = createContext(undefined);

const safeLocalStorage = {
  getItem: (key) => {
    try { return typeof localStorage !== "undefined" ? localStorage.getItem(key) : null; }
    catch { return null; }
  },
  setItem: (key, val) => {
    try { if (typeof localStorage !== "undefined") localStorage.setItem(key, val); }
    catch { /* quota exceeded or storage unavailable */ }
  },
};

/**
 * Provides `{ isDark, setIsDark }` to the tree.
 *
 * Theme resolution precedence (highest → lowest):
 *   1. Explicit user preference stored in localStorage ("dark" | "light")
 *   2. OS / browser color-scheme preference (prefers-color-scheme media query)
 *   3. Light (safe fallback for SSR / headless environments)
 *
 * The OS preference is also watched at runtime: if the user hasn't set an
 * explicit preference and changes their system theme while the app is open,
 * the app will follow without requiring a page reload.
 *
 * FIX: `userInitiatedRef` tracks whether the current `isDark` change came from
 * an explicit user toggle. The apply-theme effect only writes to localStorage
 * when that ref is true, preventing OS-preference events from stamping a
 * stored preference and breaking the "follow system" behaviour.
 *
 * @param {{ children: React.ReactNode }} props
 */
export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(() => {
    const stored = safeLocalStorage.getItem("theme");
    if (stored === "dark")  return true;
    if (stored === "light") return false;
    // No stored preference — follow the OS.
    return typeof window !== "undefined"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
      : false;
  });

  // Tracks whether the in-flight isDark change was triggered by the user
  // (via handleSetIsDark) or by an OS-preference event. Only user-initiated
  // changes should be written to localStorage.
  const userInitiatedRef = useRef(false);

  // Exposed setter — marks the change as user-initiated before updating state.
  const handleSetIsDark = useCallback((val) => {
    userInitiatedRef.current = true;
    setIsDark(val);
  }, []);

  // Apply the theme class; persist only when user explicitly toggled.
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle("dark", isDark);
    if (userInitiatedRef.current) {
      safeLocalStorage.setItem("theme", isDark ? "dark" : "light");
      userInitiatedRef.current = false;
    }
  }, [isDark]);

  // Follow OS preference changes — but only when the user has NOT set an
  // explicit preference. Once they toggle the button, localStorage takes over
  // and this listener becomes a no-op until the preference is cleared.
  // Note: calls setIsDark directly (not handleSetIsDark) so the OS event
  // does NOT set userInitiatedRef and therefore does NOT write to localStorage.
  useEffect(() => {
    if (typeof window === "undefined") return;

    const mql     = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e) => {
      // Re-read from storage inside the handler so it always reflects the
      // latest user choice rather than a stale closure over the initial value.
      if (!safeLocalStorage.getItem("theme")) {
        setIsDark(e.matches);
      }
    };

    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []); // Run once — the handler reads localStorage dynamically on each event.

  // Memoize the context value so consumers only re-render when isDark changes.
  const contextValue = useMemo(
    () => ({ isDark, setIsDark: handleSetIsDark }),
    [isDark, handleSetIsDark],
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

ThemeProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (ctx === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
}