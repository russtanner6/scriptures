"use client";

import { useEffect, useRef } from "react";
import { modalStyles as mStyles, getModalTheme } from "@/lib/modal-styles";

interface MethodologyModalProps {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  isMobile: boolean;
}

export default function MethodologyModal({
  title,
  isOpen,
  onClose,
  children,
  isMobile,
}: MethodologyModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  // Methodology modals are always on the dark site theme
  const mt = getModalTheme(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const timer = setTimeout(() => {
      window.addEventListener("click", handleClick);
    }, 100);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("click", handleClick);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          ...mStyles.backdrop,
          animation: "fadeIn 0.2s ease",
        }}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        style={{
          position: "fixed",
          top: isMobile ? "5%" : "50%",
          left: isMobile ? "4%" : "50%",
          right: isMobile ? "4%" : "auto",
          transform: isMobile ? "none" : "translate(-50%, -50%)",
          zIndex: 201,
          ...mt.panelColors,
          borderRadius: "14px",
          padding: isMobile ? "24px 20px" : "28px 32px",
          maxWidth: isMobile ? "none" : "580px",
          width: isMobile ? "auto" : "92%",
          maxHeight: isMobile ? "90vh" : "80vh",
          overflowY: "auto" as const,
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
          animation: "fadeIn 0.2s ease",
          textAlign: "left" as const,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: "20px",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "0.6rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.14em",
                color: "var(--accent)",
                marginBottom: "4px",
              }}
            >
              Methodology
            </div>
            <h3
              style={{
                ...mStyles.title,
                fontSize: "1.1rem",
                color: mt.title,
                marginBottom: 0,
              }}
            >
              {title}
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: mt.closeBg,
              border: `1px solid ${mt.closeBorder}`,
              borderRadius: "8px",
              color: mt.closeColor,
              fontSize: "0.85rem",
              padding: "4px 10px",
              cursor: "pointer",
              fontFamily: "inherit",
              flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div
          style={{
            fontSize: "0.85rem",
            color: mt.body,
            lineHeight: 1.75,
            textAlign: "left",
          }}
        >
          {children}
        </div>
      </div>
    </>
  );
}

/* Reusable styled elements for methodology content */

export function MethodSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "20px", textAlign: "left" }}>
      <h4
        style={{
          fontSize: "0.82rem",
          fontWeight: 700,
          color: "var(--text)",
          marginBottom: "6px",
          marginTop: 0,
        }}
      >
        {title}
      </h4>
      <div>{children}</div>
    </div>
  );
}

export function MethodNote({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "rgba(139, 92, 246, 0.08)",
        border: "1px solid rgba(139, 92, 246, 0.2)",
        borderRadius: "8px",
        padding: "12px 14px",
        fontSize: "0.8rem",
        color: "var(--text-secondary)",
        lineHeight: 1.6,
        marginTop: "16px",
        textAlign: "left",
      }}
    >
      {children}
    </div>
  );
}

export function MethodLink({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "none",
        border: "none",
        padding: 0,
        color: "var(--accent)",
        fontSize: "0.78rem",
        fontWeight: 500,
        fontFamily: "inherit",
        cursor: "pointer",
        textDecoration: "underline",
        textUnderlineOffset: "3px",
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
      }}
    >
      <span style={{ fontSize: "0.72rem" }}>ℹ</span>
      How this works
    </button>
  );
}
