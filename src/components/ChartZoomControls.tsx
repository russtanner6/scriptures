"use client";

import { useRef, useState, useCallback, useEffect } from "react";

interface ChartZoomControlsProps {
  chartRef: React.RefObject<any>;
  color?: string;
  isMobile?: boolean;
}

const ZOOM_LEVELS = [
  { label: "Fit", scale: 1 },
  { label: "2x", scale: 2 },
  { label: "4x", scale: 4 },
];

export default function ChartZoomControls({ chartRef, color = "#3B82F6", isMobile = false }: ChartZoomControlsProps) {
  const [currentLevel, setCurrentLevel] = useState(0);

  const applyZoom = useCallback((levelIndex: number) => {
    const chart = chartRef.current;
    if (!chart) return;

    const targetScale = ZOOM_LEVELS[levelIndex].scale;
    setCurrentLevel(levelIndex);

    if (targetScale === 1) {
      chart.resetZoom();
    } else {
      // Reset first, then zoom to target
      chart.resetZoom();
      requestAnimationFrame(() => {
        chart.zoom(targetScale);
      });
    }
  }, [chartRef]);

  const zoomIn = useCallback(() => {
    const next = Math.min(currentLevel + 1, ZOOM_LEVELS.length - 1);
    applyZoom(next);
  }, [currentLevel, applyZoom]);

  const zoomOut = useCallback(() => {
    const next = Math.max(currentLevel - 1, 0);
    applyZoom(next);
  }, [currentLevel, applyZoom]);

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
      <button
        onClick={zoomOut}
        disabled={currentLevel === 0}
        style={{
          width: isMobile ? "28px" : "30px",
          height: isMobile ? "28px" : "30px",
          borderRadius: "6px",
          border: "none",
          background: currentLevel === 0 ? "transparent" : "rgba(255,255,255,0.06)",
          color: currentLevel === 0 ? "var(--text-muted)" : "var(--text-secondary)",
          fontSize: "1rem",
          fontWeight: 700,
          cursor: currentLevel === 0 ? "default" : "pointer",
          fontFamily: "inherit",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: currentLevel === 0 ? 0.4 : 1,
          transition: "all 0.15s",
        }}
        title="Zoom out"
      >
        −
      </button>

      {/* Zoom level indicator */}
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

      <button
        onClick={zoomIn}
        disabled={currentLevel === ZOOM_LEVELS.length - 1}
        style={{
          width: isMobile ? "28px" : "30px",
          height: isMobile ? "28px" : "30px",
          borderRadius: "6px",
          border: "none",
          background: currentLevel === ZOOM_LEVELS.length - 1 ? "transparent" : "rgba(255,255,255,0.06)",
          color: currentLevel === ZOOM_LEVELS.length - 1 ? "var(--text-muted)" : "var(--text-secondary)",
          fontSize: "1rem",
          fontWeight: 700,
          cursor: currentLevel === ZOOM_LEVELS.length - 1 ? "default" : "pointer",
          fontFamily: "inherit",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: currentLevel === ZOOM_LEVELS.length - 1 ? 0.4 : 1,
          transition: "all 0.15s",
        }}
        title="Zoom in"
      >
        +
      </button>
    </div>
  );
}
