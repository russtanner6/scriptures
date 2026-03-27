"use client";

import { useRef, useState, useEffect } from "react";

/**
 * Hook for scroll-reveal animation. Returns a ref to attach to the element
 * and a boolean `isVisible` that flips to true once the element enters the viewport.
 * Once triggered, it stays visible (no re-hiding on scroll out).
 */
export function useScrollReveal(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, isVisible };
}
