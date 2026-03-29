// src/context/GPSContext.jsx

import { createContext, useContext, useMemo } from "react";
import { useGPS } from "../hooks/useGPS";
import PropTypes from "prop-types";

const GPSContext = createContext(undefined);


export function GPSProvider({ children }) {
  const {
    coords,
    coordsCacheAge,
    locationName,
    timezone,
    error,
    gpsDetected,
    gpsLoading,
  } = useGPS();

  const value = useMemo(
    () => ({ coords, coordsCacheAge, locationName, timezone, error, gpsDetected, gpsLoading }),
    [coords, coordsCacheAge, locationName, timezone, error, gpsDetected, gpsLoading],
  );

  return <GPSContext.Provider value={value}>{children}</GPSContext.Provider>;
}

export function useGPSContext() {
  const ctx = useContext(GPSContext);
  if (ctx === undefined) {
    throw new Error("useGPSContext must be used within a GPSProvider");
  }
  return ctx;
}

GPSProvider.propTypes = {
  children: PropTypes.node.isRequired,
};