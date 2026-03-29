import React from "react";
import PropTypes from "prop-types";

export const EmptyState = React.memo(function EmptyState({
  message   = "No data available",
  className = "",
}) {
  return (
    <div className={`text-center text-text-muted py-6 text-sm ${className}`.trim()}>
      {message}
    </div>
  );
});

EmptyState.displayName = "EmptyState";

EmptyState.propTypes = {
  message:   PropTypes.string,
  className: PropTypes.string,
};