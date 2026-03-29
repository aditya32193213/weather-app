import React from "react";
import { useTheme } from "../../context/ThemeContext";

export default function ThemeToggle() {
  const { isDark, setIsDark } = useTheme();

  return (
    <button
      onClick={() => setIsDark((prev) => !prev)}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-pressed={isDark}
      className={`relative flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 bg-surface border border-surface-border backdrop-blur-md ${
        isDark ? "text-amber-400" : "text-slate-500"
      }`}
    >
      <span
        className="text-base transition-transform duration-300"
        style={{ transform: isDark ? "rotate(0deg)" : "rotate(180deg)" }}
        aria-hidden="true"
      >
        {isDark ? "☀️" : "🌙"}
      </span>
      <span className="hidden sm:block text-xs text-text-secondary">
        {isDark ? "Light" : "Dark"}
      </span>
    </button>
  );
}