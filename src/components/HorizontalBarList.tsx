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
                fontSize: "inherit",
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
                cursor: isClickable ? "pointer" : "default",
                display: "flex",
                alignItems: "center",
              }}
              onClick={() => isClickable && onBarClick(item)}
              title={isClickable ? `View verses in ${item.label}` : undefined}
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

              {/* Number + icon overlay — positioned at right end of bar or right of track */}
              <div
                style={{
                  position: "absolute",
                  right: pct > 20 ? undefined : "8px",
                  left: pct > 20 ? `calc(${pct}% - 8px)` : undefined,
                  transform: pct > 20 ? "translateX(-100%)" : undefined,
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  height: "100%",
                  paddingRight: pct > 20 ? "0" : "0",
                }}
              >
                <span
                  style={{
                    fontWeight: 700,
                    fontSize: "0.78rem",
                    fontVariantNumeric: "tabular-nums",
                    color: pct > 20 ? "#fff" : "var(--text-secondary)",
                  }}
                >
                  {item.value > 0 ? item.value : ""}
                </span>
                {isClickable && (
                  <span
                    style={{
                      fontSize: "0.65rem",
                      opacity: 0.6,
                    }}
                  >
                    📖
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
