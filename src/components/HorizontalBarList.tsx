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
        const isClickable = onBarClick && item.value > 0;

        return (
          <div
            key={i}
            style={{
              display: "grid",
              gridTemplateColumns: onBarClick ? "100px 1fr 28px" : "100px 1fr",
              alignItems: "center",
              gap: "10px",
              fontSize: "0.85rem",
            }}
            className="bar-list-row-v2"
          >
            {/* Book name label */}
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

            {/* Bar track with fill and number inside */}
            <div
              style={{
                height: "30px",
                background: "rgba(139, 92, 246, 0.08)",
                borderRadius: "8px",
                position: "relative",
                display: "flex",
                alignItems: "center",
              }}
            >
              {/* Colored fill */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  height: "100%",
                  width: `${pct}%`,
                  minWidth: pct > 0 ? "16px" : "0",
                  background: gradient,
                  borderRadius: "8px",
                  transition: "width 0.6s cubic-bezier(0.22, 1, 0.36, 1)",
                }}
              />

              {/* Number inside the bar */}
              {item.value > 0 && (
                <span
                  style={{
                    position: "absolute",
                    right: pct > 20 ? undefined : "8px",
                    left: pct > 20 ? `calc(${pct}% - 8px)` : undefined,
                    transform: pct > 20 ? "translateX(-100%)" : undefined,
                    fontWeight: 700,
                    fontSize: "0.78rem",
                    fontVariantNumeric: "tabular-nums",
                    color: pct > 20 ? "#fff" : "var(--text-secondary)",
                    lineHeight: "30px",
                  }}
                >
                  {item.value}
                </span>
              )}
            </div>

            {/* Open icon — outside the bar, to the right */}
            {onBarClick && (
              <button
                type="button"
                onClick={() => isClickable && onBarClick(item)}
                disabled={!isClickable}
                style={{
                  background: "none",
                  border: "none",
                  cursor: isClickable ? "pointer" : "default",
                  padding: "0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "28px",
                  height: "28px",
                  opacity: isClickable ? 0.4 : 0.15,
                  transition: "opacity 0.15s",
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => isClickable && (e.currentTarget.style.opacity = "1")}
                onMouseLeave={(e) => isClickable && (e.currentTarget.style.opacity = "0.4")}
                title={isClickable ? `View verses in ${item.label}` : undefined}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--text-secondary)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
