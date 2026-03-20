"use client";

import { useState } from "react";
import { modalStyles as mStyles, getModalTheme } from "@/lib/modal-styles";

type ExportFormat = "png" | "jpg" | "pdf";

export default function ExportHtmlModal({
  isOpen,
  onClose,
  elementId,
  title,
}: {
  isOpen: boolean;
  onClose: () => void;
  elementId: string;
  title: string;
}) {
  const [exporting, setExporting] = useState(false);
  // Export modals are always on the dark site theme
  const mt = getModalTheme(false);

  if (!isOpen) return null;

  const handleExport = async (format: ExportFormat) => {
    const element = document.getElementById(elementId);
    if (!element) return;

    setExporting(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(element, {
        backgroundColor: "#0f0f12",
        scale: 2,
        logging: false,
      });

      const fileName = `${title.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()}-heatmap`;

      if (format === "png") {
        const url = canvas.toDataURL("image/png");
        downloadFile(url, `${fileName}.png`);
      } else if (format === "jpg") {
        const url = canvas.toDataURL("image/jpeg", 0.95);
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
      <div onClick={onClose} style={mStyles.backdropHigh} />
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
        <h3 style={{ ...mStyles.title, color: mt.title }}>Export Heatmap</h3>
        <p style={{ ...mStyles.body, color: mt.subtitle, marginBottom: "20px" }}>Choose a format to download</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {([
            { format: "png" as ExportFormat, label: "PNG", desc: "Best for presentations" },
            { format: "jpg" as ExportFormat, label: "JPG", desc: "Smaller file size" },
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
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
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
