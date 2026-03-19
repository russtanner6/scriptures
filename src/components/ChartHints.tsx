"use client";

import { useState, useEffect } from "react";

const hintStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "4px",
  fontSize: "0.72rem",
  fontWeight: 500,
  color: "var(--text-muted, #6b7280)",
  letterSpacing: "0.01em",
};

const dotStyle: React.CSSProperties = {
  width: "3px",
  height: "3px",
  borderRadius: "50%",
  background: "var(--text-muted, #6b7280)",
  opacity: 0.5,
  flexShrink: 0,
};

/**
 * Chart interaction hints — shown below chart descriptions.
 * Platform-aware (Mac shows "Option", PC shows "Alt").
 * Mobile shows tap/pinch hints; desktop shows click/scroll/double-click.
 */
export default function ChartHints({ isMobile, showZoom = true, clickHint, showDrag = false }: { isMobile: boolean; showZoom?: boolean; clickHint?: string; showDrag?: boolean }) {
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    setIsMac(
      typeof navigator !== "undefined" &&
        /Mac|iPhone|iPad|iPod/i.test(navigator.userAgent)
    );
  }, []);

  const modKey = isMac ? "Option" : "Alt";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        flexWrap: "wrap",
        marginTop: "6px",
        padding: "6px 0 2px",
      }}
    >
      <span style={hintStyle}>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}>
          <path d="M15 15l-2 5L9 9l11 4-5 2z" />
        </svg>
        {clickHint || `${isMobile ? "Tap" : "Click"} any point to read verses`}
      </span>

      {showDrag && !isMobile && (
        <>
          <span style={dotStyle} />
          <span style={hintStyle}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}>
              <polyline points="5 9 2 12 5 15" />
              <polyline points="19 9 22 12 19 15" />
              <line x1="2" y1="12" x2="22" y2="12" />
            </svg>
            Drag to pan
          </span>
        </>
      )}

      {showZoom && (
        <>
          <span style={dotStyle} />
          <span style={hintStyle}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}>
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
              <line x1="11" y1="8" x2="11" y2="14" />
              <line x1="8" y1="11" x2="14" y2="11" />
            </svg>
            {isMobile ? "Pinch to zoom" : <><kbd style={{ padding: "1px 5px", borderRadius: "3px", border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", fontSize: "0.68rem", fontFamily: "inherit", lineHeight: 1.3 }}>{modKey}</kbd> + scroll to zoom</>}
          </span>

          {!isMobile && (
            <>
              <span style={dotStyle} />
              <span style={hintStyle}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}>
                  <polyline points="1 4 1 10 7 10" />
                  <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                </svg>
                Double-click to reset
              </span>
            </>
          )}
        </>
      )}
    </div>
  );
}
