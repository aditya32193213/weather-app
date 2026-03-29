import React from "react";
import PropTypes from "prop-types";

const PresetButton = function PresetButton({ label, days, onSelect, disabled }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(days)}
      disabled={disabled}
      className={`px-3 py-1.5 rounded-lg text-xs font-medium font-mono transition-all duration-200 border
        ${disabled
          ? "opacity-50 cursor-not-allowed bg-indigo-500/5 border-indigo-400/20 text-text-secondary"
          : "cursor-pointer bg-indigo-500/5 border-indigo-400/20 text-text-secondary hover:bg-indigo-500/15 hover:border-indigo-400/40 hover:text-indigo-400"
        }`}
    >
      {label}
    </button>
  );
};

PresetButton.propTypes = {
  label:    PropTypes.string.isRequired,
  days:     PropTypes.number.isRequired,
  onSelect: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

export default React.memo(PresetButton);