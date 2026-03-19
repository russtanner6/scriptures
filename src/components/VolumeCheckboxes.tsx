"use client";

import type { Volume } from "@/lib/types";
import { VOLUME_COLORS, getContrastText, compactVolumeName } from "@/lib/constants";

/**
 * Consistent volume selector checkboxes used across all tools.
 * Renders a row of color-coded custom checkboxes matching the
 * canonical pattern from Word Search / Narrative Arc / Heatmap.
 */
export default function VolumeCheckboxes({
  volumes,
  selectedIds,
  onToggle,
  isMobile,
  label = "Volumes",
}: {
  volumes: Volume[];
  selectedIds: Set<number> | number[];
  onToggle: (id: number) => void;
  isMobile: boolean;
  label?: string;
}) {
  const isSelected = (id: number) =>
    Array.isArray(selectedIds) ? selectedIds.includes(id) : selectedIds.has(id);

  return (
    <div style={{ display: "flex", alignItems: isMobile ? "flex-start" : "center", gap: isMobile ? "8px" : "12px", flexWrap: "wrap", flexDirection: isMobile ? "column" : "row" }}>
      {label && (
        <span style={{ fontSize: "0.65rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)" }}>
          {label}
        </span>
      )}
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
        {volumes.map((v) => {
          const active = isSelected(v.id);
          const color = VOLUME_COLORS[v.abbrev] || "#888";
          return (
            <label
              key={v.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                cursor: "pointer",
                fontSize: "0.8rem",
                fontWeight: active ? 600 : 400,
                color: active ? "var(--text)" : "var(--text-secondary)",
                transition: "color 0.15s",
                whiteSpace: "nowrap",
              }}
            >
              <span
                onClick={(e) => { e.preventDefault(); onToggle(v.id); }}
                style={{
                  width: "14px",
                  height: "14px",
                  borderRadius: "3px",
                  border: active ? `2px solid ${color}` : "2px solid rgba(255,255,255,0.2)",
                  background: active ? color : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.15s",
                  flexShrink: 0,
                }}
              >
                {active && (
                  <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                    <path d="M2 5L4 7L8 3" stroke={getContrastText(color)} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              {compactVolumeName(v.name, isMobile)}
            </label>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Consistent category/option toggle pills used across tools.
 * Color-coded rounded pills that toggle on/off.
 */
export function CategoryPills({
  categories,
  activeIds,
  onToggle,
  label,
}: {
  categories: { id: string; label: string; color: string }[];
  activeIds: Set<string>;
  onToggle: (id: string) => void;
  label?: string;
}) {
  return (
    <div>
      {label && (
        <div style={{ fontSize: "0.65rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: "6px" }}>
          {label}
        </div>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
        {categories.map((cat) => {
          const active = activeIds.has(cat.id);
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onToggle(cat.id)}
              style={{
                padding: "4px 12px",
                borderRadius: "20px",
                border: `1px solid ${active ? cat.color : "var(--border)"}`,
                background: active ? `${cat.color}20` : "transparent",
                color: active ? cat.color : "var(--text-muted)",
                fontSize: "0.75rem",
                fontWeight: active ? 600 : 400,
                fontFamily: "inherit",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {cat.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Consistent section label used across all tool search panels.
 */
export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: "0.65rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: "6px" }}>
      {children}
    </div>
  );
}
