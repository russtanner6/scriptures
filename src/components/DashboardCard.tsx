"use client";

import { ReactNode } from "react";

export default function DashboardCard({
  title,
  description,
  children,
  fullWidth = false,
  tag,
  tagColor,
  headerExtra,
}: {
  title: string;
  description?: React.ReactNode;
  children: ReactNode;
  fullWidth?: boolean;
  tag?: string;
  tagColor?: string;
  headerExtra?: ReactNode;
}) {
  return (
    <div
      className={`dashboard-card${fullWidth ? " full-width" : ""}`}
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "10px",
        padding: "28px",
      }}
    >
      <h2
        style={{
          fontSize: "1.05rem",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          color: "var(--text)",
          marginBottom: description ? "2px" : "24px",
        }}
      >
        {title}
        {tag && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              fontSize: "0.72rem",
              fontWeight: 700,
              letterSpacing: "0.06em",
              padding: "3px 8px",
              borderRadius: "6px",
              marginLeft: "8px",
              background: tagColor
                ? `${tagColor}1a`
                : "var(--accent-soft)",
              color: tagColor || "var(--accent)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {tag}
          </span>
        )}
      </h2>
      {(description || headerExtra) && (
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: "12px",
            marginBottom: "24px",
            flexWrap: "wrap",
          }}
        >
          {description && (
            <span
              style={{
                fontSize: "0.92rem",
                color: "var(--text-secondary)",
                fontWeight: 400,
                lineHeight: 1.5,
              }}
            >
              {description}
            </span>
          )}
          {headerExtra}
        </div>
      )}
      {children}
    </div>
  );
}
