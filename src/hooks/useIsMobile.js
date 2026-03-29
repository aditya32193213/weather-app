import { useState, useEffect, useRef } from "react";

/**
 * Returns true when the viewport width is narrower than `breakpoint` pixels.
 *
 * @param   {number} [breakpoint=640]  Tailwind's `sm` breakpoint by default.
 * @returns {boolean}
 */
export function useIsMobile(breakpoint = 640) {
  const [isMobile, setIsMobile] = useState(
    () =>
      typeof window !== "undefined" ? window.innerWidth < breakpoint : false,
  );

  const timeoutRef = useRef();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const check = () => {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        setIsMobile(window.innerWidth < breakpoint);
      }, 100);
    };

    window.addEventListener("resize", check, { passive: true });

    return () => {
      window.removeEventListener("resize", check);
      clearTimeout(timeoutRef.current);
    };
  }, [breakpoint]);

  return isMobile;
}