"use client";

import { useState, useCallback } from "react";

interface ChartZoomControlsProps {
  chartRef: React.RefObject<any>;
  color?: string;
  isMobile?: boolean;
  onZoomChange?: (level: number, scale: number) => void;
}

const ZOOM_LEVELS = [
  { label: "Fit", scale: 1 },
  { label: "2x", scale: 2 },
  { label: "4x", scale: 4 },
];

export default function ChartZoomControls({ chartRef, color = "#3B82F6", isMobile = false, onZoomChange }: ChartZoomControlsProps) {
  const [currentLevel, setCurrentLevel] = useState(0);

  const applyZoom = useCallback((levelIndex: number) => {
    const chart = chartRef.current;
    if (!chart) return;

    const targetScale = ZOOM_LEVELS[levelIndex].scale;
    setCurrentLevel(levelIndex);
    onZoomChange?.(levelIndex, targetScale);

    if (targetScale === 1) {
      chart.resetZoom();
    } else {
      chart.resetZoom();
      requestAnimationFrame(() => {
        chart.zoom(targetScale);
      });
    }
  }, [chartRef, onZoomChange]);

  const zoomIn = useCallback(() => {
    const next = Math.min(currentLevel + 1, ZOOM_LEVELS.length - 1);
    applyZoom(next);
  }, [currentLevel, applyZoom]);

  const zoomOut = useCallback(() => {
    const next = Math.max(currentLevel - 1, 0);
    applyZoom(next);
  }, [currentLevel, applyZoom]);

  const btnBase = (disabled: boolean): React.CSSProperties => ({
    width: isMobile ? "28px" : "30px",
    height: isMobile ? "28px" : "30px",
    borderRadius: "6px",
    border: "none",
    background: disabled ? "transparent" : "rgba(255,255,255,0.06)",
    color: disabled ? "var(--text-muted)" : "var(--text-secondary)",
    fontSize: "1rem",
    fontWeight: 700,
    cursor: disabled ? "default" : "pointer",
    fontFamily: "inherit",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    opacity: disabled ? 0.4 : 1,
    transition: "all 0.15s",
  });

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "8px",
        padding: "3px",
      }}
    >
      <button onClick={zoomOut} disabled={currentLevel === 0} style={btnBase(currentLevel === 0)} title="Zoom out">
        −
      </button>
      <span
        style={{
          fontSize: "0.68rem",
          fontWeight: 600,
          color: currentLevel > 0 ? color : "var(--text-muted)",
          minWidth: "28px",
          textAlign: "center",
          userSelect: "none",
          transition: "color 0.15s",
        }}
      >
        {ZOOM_LEVELS[currentLevel].label}
      </span>
      <button onClick={zoomIn} disabled={currentLevel === ZOOM_LEVELS.length - 1} style={btnBase(currentLevel === ZOOM_LEVELS.length - 1)} title="Zoom in">
        +
      </button>
    </div>
  );
}
