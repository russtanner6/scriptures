"use client";

export interface BarItem {
  label: string;
  value: number;
  color?: string;
}

export default function HorizontalBarList({
  items,
  color = "var(--accent)",
  gradientEnd,
}: {
  items: BarItem[];
  color?: string;
  gradientEnd?: string;
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
                height: "20px",
                background: "var(--zinc-900)",
                borderRadius: "6px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${pct}%`,
                  background: gradient,
                  borderRadius: "inherit",
                  transition: "width 0.6s cubic-bezier(0.22, 1, 0.36, 1)",
                }}
              />
            </div>
            <div
              style={{
                fontWeight: 600,
                fontVariantNumeric: "tabular-nums",
                color: "var(--text-secondary)",
                textAlign: "right",
              }}
            >
              {item.value}
            </div>
          </div>
        );
      })}
    </div>
  );
}
