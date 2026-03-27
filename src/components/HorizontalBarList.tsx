"use client";

import { useState, useEffect } from "react";
import { getContrastText } from "@/lib/constants";

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
  staggerDelay = 60,
}: {
  items: BarItem[];
  color?: string;
  gradientEnd?: string;
  onBarClick?: (item: BarItem) => void;
  staggerDelay?: number;
}) {
  const max = Math.max(...items.map((b) => b.value), 1);

  // Staggered entrance — bars animate in one by one
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, [items]);

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
              opacity: mounted ? 1 : 0,
              transform: mounted ? "translateX(0)" : "translateX(-12px)",
              transition: `opacity 0.4s ease ${i * staggerDelay}ms, transform 0.5s cubic-bezier(0.22, 1, 0.36, 1) ${i * staggerDelay}ms`,
            }}
            className="bar-list-row-v2"
          >
            {/* Book name label */}
            <div
              style={{
                textAlign: "right",
                color: "var(--text)",
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
                height: "28px",
                background: "rgba(0, 0, 0, 0.25)",
                borderRadius: "6px",
                position: "relative",
                display: "flex",
                alignItems: "center",
                cursor: isClickable ? "pointer" : "default",
              }}
              onClick={() => isClickable && onBarClick && onBarClick(item)}
              onMouseEnter={(e) => { if (isClickable) e.currentTarget.style.filter = "brightness(1.15)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.filter = ""; }}
            >
              {/* Colored fill */}
              <div
                style={{
                  position: "absolute",
                  top: "0",
                  left: "0",
                  height: "100%",
                  width: mounted ? `${pct}%` : "0%",
                  minWidth: mounted && pct > 0 ? "14px" : "0",
                  background: gradient,
                  borderRadius: "6px",
                  transition: `width 1s cubic-bezier(0.22, 1, 0.36, 1) ${i * staggerDelay + 100}ms`,
                }}
              />

              {/* Value label */}
              {item.value > 0 && (
                <span
                  style={{
                    position: "absolute",
                    right: pct > 85 ? "8px" : undefined,
                    left: pct > 85 ? undefined : `calc(${Math.max(pct, 4)}% + 8px)`,
                    fontWeight: 700,
                    fontSize: "0.72rem",
                    fontVariantNumeric: "tabular-nums",
                    color: pct > 85 ? getContrastText(barColor) : "rgba(255,255,255,0.7)",
                    textShadow: pct > 85 ? "0 1px 2px rgba(0,0,0,0.3)" : "none",
                    lineHeight: "28px",
                    letterSpacing: "0.3px",
                    opacity: mounted ? 1 : 0,
                    transition: `opacity 0.3s ease ${i * staggerDelay + 600}ms`,
                  }}
                >
                  {item.value.toLocaleString()}
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
                  opacity: isClickable ? 0.6 : 0.15,
                  transition: "opacity 0.15s",
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => isClickable && (e.currentTarget.style.opacity = "1")}
                onMouseLeave={(e) => isClickable && (e.currentTarget.style.opacity = "0.6")}
                title={isClickable ? `View verses in ${item.label}` : undefined}
              >
                <svg
                  width="16"
                  height="16"
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
