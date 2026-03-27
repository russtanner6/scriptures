"use client";

import { useRef, useState, useEffect, useCallback } from "react";

interface SegmentedToggleProps<T extends string> {
  modes: T[];
  labels: Record<T, string>;
  active: T;
  onChange: (mode: T) => void;
}

/**
 * Segmented control with a sliding indicator that measures actual button widths.
 * Matches the showcase "segmented control" feel with spring easing.
 */
export default function SegmentedToggle<T extends string>({
  modes,
  labels,
  active,
  onChange,
}: SegmentedToggleProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  const updateIndicator = useCallback(() => {
    if (!containerRef.current) return;
    const activeIndex = modes.indexOf(active);
    if (activeIndex < 0) return;
    const buttons = containerRef.current.querySelectorAll<HTMLButtonElement>("[data-seg-btn]");
    const btn = buttons[activeIndex];
    if (!btn) return;
    setIndicator({
      left: btn.offsetLeft,
      width: btn.offsetWidth,
    });
  }, [active, modes]);

  useEffect(() => {
    updateIndicator();
    window.addEventListener("resize", updateIndicator);
    return () => window.removeEventListener("resize", updateIndicator);
  }, [updateIndicator]);

  // Re-measure after fonts load
  useEffect(() => {
    const t = setTimeout(updateIndicator, 100);
    return () => clearTimeout(t);
  }, [updateIndicator]);

  return (
    <div
      ref={containerRef}
      style={{
        display: "inline-flex",
        position: "relative",
        borderRadius: "10px",
        background: "#121217",
        padding: "4px",
      }}
    >
      {/* Sliding indicator */}
      <div
        style={{
          position: "absolute",
          top: "4px",
          bottom: "4px",
          left: `${indicator.left}px`,
          width: `${indicator.width}px`,
          borderRadius: "7px",
          background: "#3B82F6",
          transition: "left 0.35s cubic-bezier(0.22, 1, 0.36, 1), width 0.35s cubic-bezier(0.22, 1, 0.36, 1)",
          zIndex: 0,
        }}
      />
      {modes.map((mode) => {
        const isActive = active === mode;
        return (
          <button
            key={mode}
            data-seg-btn
            onClick={() => onChange(mode)}
            style={{
              position: "relative",
              zIndex: 1,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "7px 16px",
              borderRadius: "7px",
              border: "none",
              background: "transparent",
              color: isActive ? "#fff" : "rgba(255,255,255,0.35)",
              fontSize: "0.65rem",
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "color 0.3s",
              whiteSpace: "nowrap",
              letterSpacing: "0.3px",
              lineHeight: "1",
            }}
          >
            {labels[mode]}
          </button>
        );
      })}
    </div>
  );
}
