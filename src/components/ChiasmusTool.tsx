"use client";

import { useState, useEffect, useMemo } from "react";
import { VOLUME_COLORS } from "@/lib/constants";
import { usePreferencesContext } from "@/components/PreferencesProvider";
import { useIsMobile } from "@/lib/useIsMobile";

interface ChiasmLevel {
  label: string;
  text: string;
  verses: string;
  matchLabel: string;
  matchText: string;
  matchVerses: string;
}

interface ChiasmEntry {
  id: string;
  title: string;
  reference: string;
  book: string;
  chapter: number;
  startVerse: number;
  endVerse: number;
  volume: string;
  category: "known" | "potential" | "accidental";
  description: string;
  discoveredBy: string;
  source: string;
  levels: ChiasmLevel[];
  centerLabel: string;
  centerText: string;
  centerVerses: string;
}

const CATEGORY_META: Record<string, { label: string; description: string; color: string }> = {
  known: {
    label: "Verified Chiasms",
    description: "Widely recognized by scholars as intentional literary structures. These have been validated through peer review, statistical analysis, or academic consensus.",
    color: "#10b981",
  },
  potential: {
    label: "Probable Chiasms",
    description: "Structures that scholars believe may be intentional but are not as universally accepted. Worthy of study and further analysis.",
    color: "#f59e0b",
  },
  accidental: {
    label: "Possible / Incidental",
    description: "Patterns that could be coincidental. While structurally present, these may not reflect deliberate authorial intent.",
    color: "#6b7280",
  },
};

const VOLUME_ORDER = ["OT", "NT", "BoM", "D&C", "PoGP"];

