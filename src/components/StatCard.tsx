"use client";

export default function StatCard({
  label,
  value,
  subtitle,
  color,
}: {
  label: string;
  value: string | number;
  subtitle: string;
  color: string;
}) {
  const softColor = `${color}1a`;

  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "16px",
        padding: "24px 20px",
        transition: "border-color 0.2s, background 0.2s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "var(--border-accent)";
        e.currentTarget.style.background = "var(--surface-hover)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--border)";
        e.currentTarget.style.background = "var(--surface)";
      }}
    >
      <div
        className="stat-card-label"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          fontSize: "0.72rem",
          fontWeight: 600,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          padding: "4px 10px",
          borderRadius: "100px",
          marginBottom: "14px",
          background: softColor,
          color: color,
        }}
      >
        <span
          style={{
            width: "6px",
            height: "6px",
            borderRadius: "50%",
            background: color,
          }}
        />
        {label}
      </div>
      <div
        className="stat-card-value"
        style={{
          fontSize: "2.5rem",
          fontWeight: 800,
          letterSpacing: "-0.03em",
          color: "var(--text)",
          fontVariantNumeric: "tabular-nums",
          lineHeight: 1,
          marginBottom: "4px",
        }}
      >
        {typeof value === "number" ? value.toLocaleString() : value}
      </div>
      <div
        style={{
          fontSize: "0.88rem",
          color: "var(--text-secondary)",
          fontWeight: 500,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {subtitle}
      </div>
    </div>
  );
}
