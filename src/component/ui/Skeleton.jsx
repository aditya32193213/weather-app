

import React from "react";
import PropTypes from "prop-types";

const Skeleton = React.memo(function Skeleton({
  h         = "h-8",
  w         = "w-24",
  className = "",
}) {
  return (
    <div className={`rounded-xl ${h} ${w} animate-pulse bg-skeleton ${className}`} />
  );
});
Skeleton.displayName = "Skeleton";

Skeleton.propTypes = {
  h:         PropTypes.string,
  w:         PropTypes.string,
  className: PropTypes.string,
};

export default Skeleton;