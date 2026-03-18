"use client";

import { ReactNode } from "react";

export default function DashboardCard({
  title,
  description,
  children,
  fullWidth = false,
  tag,
  tagColor,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  fullWidth?: boolean;
  tag?: string;
  tagColor?: string;
}) {
  return (
    <div
      className={`dashboard-card${fullWidth ? " full-width" : ""}`}
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "10px",
        padding: "28px",
        transition: "border-color 0.2s, box-shadow 0.2s",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "var(--border-accent)";
        e.currentTarget.style.boxShadow = "0 0 24px rgba(255, 255, 255, 0.03)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--border)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <h2
        style={{
          fontSize: "0.88rem",
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
      {description && (
        <div
          style={{
            fontSize: "0.92rem",
            color: "var(--text-secondary)",
            marginBottom: "24px",
            fontWeight: 400,
            lineHeight: 1.5,
          }}
        >
          {description}
        </div>
      )}
      {children}
    </div>
  );
}
