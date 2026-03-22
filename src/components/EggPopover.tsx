"use client";

import { useEffect, useRef } from "react";
import type { ContextEgg } from "@/lib/types";
import { useBackToClose } from "@/lib/useBackToClose";

const CATEGORY_COLORS: Record<string, string> = {
  Linguistic: "#3B82F6",
  Historical: "#F59E0B",
  Cultural: "#10B981",
  Literary: "#8B5CF6",
  Restoration: "#06B6D4",
};

export default function EggPopover({
  egg,
  lightMode,
  isMobile,
  onClose,
}: {
  egg: ContextEgg;
  lightMode: boolean;
  isMobile: boolean;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useBackToClose(onClose);

  // Click outside to close
  useEffect(() => {
    const handle = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // Delay to avoid immediate close from the triggering click
    const timer = setTimeout(() => {
      document.addEventListener("pointerdown", handle);
    }, 100);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("pointerdown", handle);
    };
  }, [onClose]);

  // Escape to close
  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, [onClose]);

  const catColor = CATEGORY_COLORS[egg.category] || "#888";

  const parchment = {
    bg: lightMode ? "#f5f0e6" : "#2a2a35",
    border: lightMode ? "#d4c9a8" : "#3a3a48",
    text: lightMode ? "#3d3625" : "#e0ddd6",
    textMuted: lightMode ? "#7a7060" : "#9a9590",
    titleColor: lightMode ? "#2a2418" : "#f0ece4",
  };

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.3)",
          zIndex: 9998,
        }}
      />

      {/* Card */}
      <div
        ref={ref}
        style={{
          position: "fixed",
          zIndex: 9999,
          ...(isMobile
            ? {
                bottom: 0,
                left: 0,
                right: 0,
                borderRadius: "16px 16px 0 0",
                maxHeight: "70vh",
              }
            : {
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                borderRadius: "14px",
                maxWidth: "380px",
                width: "90%",
              }),
          background: parchment.bg,
          border: `1px solid ${parchment.border}`,
          boxShadow: lightMode
            ? "0 8px 32px rgba(0,0,0,0.12)"
            : "0 8px 32px rgba(0,0,0,0.5)",
          padding: "20px 22px",
          overflowY: "auto",
          animation: isMobile ? "slideUp 0.25s ease-out" : "eggPopIn 0.2s ease-out",
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "10px",
            right: "12px",
            background: "none",
            border: "none",
            color: parchment.textMuted,
            fontSize: "1.1rem",
            cursor: "pointer",
            fontFamily: "inherit",
            padding: "4px",
            lineHeight: 1,
          }}
          aria-label="Close"
        >
          ✕
        </button>

        {/* Category badge */}
        <span
          style={{
            display: "inline-block",
            fontSize: "0.68rem",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: catColor,
            background: `${catColor}18`,
            border: `1px solid ${catColor}30`,
            borderRadius: "6px",
            padding: "3px 8px",
            marginBottom: "10px",
          }}
        >
          {egg.category}
        </span>

        {/* Title */}
        <h3
          style={{
            fontSize: "1.05rem",
            fontWeight: 700,
            color: parchment.titleColor,
            margin: "0 0 10px",
            lineHeight: 1.3,
            paddingRight: "20px",
          }}
        >
          {egg.title}
        </h3>

        {/* Insight */}
        <p
          style={{
            fontSize: "0.92rem",
            color: parchment.text,
            lineHeight: 1.7,
            margin: "0 0 14px",
          }}
        >
          {egg.insight}
        </p>

        {/* Source */}
        <div
          style={{
            fontSize: "0.78rem",
            color: parchment.textMuted,
            fontStyle: "italic",
            lineHeight: 1.4,
            borderTop: `1px solid ${parchment.border}`,
            paddingTop: "10px",
          }}
        >
          {egg.source}
        </div>
      </div>
    </>
  );
}
