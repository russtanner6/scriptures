"use client";

import { useEffect, useRef, useState } from "react";
import type { ContextNugget } from "@/lib/types";
import { useBackToClose } from "@/lib/useBackToClose";
import { analytics } from "@/lib/analytics";
import { LinkedScriptureText } from "./LinkedScriptureText";

const CATEGORY_COLORS: Record<string, string> = {
  Linguistic: "#3B82F6",
  Historical: "#F59E0B",
  Cultural: "#10B981",
  Literary: "#8B5CF6",
  Restoration: "#06B6D4",
};

export default function NuggetPopover({
  nuggets,
  lightMode,
  isMobile,
  onClose,
}: {
  nuggets: ContextNugget[];
  lightMode: boolean;
  isMobile: boolean;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  useBackToClose(onClose);

  // Slide-in animation
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { requestAnimationFrame(() => setIsVisible(true)); }, []);

  // Reset index when nuggets change
  useEffect(() => { setCurrentIndex(0); }, [nuggets]);

  const nugget = nuggets[currentIndex];
  const total = nuggets.length;

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

  if (!nugget) return null;

  const catColor = CATEGORY_COLORS[nugget.category] || "#888";
  const nuggetColor = lightMode ? "#B8860B" : "#F5A623";

  const bg = lightMode ? "#faf9f6" : "#111116";
  const headerBg = lightMode ? "#f0efe8" : "#16171e";
  const text = lightMode ? "#3d3625" : "#e0ddd6";
  const textMuted = lightMode ? "#7a7060" : "#9a9590";
  const titleColor = lightMode ? "#2a2418" : "#f0ece4";
  const border = lightMode ? "#d4c9a8" : "#3a3a48";

  const panelWidth = isMobile ? "85vw" : "min(85vw, 440px)";

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.3)",
          zIndex: 9998,
          opacity: isVisible ? 1 : 0,
          transition: "opacity 0.2s ease",
        }}
      />

      {/* Slide-in panel from right */}
      <div
        ref={ref}
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: panelWidth,
          maxWidth: "100vw",
          zIndex: 9999,
          background: bg,
          borderLeft: `1px solid ${border}`,
          boxShadow: lightMode
            ? "-4px 0 24px rgba(0,0,0,0.08)"
            : "-4px 0 24px rgba(0,0,0,0.4)",
          display: "flex",
          flexDirection: "column",
          transform: isVisible ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.25s ease-out",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 16px",
            background: headerBg,
            borderBottom: `1px solid ${border}`,
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {/* Nugget icon */}
            <svg width="14" height="13" viewBox="0 0 14 12" fill={nuggetColor} opacity="0.85">
              <path d="M3 11L0 5L3 1h8l3 4-3 6H3z" fill="none" stroke={nuggetColor} strokeWidth="1.2" strokeLinejoin="round" />
              <path d="M0 5h14M3 1l2 4-2 6M11 1l-2 4 2 6" fill="none" stroke={nuggetColor} strokeWidth="0.8" opacity="0.4" />
            </svg>
            <span style={{
              fontSize: "0.75rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: nuggetColor,
            }}>
              {total > 1 ? `Nuggets (${total})` : "Nugget"}
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: textMuted,
              fontSize: "1.2rem",
              cursor: "pointer",
              fontFamily: "inherit",
              padding: "4px 8px",
              lineHeight: 1,
            }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
          {/* Navigation (only when multiple) */}
          {total > 1 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "16px",
              }}
            >
              <button
                onClick={() => { analytics.nuggetNavigate("prev"); setCurrentIndex((i) => (i - 1 + total) % total); }}
                style={{
                  background: "none",
                  border: `1px solid ${border}`,
                  borderRadius: "6px",
                  color: text,
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  padding: "6px 12px",
                  lineHeight: 1,
                  transition: "all 0.15s",
                }}
                aria-label="Previous nugget"
              >
                ‹ Prev
              </button>
              <span
                style={{
                  fontSize: "0.72rem",
                  fontWeight: 600,
                  color: textMuted,
                  letterSpacing: "0.03em",
                }}
              >
                {currentIndex + 1} of {total}
              </span>
              <button
                onClick={() => { analytics.nuggetNavigate("next"); setCurrentIndex((i) => (i + 1) % total); }}
                style={{
                  background: "none",
                  border: `1px solid ${border}`,
                  borderRadius: "6px",
                  color: text,
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  padding: "6px 12px",
                  lineHeight: 1,
                  transition: "all 0.15s",
                }}
                aria-label="Next nugget"
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
              marginBottom: "12px",
            }}
          >
            {nugget.category}
          </span>

          {/* Title */}
          <h3
            style={{
              fontSize: "1.08rem",
              fontWeight: 700,
              color: titleColor,
              margin: "0 0 12px",
              lineHeight: 1.3,
            }}
          >
            {nugget.title}
          </h3>

          {/* Insight */}
          <p
            style={{
              fontSize: "0.95rem",
              color: text,
              lineHeight: 1.75,
              margin: "0 0 16px",
            }}
          >
            <LinkedScriptureText text={nugget.insight} linkColor="#2CC1E8" />
          </p>

          {/* Source — linked to Google search */}
          <div style={{ width: "25%", height: "1px", background: border, margin: "12px 0" }} />
          <div
            style={{
              fontSize: "0.78rem",
              fontStyle: "italic",
              lineHeight: 1.4,
            }}
          >
            <a
              href={`https://www.google.com/search?q=${encodeURIComponent(nugget.source)}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => analytics.nuggetSourceClick(nugget.id || "", nugget.source)}
              style={{
                color: lightMode ? "#5a5040" : "#b8b0a4",
                textDecoration: "underline",
                textDecorationColor: lightMode ? "#5a504040" : "#b8b0a440",
                textUnderlineOffset: "2px",
                transition: "color 0.15s",
                display: "inline",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#2CC1E8"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = lightMode ? "#5a5040" : "#b8b0a4"; }}
            >
              {nugget.source}
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: "4px", verticalAlign: "middle", opacity: 0.7, display: "inline" }}>
                <path d="M5 1H1v10h10V7" />
                <path d="M7 1h4v4" />
                <path d="M11 1L5 7" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
