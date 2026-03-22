"use client";

import { useEffect, useRef, useState } from "react";
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
  eggs,
  lightMode,
  isMobile,
  onClose,
}: {
  eggs: ContextEgg[];
  lightMode: boolean;
  isMobile: boolean;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  useBackToClose(onClose);

  // Reset index when eggs change
  useEffect(() => { setCurrentIndex(0); }, [eggs]);

  const egg = eggs[currentIndex];
  const total = eggs.length;

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

  // Escape to close, arrow keys to navigate
  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (total > 1) {
        if (e.key === "ArrowRight" || e.key === "ArrowDown") {
          e.preventDefault();
          setCurrentIndex((i) => (i + 1) % total);
        }
        if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
          e.preventDefault();
          setCurrentIndex((i) => (i - 1 + total) % total);
        }
      }
    };
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, [onClose, total]);

  if (!egg) return null;

  const catColor = CATEGORY_COLORS[egg.category] || "#888";

  const parchment = {
    bg: lightMode ? "#f5f0e6" : "#2a2a35",
    border: lightMode ? "#d4c9a8" : "#3a3a48",
    text: lightMode ? "#3d3625" : "#e0ddd6",
    textMuted: lightMode ? "#7a7060" : "#9a9590",
    titleColor: lightMode ? "#2a2418" : "#f0ece4",
  };

  const navBtnStyle: React.CSSProperties = {
    background: "none",
    border: `1px solid ${parchment.border}`,
    borderRadius: "6px",
    color: parchment.text,
    fontSize: "0.8rem",
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
    padding: "4px 10px",
    lineHeight: 1,
    transition: "all 0.15s",
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

        {/* Pagination indicator (only when multiple eggs) */}
        {total > 1 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "10px",
            }}
          >
            <button
              onClick={() => setCurrentIndex((i) => (i - 1 + total) % total)}
              style={navBtnStyle}
              aria-label="Previous egg"
            >
              ‹ Prev
            </button>
            <span
              style={{
                fontSize: "0.72rem",
                fontWeight: 600,
                color: parchment.textMuted,
                letterSpacing: "0.03em",
              }}
            >
              {currentIndex + 1} of {total}
            </span>
            <button
              onClick={() => setCurrentIndex((i) => (i + 1) % total)}
              style={navBtnStyle}
              aria-label="Next egg"
            >
              Next ›
            </button>
          </div>
        )}

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

        {/* Source — linked to Google search */}
        <div
          style={{
            fontSize: "0.78rem",
            fontStyle: "italic",
            lineHeight: 1.4,
            borderTop: `1px solid ${parchment.border}`,
            paddingTop: "10px",
          }}
        >
          <a
            href={`https://www.google.com/search?q=${encodeURIComponent(egg.source)}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: lightMode ? "#5a5040" : "#b8b0a4",
              textDecoration: "underline",
              textDecorationColor: lightMode ? "#5a504040" : "#b8b0a440",
              textUnderlineOffset: "2px",
              transition: "color 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#2563EB"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = lightMode ? "#5a5040" : "#b8b0a4"; }}
          >
            {egg.source}
            {/* External link icon */}
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: "4px", verticalAlign: "middle", opacity: 0.7 }}>
              <path d="M5 1H1v10h10V7" />
              <path d="M7 1h4v4" />
              <path d="M11 1L5 7" />
            </svg>
          </a>
        </div>
      </div>
    </>
  );
}
