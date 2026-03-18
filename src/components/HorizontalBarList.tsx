"use client";

export interface BarItem {
  label: string;
  value: number;
  color?: string;
  id?: number; // bookId for verse lookup
}

export default function HorizontalBarList({
  items,
  color = "var(--accent)",
  gradientEnd,
  onBarClick,
}: {
  items: BarItem[];
  color?: string;
  gradientEnd?: string;
  onBarClick?: (item: BarItem) => void;
}) {
  const max = Math.max(...items.map((b) => b.value), 1);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
      {items.map((item, i) => {
        const pct = (item.value / max) * 100;
        const barColor = item.color || color;
        const gradient = gradientEnd
          ? `linear-gradient(90deg, ${barColor}, ${gradientEnd})`
          : barColor;

        return (
          <div key={i} className="bar-list-row">
            <div
              style={{
                textAlign: "right",
                color: "var(--text-secondary)",
                fontWeight: 500,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
              title={item.label}
            >
              {item.label}
            </div>
            <div
              style={{
                height: "22px",
                background: "rgba(139, 92, 246, 0.08)",
                borderRadius: "8px",
                cursor: onBarClick && item.value > 0 ? "pointer" : "default",
                position: "relative",
              }}
              onClick={() => onBarClick && item.value > 0 && onBarClick(item)}
              title={onBarClick && item.value > 0 ? `View verses in ${item.label}` : undefined}
            >
              <div
                style={{
                  height: "100%",
                  width: `${pct}%`,
                  minWidth: pct > 0 ? "16px" : "0",
                  background: gradient,
                  borderRadius: "8px",
                  transition: "width 0.6s cubic-bezier(0.22, 1, 0.36, 1)",
                }}
              />
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                justifyContent: "flex-end",
              }}
            >
              <span
                style={{
                  fontWeight: 600,
                  fontVariantNumeric: "tabular-nums",
                  color: "var(--text-secondary)",
                  textAlign: "right",
                }}
              >
                {item.value}
              </span>
              {onBarClick && item.value > 0 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onBarClick(item);
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--text-muted)",
                    fontSize: "0.7rem",
                    padding: "2px",
                    lineHeight: 1,
                    opacity: 0.5,
                    transition: "opacity 0.15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.5")}
                  title={`View verses in ${item.label}`}
                >
                  📖
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
