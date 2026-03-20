"use client";

import { useState } from "react";
import { modalStyles as mStyles, getModalTheme } from "@/lib/modal-styles";

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
  // Export modals are always on the dark site theme
  const mt = getModalTheme(false);

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
      <div onClick={onClose} style={mStyles.backdropHigh} />

      {/* Modal */}
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 1001,
          ...mStyles.panelCompact(false),
          ...mt.panelColors,
        }}
      >
        <h3 style={{ ...mStyles.title, color: mt.title }}>
          Export Chart
        </h3>
        <p style={{ ...mStyles.body, color: mt.subtitle, marginBottom: "20px" }}>
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
                border: `1px solid ${mt.panelBorder}`,
                background: "rgba(255,255,255,0.04)",
                color: mt.title,
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
                <div style={{ fontSize: "0.75rem", fontWeight: 400, color: mt.muted, marginTop: "2px" }}>{desc}</div>
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
            border: `1px solid ${mt.panelBorder}`,
            background: "transparent",
            color: mt.subtitle,
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
        gap: "4px",
        padding: compact ? "3px 8px" : "4px 10px",
        borderRadius: "6px",
        border: "1px solid rgba(255,255,255,0.1)",
        background: "rgba(255,255,255,0.04)",
        color: "var(--text-muted)",
        fontSize: compact ? "0.62rem" : "0.68rem",
        fontWeight: 600,
        fontFamily: "inherit",
        cursor: "pointer",
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        transition: "all 0.15s",
      }}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
      Export
    </button>
  );
}
