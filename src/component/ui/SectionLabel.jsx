import React from "react";
import PropTypes from "prop-types";

// FIX: Wrapped in React.memo — SectionLabel is a pure presentational component
// with no internal state. Without memo, every parent re-render recreates it
// even when children/icon haven't changed, causing unnecessary DOM diffing
// across every section that uses it (Weather Parameters, Hourly Breakdown,
// Air Quality Breakdown, etc.).
const SectionLabel = React.memo(function SectionLabel({ children, icon }) {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      {icon && <span className="text-base" aria-hidden="true">{icon}</span>}
      <span className="text-xs font-semibold uppercase tracking-[0.15em] font-mono text-text-muted">
        {children}
      </span>
      <div className="flex-1 h-px bg-divider" aria-hidden="true" />
    </div>
  );
});

SectionLabel.displayName = "SectionLabel";

SectionLabel.propTypes = {
  children: PropTypes.node.isRequired,
  icon:     PropTypes.node,
};

export default SectionLabel;