export default function ChiasmusTool() {
  const { isVolumeVisible } = usePreferencesContext();
  const isMobile = useIsMobile();
  const [catalog, setCatalog] = useState<ChiasmEntry[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [volumeFilter, setVolumeFilter] = useState<string | null>(null);

  useEffect(() => {
    fetch("/data/chiasmus-catalog.json")
      .then((r) => r.json())
      .then((data: ChiasmEntry[]) => setCatalog(data))
      .catch(() => {});
  }, []);

  const filteredCatalog = useMemo(() => {
    let items = catalog.filter((c) => isVolumeVisible(c.volume));
    if (volumeFilter) items = items.filter((c) => c.volume === volumeFilter);
    return items;
  }, [catalog, volumeFilter, isVolumeVisible]);

  const grouped = useMemo(() => {
    const groups: Record<string, ChiasmEntry[]> = { known: [], potential: [], accidental: [] };
    filteredCatalog.forEach((c) => groups[c.category]?.push(c));
    return groups;
  }, [filteredCatalog]);

  const activeVolumes = useMemo(() => {
    const vols = new Set(catalog.filter((c) => isVolumeVisible(c.volume)).map((c) => c.volume));
    return VOLUME_ORDER.filter((v) => vols.has(v));
  }, [catalog, isVolumeVisible]);

  const selectedChiasm = catalog.find((c) => c.id === selectedId);

  return (
    <div>
      {/* Header area */}
      <div className="search-panel" style={{ marginBottom: "24px", textAlign: "center" }}>
        <h1 style={{ fontSize: isMobile ? "1.4rem" : "1.8rem", fontWeight: 800, color: "var(--text)", marginBottom: "8px", lineHeight: 1.2, letterSpacing: "0.02em" }}>
          Chiasmus in Scripture
        </h1>
        <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "16px", lineHeight: 1.5 }}>
          Chiasmus is an ancient literary structure where ideas mirror each other in an A–B–C…C&prime;–B&prime;–A&prime; pattern around a central pivot.
          Browse {catalog.length} documented chiastic structures across the scriptures.
        </p>

        {/* Volume filter pills */}
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          <button
            onClick={() => setVolumeFilter(null)}
            style={{
              padding: "5px 14px",
              borderRadius: "16px",
              border: `1px solid ${!volumeFilter ? "rgba(255,255,255,0.3)" : "var(--border)"}`,
              background: !volumeFilter ? "rgba(255,255,255,0.08)" : "transparent",
              color: !volumeFilter ? "var(--text)" : "var(--text-muted)",
              fontSize: "0.78rem",
              fontWeight: !volumeFilter ? 600 : 400,
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "all 0.15s",
            }}
          >
            All ({filteredCatalog.length})
          </button>
          {activeVolumes.map((vol) => {
            const count = catalog.filter((c) => c.volume === vol && isVolumeVisible(c.volume)).length;
            const active = volumeFilter === vol;
            const color = VOLUME_COLORS[vol] || "#888";
            return (
              <button
                key={vol}
                onClick={() => setVolumeFilter(active ? null : vol)}
                style={{
                  padding: "5px 14px",
                  borderRadius: "16px",
                  border: `1px solid ${active ? color : "var(--border)"}`,
                  background: active ? `${color}20` : "transparent",
                  color: active ? color : "var(--text-muted)",
                  fontSize: "0.78rem",
                  fontWeight: active ? 600 : 400,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  transition: "all 0.15s",
                }}
              >
                {vol} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Category sections */}
      {(["known", "potential", "accidental"] as const).map((cat) => {
        const items = grouped[cat];
        if (items.length === 0) return null;
        const meta = CATEGORY_META[cat];

        return (
          <div key={cat} style={{ marginBottom: "32px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
              <div
                style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  background: meta.color,
                  flexShrink: 0,
                }}
              />
              <h2 style={{ fontSize: isMobile ? "1rem" : "1.15rem", fontWeight: 700, color: "var(--text)", margin: 0 }}>
                {meta.label}
              </h2>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>({items.length})</span>
            </div>
            <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "14px", lineHeight: 1.4 }}>
              {meta.description}
            </p>

            {/* Cards grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(280px, 1fr))",
                gap: "10px",
              }}
            >
              {items.map((chiasm) => {
                const volColor = VOLUME_COLORS[chiasm.volume] || "#888";
                const isSelected = selectedId === chiasm.id;

                return (
                  <button
                    key={chiasm.id}
                    onClick={() => setSelectedId(isSelected ? null : chiasm.id)}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px",
                      padding: "14px 16px",
                      borderRadius: "12px",
                      border: `1px solid ${isSelected ? volColor : "var(--border)"}`,
                      background: isSelected ? `${volColor}10` : "var(--surface)",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      textAlign: "left",
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)";
                        e.currentTarget.style.transform = "translateY(-1px)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = "var(--border)";
                        e.currentTarget.style.transform = "translateY(0)";
                      }
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span
                        style={{
                          fontSize: "0.65rem",
                          fontWeight: 600,
                          padding: "2px 8px",
                          borderRadius: "4px",
                          background: `${volColor}20`,
                          color: volColor,
                        }}
                      >
                        {chiasm.volume}
                      </span>
                      <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                        {chiasm.reference}
                      </span>
                    </div>
                    <div style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--text)" }}>
                      {chiasm.title}
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", lineHeight: 1.4 }}>
                      {chiasm.levels.length} mirrored levels
                      {chiasm.discoveredBy && ` · ${chiasm.discoveredBy.split(" (")[0]}`}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Detail panel — slides in when a card is selected */}
      {selectedChiasm && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setSelectedId(null)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0, 0, 0, 0.5)",
              backdropFilter: "blur(4px)",
              WebkitBackdropFilter: "blur(4px)",
              zIndex: 200,
              animation: "fadeIn 0.2s ease",
            }}
          />

          {/* Panel */}
          <div
            style={{
              position: "fixed",
              top: 0,
              right: 0,
              width: isMobile ? "100vw" : "min(600px, 85vw)",
              height: "100vh",
              background: "var(--bg)",
              borderLeft: "1px solid var(--border)",
              zIndex: 201,
              overflowY: "auto",
              animation: "slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
              padding: isMobile ? "20px 16px" : "28px 28px",
            }}
          >
            {/* Close button */}
            <button
              onClick={() => setSelectedId(null)}
              style={{
                position: "sticky",
                top: 0,
                float: "right",
                background: "rgba(255,255,255,0.06)",
                border: "none",
                borderRadius: "50%",
                width: "36px",
                height: "36px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "#fff",
                fontSize: "0.9rem",
                fontFamily: "inherit",
                zIndex: 3,
              }}
            >
              ✕
            </button>

            {/* Header */}
            <div style={{ marginBottom: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                <span
                  style={{
                    fontSize: "0.7rem",
                    fontWeight: 600,
                    padding: "2px 10px",
                    borderRadius: "4px",
                    background: `${VOLUME_COLORS[selectedChiasm.volume] || "#888"}20`,
                    color: VOLUME_COLORS[selectedChiasm.volume] || "#888",
                  }}
                >
                  {selectedChiasm.volume}
                </span>
                <span
                  style={{
                    fontSize: "0.65rem",
                    fontWeight: 600,
                    padding: "2px 8px",
                    borderRadius: "4px",
                    background: `${CATEGORY_META[selectedChiasm.category].color}20`,
                    color: CATEGORY_META[selectedChiasm.category].color,
                  }}
                >
                  {CATEGORY_META[selectedChiasm.category].label}
                </span>
              </div>
              <h2 style={{ fontSize: isMobile ? "1.2rem" : "1.4rem", fontWeight: 700, color: "var(--text)", marginBottom: "4px" }}>
                {selectedChiasm.title}
              </h2>
              <div style={{ fontSize: "0.85rem", color: VOLUME_COLORS[selectedChiasm.volume] || "var(--text-secondary)", fontWeight: 600, marginBottom: "10px" }}>
                {selectedChiasm.reference}
              </div>
              <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: "8px" }}>
                {selectedChiasm.description}
              </p>
              {selectedChiasm.discoveredBy && (
                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                  Identified by {selectedChiasm.discoveredBy}
                </div>
              )}
            </div>

            {/* Chiastic structure visualization */}
            <div style={{ marginBottom: "24px" }}>
              <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text)", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Structure
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                {selectedChiasm.levels.map((level, i) => {
                  const totalLevels = selectedChiasm.levels.length;
                  const indent = i * (isMobile ? 12 : 20);
                  const volColor = VOLUME_COLORS[selectedChiasm.volume] || "#8b5cf6";
                  const isCenter = i === totalLevels - 1 && !level.matchLabel;

                  return (
                    <div key={i}>
                      {/* Forward element (A, B, C...) */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: "8px",
                          marginLeft: `${indent}px`,
                          padding: "6px 12px",
                          borderRadius: "6px",
                          background: isCenter ? `${volColor}15` : "rgba(255,255,255,0.03)",
                          border: isCenter ? `1px solid ${volColor}30` : "1px solid transparent",
                          marginBottom: "2px",
                        }}
                      >
                        <span style={{ fontSize: "0.78rem", fontWeight: 700, color: volColor, minWidth: "24px", flexShrink: 0 }}>
                          {level.label}
                        </span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                            {level.text}
                          </div>
                          <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", marginTop: "2px" }}>
                            {level.verses}
                          </div>
                        </div>
                        {isCenter && (
                          <span style={{ fontSize: "0.55rem", fontWeight: 700, color: volColor, textTransform: "uppercase", letterSpacing: "0.1em", flexShrink: 0, marginTop: "2px" }}>
                            center
                          </span>
                        )}
                      </div>

                      {/* Mirror element (A', B', C'...) — only if it exists */}
                      {level.matchLabel && (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: "8px",
                            marginLeft: `${indent}px`,
                            padding: "6px 12px",
                            borderRadius: "6px",
                            background: "rgba(255,255,255,0.03)",
                            border: "1px solid transparent",
                            marginBottom: "2px",
                            opacity: 0.75,
                          }}
                        >
                          <span style={{ fontSize: "0.78rem", fontWeight: 700, color: volColor, minWidth: "24px", flexShrink: 0 }}>
                            {level.matchLabel}
                          </span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                              {level.matchText}
                            </div>
                            <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", marginTop: "2px" }}>
                              {level.matchVerses}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Source citation */}
            {selectedChiasm.source && (
              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", borderTop: "1px solid var(--border)", paddingTop: "14px", lineHeight: 1.5 }}>
                <strong style={{ color: "var(--text-secondary)" }}>Sources:</strong> {selectedChiasm.source}
              </div>
            )}
          </div>
        </>
      )}

      {/* CSS animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
