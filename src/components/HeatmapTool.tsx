"use client";

import { useState, useEffect, useRef, createRef } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Filler,
  Tooltip,
  Legend,
} from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";
import { Line } from "react-chartjs-2";
import type { Volume, ScripturePanelState } from "@/lib/types";
import { VOLUME_COLORS, getContrastText, compactVolumeName } from "@/lib/constants";
import ScripturePanel from "./ScripturePanel";
import { ExportButton } from "./ExportChartModal";
import ChartHints from "./ChartHints";
import ExportChartModal from "./ExportChartModal";
import ExportHtmlModal from "./ExportHtmlModal";
import FilterDropdown from "./FilterDropdown";
import { chartScrollbarPlugin } from "@/lib/chart-scrollbar-plugin";
import { usePreferencesContext } from "@/components/PreferencesProvider";
import { useIsMobile } from "@/lib/useIsMobile";

ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, Filler, Tooltip, Legend, ChartDataLabels);

// Plugin to add space below legend
const legendMarginPlugin = {
  id: "legendMarginHeatmap",
  beforeInit(chart: any) {
    const origFit = chart.legend.fit;
    chart.legend.fit = function fit() {
      origFit.call(this);
      this.height += 20;
    };
  },
};

interface HeatmapCell {
  bookId: number;
  bookName: string;
  volumeAbbrev: string;
  chapter: number;
  count: number;
}

