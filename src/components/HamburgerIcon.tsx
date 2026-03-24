"use client";

/**
 * Canonical hamburger menu icon — staggered three-line pattern.
 * This is the SINGLE SOURCE OF TRUTH for the hamburger icon across the entire site.
 * If changed here, it changes everywhere.
 */
export default function HamburgerIcon({ color = "#fff" }: { color?: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "4px",
        alignItems: "flex-end",
      }}
    >
      <span
        style={{
          display: "block",
          width: "14px",
          height: "1.5px",
          background: color,
          borderRadius: "1px",
        }}
      />
      <span
        style={{
          display: "block",
          width: "20px",
          height: "1.5px",
          background: color,
          borderRadius: "1px",
        }}
      />
      <span
        style={{
          display: "block",
          width: "16px",
          height: "1.5px",
          background: color,
          borderRadius: "1px",
        }}
      />
    </div>
  );
}
