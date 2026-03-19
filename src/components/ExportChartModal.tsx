"use client";

import { useState } from "react";

type ExportFormat = "png" | "jpg" | "pdf";

export default function ExportChartModal({
  isOpen,
  onClose,
  chartRef,
  title,
}: {
  isOpen: boolean;
  onClose: () => void;
  chartRef: React.RefObject<any>;
  title: string;
}) {
  const [exporting, setExporting] = useState(false);

  if (!isOpen) return null;

  const handleExport = async (format: ExportFormat) => {
    const chart = chartRef.current;
    if (!chart) return;

    setExporting(true);
    try {
      const canvas = chart.canvas as HTMLCanvasElement;
      const fileName = `${title.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()}-narrative-arc`;

      if (format === "png") {
        const url = canvas.toDataURL("image/png");
        downloadFile(url, `${fileName}.png`);
      } else if (format === "jpg") {
        // JPG needs white background (canvas is transparent)
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const ctx = tempCanvas.getContext("2d")!;
        ctx.fillStyle = "#1a1a2e";
        ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        ctx.drawImage(canvas, 0, 0);
        const url = tempCanvas.toDataURL("image/jpeg", 0.95);
        downloadFile(url, `${fileName}.jpg`);
      } else if (format === "pdf") {
        const { jsPDF } = await import("jspdf");
        const imgData = canvas.toDataURL("image/png");
        const aspectRatio = canvas.width / canvas.height;
        const pdfWidth = 280;
        const pdfHeight = pdfWidth / aspectRatio;
        const doc = new jsPDF({
          orientation: aspectRatio > 1 ? "landscape" : "portrait",
          unit: "mm",
        });
        const pageWidth = doc.internal.pageSize.getWidth();
        const x = (pageWidth - pdfWidth) / 2;
        doc.addImage(imgData, "PNG", Math.max(x, 10), 20, Math.min(pdfWidth, pageWidth - 20), pdfHeight);
        doc.save(`${fileName}.pdf`);
      }
    } finally {
      setExporting(false);
      onClose();
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(4px)",
          zIndex: 1000,
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          background: "#1a1a2e",
          border: "1px solid var(--border, rgba(255,255,255,0.08))",
          borderRadius: "12px",
          padding: "28px",
          zIndex: 1001,
          minWidth: "280px",
          maxWidth: "360px",
        }}
      >
        <h3
          style={{
            fontSize: "1rem",
            fontWeight: 700,
            color: "var(--text, #f0f0f0)",
            marginBottom: "6px",
          }}
        >
          Export Chart
        </h3>
        <p
          style={{
            fontSize: "0.85rem",
            color: "var(--text-secondary, #9ca3af)",
            marginBottom: "20px",
          }}
        >
          Choose a format to download
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {([
            { format: "png" as ExportFormat, label: "PNG", desc: "Transparent background, best for presentations" },
            { format: "jpg" as ExportFormat, label: "JPG", desc: "Dark background, smaller file size" },
            { format: "pdf" as ExportFormat, label: "PDF", desc: "Print-ready document" },
          ]).map(({ format, label, desc }) => (
            <button
              key={format}
              onClick={() => handleExport(format)}
              disabled={exporting}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 16px",
                borderRadius: "8px",
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.04)",
                color: "var(--text, #f0f0f0)",
                fontSize: "0.88rem",
                fontWeight: 600,
                fontFamily: "inherit",
                cursor: exporting ? "wait" : "pointer",
                transition: "all 0.15s",
                textAlign: "left",
              }}
            >
              <div>
                <div>{label}</div>
                <div style={{ fontSize: "0.75rem", fontWeight: 400, color: "var(--text-muted, #6b7280)", marginTop: "2px" }}>{desc}</div>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: 0.5 }}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </button>
          ))}
        </div>

        <button
          onClick={onClose}
          style={{
            marginTop: "16px",
            width: "100%",
            padding: "10px",
            borderRadius: "8px",
            border: "1px solid rgba(255,255,255,0.08)",
            background: "transparent",
            color: "var(--text-secondary, #9ca3af)",
            fontSize: "0.82rem",
            fontWeight: 500,
            fontFamily: "inherit",
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
      </div>
    </>
  );
}