export default function HeatmapTool() {
  const { isVolumeVisible } = usePreferencesContext();
  const isMobile = useIsMobile();

  // Register zoom plugin client-side only
  const zoomPluginRef = useRef<any>(null);
  const [zoomReady, setZoomReady] = useState(false);
  useEffect(() => {
    import("chartjs-plugin-zoom").then((mod) => {
      ChartJS.register(mod.default);
      zoomPluginRef.current = mod.default;
      setZoomReady(true);
    });
  }, []);

  const [volumes, setVolumes] = useState<Volume[]>([]);
  const [selectedVolumeIds, setSelectedVolumeIds] = useState<Set<number>>(new Set());
  const [word, setWord] = useState("");
  const [caseInsensitive, setCaseInsensitive] = useState(true);
  const [wholeWord, setWholeWord] = useState(true);
  const [results, setResults] = useState<HeatmapCell[]>([]);
  const [maxCount, setMaxCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [hoveredCell, setHoveredCell] = useState<{ cell: HeatmapCell; rect: DOMRect } | null>(null);
  const [scripturePanel, setScripturePanel] = useState<ScripturePanelState | null>(null);
  const [exportAbbrev, setExportAbbrev] = useState<string | null>(null);
  const [exportChartAbbrev, setExportChartAbbrev] = useState<string | null>(null);
  // Per-volume view mode: "heatmap" or "arc"
  const [viewModes, setViewModes] = useState<Map<string, "heatmap" | "arc">>(new Map());
  const chartRefs = useRef<Map<string, React.RefObject<any>>>(new Map());

  const getViewMode = (abbrev: string) => viewModes.get(abbrev) || "heatmap";
  const toggleViewMode = (abbrev: string) => {
    setViewModes(prev => {
      const next = new Map(prev);
      next.set(abbrev, next.get(abbrev) === "arc" ? "heatmap" : "arc");
      return next;
    });
  };
  const inputRef = useRef<HTMLInputElement>(null);
  const initialSearchDone = useRef(false);

  useEffect(() => {
    fetch("/api/books")
      .then((r) => r.json())
      .then((data) => {
        const filtered = data.volumes.filter((v: Volume) => isVolumeVisible(v.abbrev));
        setVolumes(filtered);
        setSelectedVolumeIds(new Set(filtered.map((v: Volume) => v.id)));

        // Deep link
        if (!initialSearchDone.current) {
          const urlParams = new URLSearchParams(window.location.search);
          const urlWord = urlParams.get("word");
          if (urlWord) {
            initialSearchDone.current = true;
            setWord(urlWord);
            if (urlParams.get("ci") === "false") setCaseInsensitive(false);
            if (urlParams.get("em") === "false") setWholeWord(false);
          }
        }
      });
  }, []);

  const toggleVolume = (id: number) => {
    setSelectedVolumeIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { if (next.size > 1) next.delete(id); }
      else { next.add(id); }
      return next;
    });
  };

  const handleSearch = async () => {
    if (!word.trim()) return;
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        word: word.trim(),
        caseInsensitive: String(caseInsensitive),
        wholeWord: String(wholeWord),
      });
      // Always fetch all volumes — toggles filter client-side
      const res = await fetch(`/api/heatmap?${params}`);
      const data = await res.json();
      setResults(data.results);
      setMaxCount(Math.max(...data.results.map((r: HeatmapCell) => r.count), 1));

      // Update URL
      const urlParams = new URLSearchParams();
      urlParams.set("word", word.trim());
      if (!caseInsensitive) urlParams.set("ci", "false");
      if (!wholeWord) urlParams.set("em", "false");
      window.history.replaceState({}, "", `?${urlParams.toString()}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-search from URL
  useEffect(() => {
    if (initialSearchDone.current && word && volumes.length > 0 && results.length === 0) {
      handleSearch();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [word, volumes.length]);

  // Auto-re-search when options change and we already have results
  const prevHeatmapOptions = useRef({ caseInsensitive, wholeWord });
  useEffect(() => {
    if (results.length === 0 || !word.trim()) return;
    if (
      prevHeatmapOptions.current.caseInsensitive !== caseInsensitive ||
      prevHeatmapOptions.current.wholeWord !== wholeWord
    ) {
      prevHeatmapOptions.current = { caseInsensitive, wholeWord };
      handleSearch();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseInsensitive, wholeWord]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") { e.preventDefault(); handleSearch(); }
  };

  // Group results by book
  const bookGroups = results.reduce<Map<number, { bookName: string; volumeAbbrev: string; chapters: HeatmapCell[] }>>(
    (acc, cell) => {
      if (!acc.has(cell.bookId)) {
        acc.set(cell.bookId, { bookName: cell.bookName, volumeAbbrev: cell.volumeAbbrev, chapters: [] });
      }
      acc.get(cell.bookId)!.chapters.push(cell);
      return acc;
    },
    new Map()
  );

  // Get cell color based on count intensity
  const getCellColor = (count: number, volumeAbbrev: string): string => {
    if (count === 0) return "rgba(255,255,255,0.03)";
    const intensity = Math.min(count / maxCount, 1);
    const baseColor = VOLUME_COLORS[volumeAbbrev] || "#3B82F6";
    // Parse hex to rgb
    const hex = baseColor.replace("#", "");
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const alpha = 0.15 + intensity * 0.85;
    return `rgba(${r},${g},${b},${alpha})`;
  };

  return (
    <div>
      {/* Search panel */}
      <div className="search-panel">
        <div style={{ display: "flex", gap: isMobile ? "16px" : "24px", flexDirection: isMobile ? "column" : "row", alignItems: "flex-start" }}>
          {/* LEFT COLUMN */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontSize: isMobile ? "1.2rem" : "1.4rem", fontWeight: 700, color: "var(--text)", marginBottom: "6px", lineHeight: 1.2 }}>
              <img src="/heatmap.svg" alt="" style={{ display: "inline-block", width: isMobile ? "18px" : "22px", height: isMobile ? "18px" : "22px", verticalAlign: "middle", marginRight: "8px", filter: "invert(1) brightness(0.85)" }} />
              Theme Heatmap
            </h1>
            <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "14px", lineHeight: 1.4 }}>
              See how a word is distributed across every chapter. Brighter cells = higher frequency.
            </p>
            {/* Search bar with Go */}
            <div className="search-bar-glow" style={{ display: "flex", background: "var(--zinc-900)", border: "1px solid var(--border-accent)", borderRadius: "12px", overflow: "hidden" }}>
              <div style={{ position: "relative", flex: 1, display: "flex", alignItems: "center" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", left: "16px", pointerEvents: "none" }}>
                  <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
                </svg>
                <input
                  ref={inputRef}
                  type="text"
                  enterKeyHint="search"
                  autoCapitalize="none"
                  autoCorrect="off"
                  value={word}
                  onChange={(e) => setWord(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={isMobile ? "Search..." : "Enter a word or phrase..."}
                  style={{ width: "100%", padding: "12px 16px 12px 46px", background: "transparent", border: "none", color: "var(--text)", fontSize: "0.95rem", fontFamily: "inherit", outline: "none" }}
                />
              </div>
              <button
                onClick={handleSearch}
                disabled={!word.trim() || isLoading}
                style={{
                  padding: "12px 28px",
                  background: !word.trim() || isLoading ? "var(--zinc-800)" : "#3B82F6",
                  color: !word.trim() || isLoading ? "var(--text-muted)" : "#fff",
                  border: "none", borderLeft: "1px solid var(--border)",
                  fontSize: "0.88rem", fontWeight: 600, cursor: !word.trim() || isLoading ? "not-allowed" : "pointer",
                  fontFamily: "inherit", transition: "background 0.2s", whiteSpace: "nowrap",
                }}
              >
                {isLoading ? (isMobile ? "..." : "Searching...") : "Go"}
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", flexShrink: 0, paddingTop: isMobile ? "0" : "36px" }}>
            <FilterDropdown
              label="Volumes"
              activeCount={selectedVolumeIds.size}
              totalCount={volumes.length}
              colorDots={volumes.filter(v => selectedVolumeIds.has(v.id)).map(v => VOLUME_COLORS[v.abbrev])}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {volumes.map((v) => {
                  const isActive = selectedVolumeIds.has(v.id);
                  const color = VOLUME_COLORS[v.abbrev];
                  return (
                    <label key={v.id} style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "0.8rem", fontWeight: isActive ? 600 : 400, color: isActive ? "var(--text)" : "var(--text-secondary)", transition: "color 0.15s", whiteSpace: "nowrap" }}>
                      <span onClick={(e) => { e.preventDefault(); toggleVolume(v.id); }} style={{ width: "14px", height: "14px", borderRadius: "3px", border: isActive ? `2px solid ${color}` : "2px solid rgba(255,255,255,0.2)", background: isActive ? color : "transparent", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s", flexShrink: 0 }}>
                        {isActive && <svg width="8" height="8" viewBox="0 0 10 10" fill="none"><path d="M2 5L4 7L8 3" stroke={getContrastText(color)} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                      </span>
                      {v.name}
                    </label>
                  );
                })}
              </div>
            </FilterDropdown>
            <FilterDropdown
              label="Options"
              activeCount={(caseInsensitive ? 1 : 0) + (wholeWord ? 1 : 0)}
              totalCount={2}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "0.8rem", color: caseInsensitive ? "var(--text)" : "var(--text-secondary)", whiteSpace: "nowrap" }}>
                  <span onClick={(e) => { e.preventDefault(); setCaseInsensitive(!caseInsensitive); }} style={{ width: "14px", height: "14px", borderRadius: "3px", border: caseInsensitive ? "2px solid #3B82F6" : "2px solid rgba(255,255,255,0.2)", background: caseInsensitive ? "#3B82F6" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s", flexShrink: 0 }}>
                    {caseInsensitive && <svg width="8" height="8" viewBox="0 0 10 10" fill="none"><path d="M2 5L4 7L8 3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                  </span>
                  Case-insensitive
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "0.8rem", color: wholeWord ? "var(--text)" : "var(--text-secondary)", whiteSpace: "nowrap" }}>
                  <span onClick={(e) => { e.preventDefault(); setWholeWord(!wholeWord); }} style={{ width: "14px", height: "14px", borderRadius: "3px", border: wholeWord ? "2px solid #3B82F6" : "2px solid rgba(255,255,255,0.2)", background: wholeWord ? "#3B82F6" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s", flexShrink: 0 }}>
                    {wholeWord && <svg width="8" height="8" viewBox="0 0 10 10" fill="none"><path d="M2 5L4 7L8 3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                  </span>
                  Exact match
                </label>
              </div>
            </FilterDropdown>
          </div>
        </div>
      </div>

      {/* Hover tooltip — positioned above the hovered cell */}
      {hoveredCell && hoveredCell.cell.count > 0 && (
        <div style={{
          position: "fixed",
          top: hoveredCell.rect.top - 44,
          left: Math.min(hoveredCell.rect.left + hoveredCell.rect.width / 2, window.innerWidth - 120),
          transform: "translateX(-50%)",
          background: "#1a1a2e", border: "1px solid var(--border)", borderRadius: "8px",
          padding: "6px 12px", zIndex: 100, fontSize: "0.8rem", color: "var(--text)",
          boxShadow: "0 4px 16px rgba(0,0,0,0.5)", whiteSpace: "nowrap",
          pointerEvents: "none",
        }}>
          <strong>{hoveredCell.cell.bookName} {hoveredCell.cell.chapter}</strong>
          <span style={{ color: "var(--text-secondary)", marginLeft: "6px" }}>
            {hoveredCell.cell.count} {hoveredCell.cell.count === 1 ? "occurrence" : "occurrences"}
          </span>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (() => {
        // Filter results by selected volumes
        const selectedAbbrevs = new Set(volumes.filter(v => selectedVolumeIds.has(v.id)).map(v => v.abbrev));
        const filteredResults = results.filter(cell => selectedAbbrevs.has(cell.volumeAbbrev));
        if (filteredResults.length === 0) return null;

        // Group by volume
        const volumeGroups = new Map<string, { volumeName: string; abbrev: string; books: Map<number, { bookName: string; volumeAbbrev: string; chapters: HeatmapCell[] }> }>();
        for (const cell of filteredResults) {
          const vol = volumes.find(v => v.books.some(b => b.id === cell.bookId));
          const volKey = vol?.abbrev || cell.volumeAbbrev;
          const volName = vol?.name || cell.volumeAbbrev;
          if (!volumeGroups.has(volKey)) {
            volumeGroups.set(volKey, { volumeName: volName, abbrev: volKey, books: new Map() });
          }
          const vg = volumeGroups.get(volKey)!;
          if (!vg.books.has(cell.bookId)) {
            vg.books.set(cell.bookId, { bookName: cell.bookName, volumeAbbrev: cell.volumeAbbrev, chapters: [] });
          }
          vg.books.get(cell.bookId)!.chapters.push(cell);
        }

        const volumeOrder = ["OT", "NT", "BoM", "D&C", "PoGP"];
        const sortedVolumes = Array.from(volumeGroups.entries()).sort(
          (a, b) => volumeOrder.indexOf(a[0]) - volumeOrder.indexOf(b[0])
        );

        const renderBookRow = (bookId: number, group: { bookName: string; volumeAbbrev: string; chapters: HeatmapCell[] }) => {
          const volColor = VOLUME_COLORS[group.volumeAbbrev] || "#3B82F6";
          const bookTotal = group.chapters.reduce((s, c) => s + c.count, 0);

          return (
            <div key={bookId} style={{ marginBottom: "4px", display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{
                width: isMobile ? "60px" : "140px", flexShrink: 0,
                fontSize: isMobile ? "0.65rem" : "0.75rem",
                fontWeight: bookTotal > 0 ? 600 : 400,
                color: bookTotal > 0 ? "var(--text)" : "var(--text-muted)",
                textAlign: "right", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {group.bookName}
              </div>
              <div style={{ display: "flex", gap: "1px", flex: 1, flexWrap: "nowrap", overflow: "hidden" }}>
                {group.chapters.map((cell) => (
                  <div
                    key={cell.chapter}
                    onMouseEnter={(e) => {
                      if (cell.count > 0) {
                        setHoveredCell({ cell, rect: e.currentTarget.getBoundingClientRect() });
                      }
                    }}
                    onMouseLeave={() => setHoveredCell(null)}
                    onClick={() => {
                      if (cell.count > 0 && word) {
                        setScripturePanel({
                          word: word.trim(),
                          bookId: cell.bookId,
                          bookName: cell.bookName,
                          chapter: cell.chapter,
                          caseInsensitive,
                          wholeWord,
                          volumeColor: VOLUME_COLORS[cell.volumeAbbrev],
                        });
                      }
                    }}
                    style={{
                      flex: "1 1 0", minWidth: isMobile ? "2px" : "4px", maxWidth: isMobile ? "8px" : "14px",
                      height: isMobile ? "14px" : "20px", borderRadius: "2px",
                      background: getCellColor(cell.count, cell.volumeAbbrev),
                      cursor: cell.count > 0 ? "pointer" : "default",
                      transition: "transform 0.1s",
                    }}
                  />
                ))}
              </div>
              <div style={{
                width: "36px", flexShrink: 0, fontSize: "0.7rem", fontWeight: 700,
                fontVariantNumeric: "tabular-nums", color: bookTotal > 0 ? volColor : "var(--text-muted)", textAlign: "right",
              }}>
                {bookTotal > 0 ? bookTotal : ""}
              </div>
            </div>
          );
        };

        const renderColorScale = (abbrev: string) => {
          const baseColor = VOLUME_COLORS[abbrev] || "#3B82F6";
          const hex = baseColor.replace("#", "");
          const r = parseInt(hex.substring(0, 2), 16);
          const g = parseInt(hex.substring(2, 4), 16);
          const b = parseInt(hex.substring(4, 6), 16);
          return (
            <div style={{ marginTop: "6px", marginBottom: "6px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", fontSize: "0.72rem", color: "var(--text-muted)" }}>
              <span>Less</span>
              <div style={{ display: "flex", gap: "2px" }}>
                {[0, 0.2, 0.4, 0.6, 0.8, 1].map((intensity) => (
                  <div key={intensity} style={{
                    width: "14px", height: "14px", borderRadius: "3px",
                    background: intensity === 0 ? "rgba(255,255,255,0.03)" : `rgba(${r},${g},${b},${0.15 + intensity * 0.85})`,
                  }} />
                ))}
              </div>
              <span>More</span>
            </div>
          );
        };

        return (
          <div style={{ marginTop: "20px" }}>
            {/* Total stats */}
            <div style={{ marginBottom: "12px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              <strong style={{ color: "var(--text)" }}>&quot;{word}&quot;</strong> found in{" "}
              <strong style={{ color: "var(--text)" }}>{results.filter(r => r.count > 0).length.toLocaleString()}</strong> of{" "}
              <strong style={{ color: "var(--text)" }}>{results.length.toLocaleString()}</strong> chapters
            </div>

            {/* Jump-to navigation */}
            {sortedVolumes.length > 1 && (
              <div style={{ position: "sticky", top: 0, zIndex: 50, paddingTop: "8px", paddingBottom: "8px", display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", marginBottom: "8px" }}>
                <span style={{ fontSize: "0.68rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--text-muted)", marginRight: "4px" }}>Jump to</span>
                {sortedVolumes.map(([abbrev, vg]) => {
                  const volColor = VOLUME_COLORS[abbrev];
                  return (
                    <button key={abbrev} type="button"
                      onClick={() => { const el = document.getElementById(`heatmap-${abbrev}`); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); }}
                      style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "5px 12px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.06)", color: "var(--text-secondary)", fontSize: "0.78rem", fontWeight: 500, fontFamily: "inherit", cursor: "pointer", transition: "all 0.15s" }}>
                      <span style={{ width: "8px", height: "8px", borderRadius: "2px", background: volColor, flexShrink: 0 }} />
                      {compactVolumeName(vg.volumeName, isMobile)}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Volume modules */}
            {sortedVolumes.map(([abbrev, vg]) => {
              const volColor = VOLUME_COLORS[abbrev];
              const volTotal = Array.from(vg.books.values()).reduce((s, b) => s + b.chapters.reduce((s2, c) => s2 + c.count, 0), 0);

              return (
                <div key={abbrev} id={`heatmap-${abbrev}`} style={{
                  background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "10px",
                  padding: isMobile ? "16px" : "24px", marginBottom: "16px",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" }}>
                    <div>
                      <h3 style={{ fontSize: "1.05rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text)", margin: 0 }}>
                        <span style={{ color: volColor }}>{vg.volumeName}</span>
                      </h3>
                      <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", margin: "4px 0 0" }}>
                        {volTotal > 0
                          ? <>There {volTotal === 1 ? "is" : "are"} <strong style={{ color: "var(--text)" }}>{volTotal.toLocaleString()}</strong> {volTotal === 1 ? "reference" : "references"} to &quot;{word}&quot; in the {vg.volumeName}</>
                          : <>No references to &quot;{word}&quot; found in the {vg.volumeName}</>
                        }
                      </p>
                      <ChartHints isMobile={isMobile} showZoom={getViewMode(abbrev) === "arc"} />
                    </div>
                    <div style={{ display: "flex", gap: "6px", alignItems: "center", flexShrink: 0 }}>
                      <ExportButton compact={isMobile} onClick={() => {
                        if (getViewMode(abbrev) === "arc") setExportChartAbbrev(abbrev);
                        else setExportAbbrev(abbrev);
                      }} />
                    </div>
                  </div>

                  {/* View toggle */}
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "8px", marginBottom: "12px", flexWrap: "wrap" }}>
                    <button type="button" onClick={() => { if (getViewMode(abbrev) !== "heatmap") toggleViewMode(abbrev); }}
                      title="Heatmap view"
                      style={{
                        display: "inline-flex", alignItems: "center", gap: "5px",
                        padding: isMobile ? "6px 10px" : "6px 14px", borderRadius: "8px",
                        border: "none",
                        background: getViewMode(abbrev) === "heatmap" ? "rgba(255,255,255,0.12)" : "transparent",
                        color: getViewMode(abbrev) === "heatmap" ? "var(--text)" : "var(--text-muted)",
                        fontSize: "0.78rem", fontWeight: getViewMode(abbrev) === "heatmap" ? 600 : 400,
                        fontFamily: "inherit", cursor: "pointer", transition: "all 0.15s",
                      }}>
                      <img src="/heatmap.svg" alt="" style={{ width: "14px", height: "14px", filter: getViewMode(abbrev) === "heatmap" ? "invert(1) brightness(1)" : "invert(1) brightness(0.5)" }} />
                      {!isMobile && "Heatmap"}
                    </button>
                    <button type="button" onClick={() => { if (getViewMode(abbrev) !== "arc") toggleViewMode(abbrev); }}
                      title="Narrative arc view"
                      style={{
                        display: "inline-flex", alignItems: "center", gap: "5px",
                        padding: isMobile ? "6px 10px" : "6px 14px", borderRadius: "8px",
                        border: "none",
                        background: getViewMode(abbrev) === "arc" ? "rgba(255,255,255,0.12)" : "transparent",
                        color: getViewMode(abbrev) === "arc" ? "var(--text)" : "var(--text-muted)",
                        fontSize: "0.78rem", fontWeight: getViewMode(abbrev) === "arc" ? 600 : 400,
                        fontFamily: "inherit", cursor: "pointer", transition: "all 0.15s",
                      }}>
                      <img src="/narrative-arc.svg" alt="" style={{ width: "14px", height: "14px", filter: getViewMode(abbrev) === "arc" ? "invert(1) brightness(1)" : "invert(1) brightness(0.5)" }} />
                      {!isMobile && "Narrative Arc"}
                    </button>
                    {word && !isMobile && (
                      <a
                        href={`/narrative-arc?terms=${encodeURIComponent(word.trim())}`}
                        style={{
                          marginLeft: "6px", fontSize: "0.75rem", fontWeight: 500,
                          color: "var(--accent)", textDecoration: "underline",
                          textUnderlineOffset: "3px", opacity: 0.85, transition: "opacity 0.15s",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.opacity = "0.85"; }}
                      >
                        Compare multiple keywords →
                      </a>
                    )}
                  </div>

                  {/* Heatmap view */}
                  <div style={{
                    opacity: getViewMode(abbrev) === "heatmap" ? 1 : 0,
                    maxHeight: getViewMode(abbrev) === "heatmap" ? "2000px" : "0px",
                    overflow: "hidden",
                    transition: "opacity 0.3s ease, max-height 0.3s ease",
                  }}>
                    {renderColorScale(abbrev)}
                    <div style={{ marginTop: "12px" }}>
                      {Array.from(vg.books.entries()).map(([bookId, group]) => renderBookRow(bookId, group))}
                    </div>
                  </div>

                  {/* Arc view */}
                  {(() => {
                    const isArc = getViewMode(abbrev) === "arc";
                    if (!chartRefs.current.has(abbrev)) chartRefs.current.set(abbrev, createRef());
                    const thisChartRef = chartRefs.current.get(abbrev)!;
                    const books = Array.from(vg.books.values());
                    const labels = books.flatMap(b => b.chapters.map(c => b.bookName === "D&C" ? `Sec ${c.chapter}` : (books.length === 1 ? `${c.chapter}` : b.bookName)));
                    const data = books.flatMap(b => b.chapters.map(c => c.count));
                    const isSingleBook = books.length === 1;

                    // For multi-book volumes, aggregate by book instead of chapter
                    const arcLabels = isSingleBook
                      ? books[0].chapters.map(c => `Section ${c.chapter}`)
                      : books.map(b => b.bookName);
                    const arcData = isSingleBook
                      ? books[0].chapters.map(c => c.count)
                      : books.map(b => b.chapters.reduce((s, c) => s + c.count, 0));

                    return (
                      <div style={{
                        opacity: isArc ? 1 : 0,
                        maxHeight: isArc ? "600px" : "0px",
                        overflow: "hidden",
                        transition: "opacity 0.3s ease, max-height 0.3s ease",
                      }}>
                      <div style={isMobile ? { overflowX: "auto", WebkitOverflowScrolling: "touch" } : {}}>
                      <div style={{ position: "relative", height: isMobile ? "350px" : "480px", ...(isMobile ? { width: `${Math.max(600, arcLabels.length * 28)}px`, minWidth: "100%" } : {}) }} onDoubleClick={() => thisChartRef.current?.resetZoom()}>
                        <Line
                          key={`${abbrev}-${zoomReady}`}
                          ref={thisChartRef}
                          plugins={[legendMarginPlugin, ...(zoomPluginRef.current ? [zoomPluginRef.current] : []), chartScrollbarPlugin]}
                          data={{
                            labels: arcLabels,
                            datasets: [{
                              label: word,
                              data: arcData,
                              fill: true,
                              backgroundColor: `${volColor}18`,
                              borderColor: volColor,
                              borderWidth: isSingleBook ? 2 : 2.5,
                              pointBackgroundColor: volColor,
                              pointBorderColor: volColor,
                              pointBorderWidth: 1,
                              pointRadius: isSingleBook ? 2 : 4,
                              pointHoverRadius: isSingleBook ? 5 : 7,
                              pointHitRadius: isMobile ? 20 : 10,
                              tension: 0.35,
                            }],
                          }}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            ...({ clip: { left: true, right: true, bottom: true, top: false } } as Record<string, unknown>),
                            onHover: (event, elements) => {
                              const canvas = event.native?.target as HTMLCanvasElement | undefined;
                              if (canvas) canvas.style.cursor = elements.length > 0 ? "pointer" : "default";
                            },
                            onClick: (_event, elements) => {
                              if (elements.length === 0 || !word) return;
                              const el = elements[0];
                              const dataIndex = el.index;
                              if (isSingleBook) {
                                const chapter = books[0].chapters[dataIndex];
                                if (chapter && chapter.count > 0) {
                                  const bookEntry = Array.from(vg.books.entries())[0];
                                  setScripturePanel({
                                    word: word.trim(),
                                    bookId: bookEntry[0],
                                    bookName: bookEntry[1].bookName,
                                    chapter: chapter.chapter,
                                    caseInsensitive,
                                    wholeWord,
                                    volumeColor: volColor,
                                  });
                                }
                              } else {
                                const bookArr = Array.from(vg.books.entries());
                                const bookEntry = bookArr[dataIndex];
                                if (bookEntry && arcData[dataIndex] > 0) {
                                  setScripturePanel({
                                    word: word.trim(),
                                    bookId: bookEntry[0],
                                    bookName: bookEntry[1].bookName,
                                    caseInsensitive,
                                    wholeWord,
                                    volumeColor: volColor,
                                  });
                                }
                              }
                            },
                            interaction: { mode: "index", intersect: false },
                            plugins: {
                              legend: {
                                position: "top",
                                labels: {
                                  padding: 20, usePointStyle: true, pointStyle: "rectRounded", pointStyleWidth: 16,
                                  font: { size: 13, weight: 600, family: "'Inter', sans-serif" }, color: "#e0e0e0", boxHeight: 8,
                                },
                              },
                              tooltip: {
                                callbacks: { label: (ctx) => ` ${ctx.raw} occurrences` },
                              },
                              datalabels: {
                                display: (ctx) => (ctx.dataset.data as number[])[ctx.dataIndex] > 0,
                                anchor: "end", align: "top", offset: 4,
                                color: "#fafafa", font: { weight: 700, size: 10 },
                                formatter: (value: number) => value.toLocaleString(),
                              },
                              zoom: (isMobile
                                ? { zoom: { wheel: { enabled: false }, pinch: { enabled: true, threshold: 10 }, drag: { enabled: false }, mode: "x" }, pan: { enabled: true, mode: "x", threshold: 10 }, limits: { x: { minRange: 8 } } }
                                : {
                                  zoom: { wheel: { enabled: true, speed: 0.05, modifierKey: "alt" }, pinch: { enabled: true, threshold: 10 }, drag: { enabled: false }, mode: "x" },
                                  pan: { enabled: true, mode: "x", threshold: 10 },
                                  limits: { x: { minRange: 3 } },
                                }) as any,
                            },
                            layout: { padding: { top: 20, bottom: 20 } },
                            scales: {
                              y: { grid: { color: "rgba(255,255,255,0.06)" }, ticks: { font: { weight: 600 } }, beginAtZero: true },
                              x: {
                                grid: { display: false },
                                ticks: {
                                  maxRotation: isSingleBook ? 0 : (isMobile ? 90 : 45),
                                  font: { size: isSingleBook ? 9 : (isMobile ? 9 : 11), weight: 500 },
                                  // Use `val` (category index) not `index` (visible tick position) — index shifts when zoomed
                                  callback: isSingleBook
                                    ? function(this: any, val: any) {
                                        const num = (val as number) + 1;
                                        const scale = this as any;
                                        const visibleRange = (scale.max || 0) - (scale.min || 0) + 1;
                                        const step = visibleRange > 80 ? 10 : visibleRange > 30 ? 5 : 1;
                                        if (num === 1 || num % step === 0) return `Sec ${num}`;
                                        return null;
                                      }
                                    : function(this: any, val: any) {
                                        return arcLabels[val as number] || "";
                                      },
                                  autoSkip: !isSingleBook,
                                },
                              },
                            },
                          }}
                        />
                      </div>
                      </div>
                      {isMobile && (
                        <p style={{ textAlign: "center", fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "6px", opacity: 0.6 }}>
                          Swipe to explore →
                        </p>
                      )}
                      </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* Empty state */}
      {results.length === 0 && !isLoading && (
        <div style={{ textAlign: "center", padding: "80px 20px", color: "var(--text-muted)" }}>
          <div style={{ fontSize: "1.1rem", fontWeight: 500 }}>
            Search for a word to see its heatmap
          </div>
          <div style={{ fontSize: "0.88rem", marginTop: "8px", color: "var(--text-muted)" }}>
            Try &quot;faith&quot;, &quot;covenant&quot;, or &quot;repent&quot;
          </div>
        </div>
      )}
      {/* Export modal — heatmap (HTML capture) */}
      {exportAbbrev !== null && (
        <ExportHtmlModal
          isOpen={true}
          onClose={() => setExportAbbrev(null)}
          elementId={`heatmap-${exportAbbrev}`}
          title={volumes.find(v => v.abbrev === exportAbbrev)?.name || exportAbbrev}
        />
      )}

      {/* Export modal — arc (Chart.js capture) */}
      {exportChartAbbrev !== null && (
        <ExportChartModal
          isOpen={true}
          onClose={() => setExportChartAbbrev(null)}
          chartRef={chartRefs.current.get(exportChartAbbrev) || { current: null }}
          title={volumes.find(v => v.abbrev === exportChartAbbrev)?.name || exportChartAbbrev}
        />
      )}

      {/* Scripture panel */}
      {scripturePanel && (
        <ScripturePanel
          {...scripturePanel}
          onClose={() => setScripturePanel(null)}
        />
      )}
    </div>
  );
}
