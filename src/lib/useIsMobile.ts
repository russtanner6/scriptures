"use client";

import { useState, useEffect } from "react";

/**
 * Shared hook for responsive layout. Uses a debounced resize listener
 * to avoid excessive re-renders (especially on iOS where resize fires
 * during scroll as the URL bar shows/hides).
 */
export function useIsMobile(breakpoint = 768): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const check = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => setIsMobile(window.innerWidth < breakpoint), 150);
    };
    // Immediate check on mount (no debounce)
    setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener("resize", check);
    return () => {
      clearTimeout(timeout);
      window.removeEventListener("resize", check);
    };
  }, [breakpoint]);

  return isMobile;
}
