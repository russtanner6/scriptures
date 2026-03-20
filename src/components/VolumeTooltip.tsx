"use client";

import { useState, useRef, useCallback } from "react";

const VOLUME_FULL_NAMES: Record<string, string> = {
  OT: "Old Testament",
  NT: "New Testament",
  BoM: "Book of Mormon",
  "D&C": "Doctrine & Covenants",
  PoGP: "Pearl of Great Price",
};

interface VolumeTooltipProps {
  abbrev: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

/**
 * Wraps a volume abbreviation (or any children) with a styled tooltip
 * showing the full volume name on hover after a short delay.
 */
export default function VolumeTooltip({ abbrev, style, children }: VolumeTooltipProps) {
  const [show, setShow] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fullName = VOLUME_FULL_NAMES[abbrev];
  if (!fullName) return <span style={style}>{children ?? abbrev}</span>;

  const handleEnter = useCallback(() => {
    timerRef.current = setTimeout(() => setShow(true), 600);
  }, []);

  const handleLeave = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    setShow(false);
  }, []);

  return (
    <span
      style={{ position: "relative", display: "inline-flex", ...style }}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onTouchStart={handleEnter}
      onTouchEnd={handleLeave}
    >
      {children ?? abbrev}
      {show && (
        <span
          style={{
            position: "absolute",
            bottom: "calc(100% + 6px)",
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(15, 15, 20, 0.95)",
            color: "#e5e5e5",
            fontSize: "0.72rem",
            fontWeight: 500,
            padding: "5px 10px",
            borderRadius: "6px",
            whiteSpace: "nowrap",
            pointerEvents: "none",
            zIndex: 100,
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
            border: "1px solid rgba(255,255,255,0.1)",
            animation: "fadeIn 0.15s ease",
          }}
        >
          {fullName}
          {/* Arrow */}
          <span
            style={{
              position: "absolute",
              top: "100%",
              left: "50%",
              transform: "translateX(-50%)",
              borderLeft: "5px solid transparent",
              borderRight: "5px solid transparent",
              borderTop: "5px solid rgba(15, 15, 20, 0.95)",
            }}
          />
        </span>
      )}
    </span>
  );
}
