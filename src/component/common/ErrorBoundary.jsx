import React from "react";
import { Link } from "react-router-dom";
import PropTypes from "prop-types";

// ─── Top-level Error Boundary ─────────────────────────────────────────────────
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    if (import.meta.env.DEV) {
      console.error("Render error caught by ErrorBoundary:", error, info);
    }
    // TODO: send to error monitoring service (Sentry, Datadog, etc.)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 bg-red-500/10 border border-red-500/20">
            <svg
              className="w-8 h-8 text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
          </div>
          <h2 className="text-lg font-semibold font-display text-text-primary mb-2">
            {this.props.title ?? "Something went wrong"}
          </h2>
          <p className="text-sm text-text-muted mb-6 max-w-sm">
            {this.props.description ??
              "An unexpected error occurred. Please refresh the page."}
          </p>
          {this.props.showNav ? (
            <div className="flex gap-3">
              <Link
                to="/"
                onClick={() => this.setState({ hasError: false, error: null })}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-br from-sky-400 to-indigo-400 text-slate-900 shadow-[0_4px_20px_rgba(56,189,248,0.3)]"
              >
                Go to Today
              </Link>
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold border border-surface-border text-text-secondary hover:bg-surface transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : (
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-br from-sky-400 to-indigo-400 text-slate-900 shadow-[0_4px_20px_rgba(56,189,248,0.3)]"
            >
              Refresh Page
            </button>
          )}
          {import.meta.env.DEV && this.state.error && (
            <pre className="mt-6 text-left text-[11px] text-red-400 bg-red-500/5 border border-red-500/20 rounded-xl p-4 max-w-lg overflow-auto">
              {this.state.error.toString()}
            </pre>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}

ErrorBoundary.propTypes = {
  children:    PropTypes.node.isRequired,
  title:       PropTypes.string,
  description: PropTypes.string,
  showNav:     PropTypes.bool,
};

// ─── Route-scoped Error Boundary ──────────────────────────────────────────────
// Wraps individual routes with a friendly error + nav fallback.
export const RouteErrorBoundary = ({ children, pageName }) => (
  <ErrorBoundary
    title={`Error loading ${pageName}`}
    description="This page encountered an error. You can try again or navigate to another page."
    showNav
  >
    {children}
  </ErrorBoundary>
);

// FIX: PropTypes were missing from RouteErrorBoundary entirely.
// Without these, prop-types validation silently skips both children and
// pageName, meaning a missing pageName would render "Error loading undefined"
// with no console warning to alert the developer.
RouteErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
  pageName: PropTypes.string.isRequired,
};