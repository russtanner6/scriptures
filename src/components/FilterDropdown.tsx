"use client";

import { useState, useRef, useEffect } from "react";

/**
 * Compact dropdown trigger for filter groups (Volumes, Options, Categories, etc.).
 * Shows a label + optional active-count badge + chevron.
 * Clicking reveals a dropdown panel with the filter controls inside.
 * Closes on outside click.
 */
export default function FilterDropdown({
  label,
  icon,
  activeCount,
  totalCount,
  colorDots,
  children,
  align = "left",
}: {
  label: string;
  icon?: string;
  activeCount?: number;
  totalCount?: number;
  /** Small colored dots shown in the trigger (e.g. active volume colors) */
  colorDots?: string[];
  children: React.ReactNode;
  /** Dropdown alignment relative to trigger */
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  const badge =
    activeCount !== undefined && totalCount !== undefined
      ? `${activeCount}/${totalCount}`
      : activeCount !== undefined
        ? String(activeCount)
        : null;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "7px",
          padding: "7px 12px",
          borderRadius: "8px",
          border: `1px solid ${open ? "var(--border-accent)" : "var(--border)"}`,
          background: open ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.02)",
          color: open ? "var(--text)" : "var(--text-secondary)",
          fontSize: "0.78rem",
          fontWeight: 500,
          fontFamily: "inherit",
          cursor: "pointer",
          transition: "all 0.15s",
          whiteSpace: "nowrap",
        }}
      >
        {icon && <span style={{ fontSize: "0.82rem", lineHeight: 1 }}>{icon}</span>}
        {label}

        {/* Color dots (e.g. active volume colors) */}
        {colorDots && colorDots.length > 0 && (
          <span style={{ display: "flex", gap: "3px", alignItems: "center" }}>
            {colorDots.slice(0, 5).map((c, i) => (
              <span
                key={i}
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: c,
                  flexShrink: 0,
                }}
              />
            ))}
          </span>
        )}

        {badge && (
          <span
            style={{
              background: "rgba(59,130,246,0.15)",
              color: "#60a5fa",
              fontSize: "0.68rem",
              fontWeight: 600,
              padding: "1px 6px",
              borderRadius: "10px",
              lineHeight: "1.3",
            }}
          >
            {badge}
          </span>
        )}

        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          style={{
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 0.2s",
            opacity: 0.5,
          }}
        >
          <path
            d="M2 3.5L5 6.5L8 3.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div
          className="filter-dropdown-panel"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            [align === "right" ? "right" : "left"]: 0,
            zIndex: 100,
            background: "var(--zinc-900)",
            border: "1px solid var(--border-accent)",
            borderRadius: "12px",
            padding: "14px 16px",
            minWidth: "220px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}
