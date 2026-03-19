"use client";

import { useEffect, useRef } from "react";

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
          position: "fixed",
          inset: 0,
          background: "rgba(0, 0, 0, 0.5)",
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
          zIndex: 200,
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
          background: "#1a1a24",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: "16px",
          padding: isMobile ? "24px 20px" : "32px",
          maxWidth: isMobile ? "none" : "580px",
          width: isMobile ? "auto" : "92%",
          maxHeight: isMobile ? "90vh" : "80vh",
          overflowY: "auto",
          boxShadow: "0 16px 48px rgba(0, 0, 0, 0.4)",
          animation: "fadeIn 0.2s ease",
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
                fontSize: "1.1rem",
                fontWeight: 700,
                color: "var(--text)",
                margin: 0,
              }}
            >
              {title}
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "8px",
              color: "var(--text-muted)",
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
            color: "var(--text-secondary)",
            lineHeight: 1.75,
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
    <div style={{ marginBottom: "20px" }}>
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
