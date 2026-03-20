/**
 * modal-styles.ts
 *
 * Shared modal/popup styling tokens for the entire app.
 * All modals and popups should use these values so that
 * a single change here updates every popup site-wide.
 *
 * Usage:
 *   import { modalStyles, getModalTheme } from "@/lib/modal-styles";
 *   const mt = getModalTheme(lightMode);
 *   <div style={modalStyles.backdrop}> ... </div>
 *   <div style={{ ...modalStyles.panel(isMobile), ...mt.panelColors }}> ... </div>
 */

import type { CSSProperties } from "react";

/* ── colour tokens (light / dark) ── */

export function getModalTheme(lightMode: boolean) {
  return lightMode
    ? {
        panelBg: "#ffffff",
        panelBorder: "rgba(0, 0, 0, 0.10)",
        title: "#1a1a1a",
        subtitle: "#555555",
        body: "#444444",
        muted: "#888888",
        divider: "rgba(0, 0, 0, 0.08)",
        closeBg: "rgba(0, 0, 0, 0.05)",
        closeBorder: "rgba(0, 0, 0, 0.10)",
        closeColor: "#888888",
        panelColors: {
          background: "#ffffff",
          border: "1px solid rgba(0, 0, 0, 0.10)",
          color: "#1a1a1a",
        } as CSSProperties,
      }
    : {
        panelBg: "#1e1e28",
        panelBorder: "rgba(255, 255, 255, 0.08)",
        title: "#f0f0f0",
        subtitle: "#b0b0b0",
        body: "#9ca3af",
        muted: "#666666",
        divider: "rgba(255, 255, 255, 0.08)",
        closeBg: "rgba(255, 255, 255, 0.06)",
        closeBorder: "rgba(255, 255, 255, 0.10)",
        closeColor: "#888888",
        panelColors: {
          background: "#1e1e28",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          color: "#f0f0f0",
        } as CSSProperties,
      };
}

/* ── layout tokens ── */

export const modalStyles = {
  /** Full-screen translucent backdrop */
  backdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(0, 0, 0, 0.5)",
    backdropFilter: "blur(4px)",
    WebkitBackdropFilter: "blur(4px)",
    zIndex: 200,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
  } as CSSProperties,

  /** High-z backdrop for export modals that sit above everything */
  backdropHigh: {
    position: "fixed",
    inset: 0,
    background: "rgba(0, 0, 0, 0.6)",
    backdropFilter: "blur(4px)",
    WebkitBackdropFilter: "blur(4px)",
    zIndex: 1000,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
  } as CSSProperties,

  /** Modal panel — the white/dark card */
  panel: (isMobile: boolean): CSSProperties => ({
    borderRadius: "14px",
    padding: isMobile ? "24px 20px" : "28px 32px",
    maxWidth: "480px",
    width: "100%",
    maxHeight: isMobile ? "85vh" : "80vh",
    overflowY: "auto",
    boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
    position: "relative",
    textAlign: "left",
  }),

  /** Compact panel for simpler modals (export, confirm) */
  panelCompact: (isMobile: boolean): CSSProperties => ({
    borderRadius: "12px",
    padding: isMobile ? "20px 18px" : "28px",
    minWidth: isMobile ? "auto" : "280px",
    maxWidth: "360px",
    width: isMobile ? "100%" : "auto",
    boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
    position: "relative",
    textAlign: "left",
  }),

  /** Modal title */
  title: {
    fontSize: "1rem",
    fontWeight: 700,
    marginBottom: "16px",
    marginTop: 0,
    textAlign: "left",
  } as CSSProperties,

  /** Section heading inside a modal */
  sectionTitle: {
    fontSize: "0.82rem",
    fontWeight: 700,
    marginBottom: "3px",
    marginTop: 0,
  } as CSSProperties,

  /** Body / paragraph text */
  body: {
    fontSize: "0.78rem",
    lineHeight: 1.6,
    margin: 0,
    textAlign: "left",
  } as CSSProperties,

  /** Muted footnote / disclaimer */
  footnote: {
    fontSize: "0.68rem",
    lineHeight: 1.5,
    margin: "16px 0 0 0",
    paddingTop: "12px",
    textAlign: "left",
  } as CSSProperties,

  /** Close button (top-right ✕) */
  closeButton: {
    position: "absolute",
    top: "14px",
    right: "14px",
    background: "none",
    border: "none",
    fontSize: "1.1rem",
    cursor: "pointer",
    padding: "4px 8px",
    fontFamily: "inherit",
    lineHeight: 1,
    borderRadius: "6px",
  } as CSSProperties,
} as const;
