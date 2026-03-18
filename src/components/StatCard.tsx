"use client";

export default function StatCard({
  label,
  value,
  subtitle,
  color,
  onLabelClick,
}: {
  label: string;
  value: string | number;
  subtitle: string;
  color: string;
  onLabelClick?: () => void;
}) {
  const softColor = `${color}1a`;

  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "10px",
        padding: "24px 20px",
        transition: "border-color 0.2s, background 0.2s, box-shadow 0.2s",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "var(--border-accent)";
        e.currentTarget.style.background = "var(--surface-hover)";
        e.currentTarget.style.boxShadow = "0 0 24px rgba(139, 92, 246, 0.06)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--border)";
        e.currentTarget.style.background = "var(--surface)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <button
        type="button"
        className="stat-card-label"
        onClick={onLabelClick}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          fontSize: "0.72rem",
          fontWeight: 600,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          padding: "4px 10px",
          borderRadius: "8px",
          marginBottom: "14px",
          background: softColor,
          color: color,
          border: "none",
          cursor: onLabelClick ? "pointer" : "default",
          fontFamily: "inherit",
          transition: "opacity 0.15s",
        }}
      >
        {label}
      </button>
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