function downloadFile(dataUrl: string, filename: string) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Small "EXPORT" button to place in chart module headers.
 * Usage: <ExportButton onClick={() => setShowExport(true)} />
 */
export function ExportButton({ onClick, compact }: { onClick: () => void; compact?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Export chart"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "5px",
        padding: compact ? "5px 7px" : "4px 10px",
        borderRadius: "6px",
        border: "1px solid rgba(255,255,255,0.1)",
        background: "transparent",
        color: "var(--text-secondary, #9ca3af)",
        fontSize: "0.72rem",
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        fontFamily: "inherit",
        cursor: "pointer",
        transition: "all 0.15s",
      }}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
      {!compact && "Export"}
    </button>
  );
}

/**
 * Zoom controls: toggle + / − Fit buttons.
 * When active, shows +/− and Fit. Toggling off preserves current zoom level.
 * chartRef must be a ref to the Chart.js instance (from react-chartjs-2).
 */
export function ZoomControls({ active, onToggle, chartRef, compact }: {
  active: boolean;
  onToggle: () => void;
  chartRef: React.RefObject<any>;
  compact?: boolean;
}) {
  const btnBase: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: compact ? "5px 7px" : "4px 10px",
    borderRadius: "6px",
    border: "1px solid rgba(255,255,255,0.1)",
    background: "transparent",
    color: "var(--text-secondary, #9ca3af)",
    fontSize: "0.72rem",
    fontWeight: 600,
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em",
    fontFamily: "inherit",
    cursor: "pointer",
    transition: "all 0.15s",
    lineHeight: 1,
  };

  // Toggle zoom/pan on the chart instance directly (avoids options change → zoom reset)
  const handleToggle = () => {
    const chart = chartRef.current;
    if (chart?.options?.plugins?.zoom) {
      const willBeActive = !active;
      chart.options.plugins.zoom.zoom.wheel.enabled = willBeActive;
      chart.options.plugins.zoom.zoom.pinch.enabled = willBeActive;
      chart.options.plugins.zoom.pan.enabled = willBeActive;
      chart.update("none");
    }
    onToggle();
  };

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
      {/* +/− and Fit — visible when zoom is active */}
      {active && (
        <>
          <button
            type="button"
            title="Zoom in"
            onClick={() => chartRef.current?.zoom(1.3)}
            style={btnBase}
          >
            +
          </button>
          <button
            type="button"
            title="Zoom out"
            onClick={() => chartRef.current?.zoom(0.7)}
            style={btnBase}
          >
            −
          </button>
          <button
            type="button"
            title="Fit — reset to show all data"
            onClick={() => chartRef.current?.resetZoom()}
            style={btnBase}
          >
            Fit
          </button>
        </>
      )}

      {/* Zoom toggle */}
      <button
        type="button"
        onClick={handleToggle}
        title={active ? "Disable wheel/pinch zoom" : "Enable zoom — scroll to zoom, drag to pan"}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "5px",
          padding: compact ? "5px 7px" : "4px 10px",
          borderRadius: "6px",
          border: active ? "1px solid var(--accent, #3B82F6)" : "1px solid rgba(255,255,255,0.1)",
          background: active ? "var(--accent, #3B82F6)" : "transparent",
          color: active ? "#fff" : "var(--text-secondary, #9ca3af)",
          fontSize: "0.72rem",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          fontFamily: "inherit",
          cursor: "pointer",
          transition: "all 0.15s",
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
          <line x1="11" y1="8" x2="11" y2="14" />
          <line x1="8" y1="11" x2="14" y2="11" />
        </svg>
        {!compact && (active ? "Zoom ON" : "Zoom")}
      </button>
    </div>
  );
}
