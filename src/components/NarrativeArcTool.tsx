"use client";

import { useState, useEffect, useRef, useCallback, createRef } from "react";
import ExportChartModal, { ExportButton } from "./ExportChartModal";
import ChartHints from "./ChartHints";
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
import FilterDropdown from "./FilterDropdown";
import { chartScrollbarPlugin } from "@/lib/chart-scrollbar-plugin";
import { usePreferencesContext } from "@/components/PreferencesProvider";
import { useIsMobile } from "@/lib/useIsMobile";
import { analytics } from "@/lib/analytics";
ChartJS.register(
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Filler,
  Tooltip,
  Legend,
  ChartDataLabels
);

ChartJS.defaults.plugins.datalabels = { display: false } as never;
ChartJS.defaults.font.family = "'Inter', -apple-system, BlinkMacSystemFont, sans-serif";

// Plugin to add space below the legend (Chart.js doesn't support this natively)
const legendMarginPlugin = {
  id: "legendMargin",
  beforeInit(chart: any) {
    const origFit = chart.legend.fit;
    chart.legend.fit = function fit() {
      origFit.call(this);
      this.height += 28; // extra pixels below legend
    };
  },
};

const TERM_COLORS = [
  "#f59e0b", // amber
  "#3b82f6", // blue
  "#10b981", // emerald
  "#f43f5e", // rose
  "#06b6d4", // cyan
  "#a78bfa", // light violet
];

interface TermDataPoint {
  label: string;
  count: number;
  bookId: number;
  chapter?: number; // for single-book volumes (D&C sections)
}

interface TermResult {
  term: string;
  color: string;
  // data per volume: volumeId → book OR chapter data
  volumeData: Map<number, TermDataPoint[]>;
}

export default function NarrativeArcTool() {
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
  const [terms, setTerms] = useState<string[]>([]);
  const [currentTerm, setCurrentTerm] = useState("");
  const [caseInsensitive, setCaseInsensitive] = useState(true);
  const [wholeWord, setWholeWord] = useState(true);
  const [results, setResults] = useState<TermResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Export state
  const [exportVolumeId, setExportVolumeId] = useState<number | null>(null);
  // Scripture panel state
  const [scripturePanel, setScripturePanel] = useState<ScripturePanelState | null>(null);
  const chartRefs = useRef<Map<number, React.RefObject<any>>>(new Map());
  const initialSearchDone = useRef(false);

  // Load volumes on mount + check URL for deep link
  useEffect(() => {
    fetch("/api/books")
      .then((r) => r.json())
      .then((data) => {
        const filtered = data.volumes.filter((v: Volume) => isVolumeVisible(v.abbrev));
        setVolumes(filtered);
        setSelectedVolumeIds(new Set(filtered.map((v: Volume) => v.id)));

        // Deep link: read URL params
        if (!initialSearchDone.current) {
          const urlParams = new URLSearchParams(window.location.search);
          const urlTerms = urlParams.get("terms");
          if (urlTerms) {
            initialSearchDone.current = true;
            setTerms(urlTerms.split(",").slice(0, 6));
            if (urlParams.get("ci") === "false") setCaseInsensitive(false);
            if (urlParams.get("em") === "false") setWholeWord(false);
          }
        }
      });
  }, []);

  const toggleVolume = (id: number) => {
    setSelectedVolumeIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size > 1) next.delete(id); // keep at least one
      } else {
        next.add(id);
      }
      return next;
    });
    // Don't clear results — let toggles filter display reactively
  };

  const addTerm = () => {
    const t = currentTerm.trim();
    if (!t || terms.includes(t) || terms.length >= 6) return;
    setTerms([...terms, t]);
    setCurrentTerm("");
    inputRef.current?.focus();
  };

  const removeTerm = (term: string) => {
    setTerms(terms.filter((t) => t !== term));
    setResults(results.filter((r) => r.term !== term));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTerm();
    }
  };

  const selectedVolumes = volumes.filter((v) => selectedVolumeIds.has(v.id));

  const handleAnalyze = useCallback(async () => {
    if (terms.length === 0 || selectedVolumes.length === 0) return;
    analytics.search(terms.join(","), "narrative-arc");
    setIsLoading(true);
    try {
      const newResults: TermResult[] = [];

      for (let i = 0; i < terms.length; i++) {
        const term = terms[i];
        const volumeData = new Map<number, TermDataPoint[]>();

        for (const vol of selectedVolumes) {
          const isSingleBook = vol.books.length === 1;

          if (isSingleBook) {
            // Single-book volume (e.g., D&C) — plot by chapter/section
            const book = vol.books[0];
            const params = new URLSearchParams({
              word: term,
              bookId: String(book.id),
              chapterCount: String(book.chapterCount),
              caseInsensitive: String(caseInsensitive),
              wholeWord: String(wholeWord),
            });
            const res = await fetch(`/api/word-frequency-by-chapter?${params}`);
            const data = await res.json();

            const chapterData = (data.results as { chapter: number; count: number }[]).map((r) => ({
              label: `Section ${r.chapter}`,
              count: r.count,
              bookId: book.id,
              chapter: r.chapter,
            }));
            volumeData.set(vol.id, chapterData);
          } else {
            // Multi-book volume — plot by book (normal)
            const params = new URLSearchParams({
              word: term,
              caseInsensitive: String(caseInsensitive),
              wholeWord: String(wholeWord),
              volumeIds: String(vol.id),
            });
            const res = await fetch(`/api/word-frequency?${params}`);
            const data = await res.json();

            const bookData = vol.books.map((b) => {
              const result = data.results.find(
                (r: { bookId: number }) => r.bookId === b.id
              );
              return { label: b.name, count: result?.count || 0, bookId: b.id };
            });
            volumeData.set(vol.id, bookData);
          }
        }

        newResults.push({
          term,
          color: TERM_COLORS[i % TERM_COLORS.length],
          volumeData,
        });
      }

      setResults(newResults);

      // Update URL for deep linking
      const urlParams = new URLSearchParams();
      urlParams.set("terms", terms.join(","));
      if (!caseInsensitive) urlParams.set("ci", "false");
      if (!wholeWord) urlParams.set("em", "false");
      window.history.replaceState({}, "", `?${urlParams.toString()}`);
    } finally {
      setIsLoading(false);
    }
  }, [terms, selectedVolumes, caseInsensitive, wholeWord]);

  // Auto-search if terms came from URL
  useEffect(() => {
    if (initialSearchDone.current && terms.length > 0 && volumes.length > 0 && results.length === 0) {
      handleAnalyze();
    }
  }, [terms, volumes.length, handleAnalyze, results.length]);

  // Auto-fetch data for newly toggled-on volumes that don't have data yet
  useEffect(() => {
    if (results.length === 0 || terms.length === 0) return;
    const missingVolumes = volumes.filter(
      (v) => selectedVolumeIds.has(v.id) && results.length > 0 && !results[0].volumeData.has(v.id)
    );
    if (missingVolumes.length === 0) return;

    (async () => {
      const updatedResults = [...results];
      for (const vol of missingVolumes) {
        for (let i = 0; i < updatedResults.length; i++) {
          const term = updatedResults[i].term;
          const isSingleBook = vol.books.length === 1;

          if (isSingleBook) {
            const book = vol.books[0];
            const params = new URLSearchParams({
              word: term,
              bookId: String(book.id),
              chapterCount: String(book.chapterCount),
              caseInsensitive: String(caseInsensitive),
              wholeWord: String(wholeWord),
            });
            try {
              const res = await fetch(`/api/word-frequency-by-chapter?${params}`);
              const data = await res.json();
              const chapterDataArr = (data.results as { chapter: number; count: number }[]).map((r) => ({
                label: `Section ${r.chapter}`,
                count: r.count,
                bookId: book.id,
                chapter: r.chapter,
              }));
              updatedResults[i] = {
                ...updatedResults[i],
                volumeData: new Map([...updatedResults[i].volumeData, [vol.id, chapterDataArr]]),
              };
            } catch {}
          } else {
            const params = new URLSearchParams({
              word: term,
              caseInsensitive: String(caseInsensitive),
              wholeWord: String(wholeWord),
              volumeIds: String(vol.id),
            });
            try {
              const res = await fetch(`/api/word-frequency?${params}`);
              const data = await res.json();
              const bookData = vol.books.map((b) => {
                const result = data.results.find((r: { bookId: number }) => r.bookId === b.id);
                return { label: b.name, count: result?.count || 0, bookId: b.id };
              });
              updatedResults[i] = {
                ...updatedResults[i],
                volumeData: new Map([...updatedResults[i].volumeData, [vol.id, bookData]]),
              };
            } catch {}
          }
        }
      }
      setResults(updatedResults);
    })();
  }, [selectedVolumeIds]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-re-search when options change and we already have results
  const prevNarrOptions = useRef({ caseInsensitive, wholeWord });
  useEffect(() => {
    if (results.length === 0 || terms.length === 0) return;
    if (
      prevNarrOptions.current.caseInsensitive !== caseInsensitive ||
      prevNarrOptions.current.wholeWord !== wholeWord
    ) {
      prevNarrOptions.current = { caseInsensitive, wholeWord };
      handleAnalyze();
    }
  }, [caseInsensitive, wholeWord]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      {/* Search panel — two-column layout */}
      <div className="search-panel" style={{ display: "flex", gap: isMobile ? "16px" : "24px", flexDirection: isMobile ? "column" : "row", alignItems: "flex-start" }}>
        {/* LEFT column: title, description, search bar, term chips */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontSize: isMobile ? "1.2rem" : "1.4rem", fontWeight: 700, color: "var(--text)", marginBottom: "6px", lineHeight: 1.2 }}>
            Narrative Arc Explorer
          </h1>
          <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "14px", lineHeight: 1.4 }}>
            Compare up to 6 terms across volumes to see how themes flow through scripture.
          </p>

          {/* Search input + Add + Go */}
          <div
            className="search-bar-glow"
            style={{
              display: "flex",
              background: "var(--zinc-900)",
              border: "1px solid var(--border-accent)",
              borderRadius: "12px",
              overflow: "hidden",
              marginBottom: "12px",
            }}
          >
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
                value={currentTerm}
                onChange={(e) => setCurrentTerm(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={terms.length >= 6 ? "Maximum 6 terms" : isMobile ? "Add term..." : "Add a search term..."}
                disabled={terms.length >= 6}
                style={{ width: "100%", padding: "12px 16px 12px 46px", background: "transparent", border: "none", color: "var(--text)", fontSize: "0.95rem", fontFamily: "inherit", outline: "none" }}
              />
            </div>
            <button
              onClick={addTerm}
              disabled={!currentTerm.trim() || terms.length >= 6}
              style={{
                padding: "12px 20px",
                background: !currentTerm.trim() || terms.length >= 6 ? "var(--zinc-800)" : "rgba(59,130,246,0.15)",
                color: !currentTerm.trim() || terms.length >= 6 ? "var(--text-muted)" : "#60A5FA",
                border: "none", borderLeft: "1px solid var(--border)",
                fontSize: "0.88rem", fontWeight: 600, cursor: !currentTerm.trim() || terms.length >= 6 ? "not-allowed" : "pointer",
                fontFamily: "inherit", transition: "background 0.2s", whiteSpace: "nowrap",
              }}
            >
              + Add
            </button>
            <button
              onClick={handleAnalyze}
              disabled={terms.length === 0 || isLoading}
              style={{
                padding: "12px 28px",
                background: terms.length === 0 || isLoading ? "var(--zinc-800)" : "#3B82F6",
                color: terms.length === 0 || isLoading ? "var(--text-muted)" : "#fff",
                border: "none", borderLeft: "1px solid var(--border)",
                fontSize: "0.88rem", fontWeight: 600, cursor: terms.length === 0 || isLoading ? "not-allowed" : "pointer",
                fontFamily: "inherit", transition: "background 0.2s", whiteSpace: "nowrap",
              }}
            >
              {isLoading ? (isMobile ? "..." : "Searching...") : "Go"}
            </button>
          </div>

          {/* Term chips */}
          {terms.length > 0 && (
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {terms.map((term, i) => (
                <span key={term} style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "5px 12px", borderRadius: "8px", background: TERM_COLORS[i % TERM_COLORS.length], color: "#fff", fontSize: "0.82rem", fontWeight: 600 }}>
                  {term}
                  <button type="button" onClick={() => removeTerm(term)} style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: "50%", width: "18px", height: "18px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff", fontSize: "0.7rem", fontWeight: 700, lineHeight: 1, padding: 0 }}>✕</button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT column: FilterDropdown for Volumes and Options */}
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

      {/* Jump-to volume navigation — sticky on scroll */}
      {results.length > 0 && selectedVolumes.length > 1 && (
        <div style={{ position: "sticky", top: 0, zIndex: 50, background: "var(--bg)", paddingTop: "12px", paddingBottom: "12px", marginTop: "8px", display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "0.68rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--text-muted)", marginRight: "4px" }}>Jump to</span>
          {selectedVolumes.map((v) => {
            const volColor = VOLUME_COLORS[v.abbrev];
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => {
                  const el = document.getElementById(`arc-vol-${v.id}`);
                  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                style={{
                  display: "inline-flex", alignItems: "center", gap: "5px",
                  padding: "5px 12px", borderRadius: "8px",
                  border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.06)",
                  color: "var(--text-secondary)", fontSize: "0.78rem", fontWeight: 500,
                  fontFamily: "inherit", cursor: "pointer", transition: "all 0.15s",
                }}
              >
                <span style={{ width: "8px", height: "8px", borderRadius: "2px", background: volColor, flexShrink: 0 }} />
                {compactVolumeName(v.name, isMobile)}
              </button>
            );
          })}
        </div>
      )}

      {/* Charts — one per selected volume */}
      {results.length > 0 &&
        selectedVolumes.map((vol) => {
          const volResults = results.filter((r) => r.volumeData.has(vol.id));
          if (volResults.length === 0) return null;
          const color = VOLUME_COLORS[vol.abbrev];

          // Get or create chart ref for this volume
          if (!chartRefs.current.has(vol.id)) {
            chartRefs.current.set(vol.id, createRef());
          }
          const thisChartRef = chartRefs.current.get(vol.id)!;

          return (
            <div
              key={vol.id}
              id={`arc-vol-${vol.id}`}
              style={{
                background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "10px",
                padding: "28px",
                marginTop: "20px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <h3
                    style={{
                      fontSize: "1.05rem",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      color: "var(--text)",
                      marginBottom: "4px",
                    }}
                  >
                    <span style={{ color }}>{vol.name}</span>
                  </h3>
                  <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "0" }}>
                    {vol.books.length === 1
                      ? `Word frequency by section across ${vol.name}`
                      : "Word frequency by book in narrative order"}
                  </p>
                  <ChartHints isMobile={isMobile} />
                </div>
                <div style={{ display: "flex", gap: "6px", alignItems: "center", flexShrink: 0 }}>
                  <ExportButton compact={isMobile} onClick={() => setExportVolumeId(vol.id)} />
                </div>
              </div>

              {(() => {
                const isSingleBook = vol.books.length === 1;
                const firstTermData = volResults[0]?.volumeData.get(vol.id) || [];
                const allLabels = firstTermData.map((d) => d.label);

                return (
              <>
              <div style={isMobile ? { overflowX: "auto", WebkitOverflowScrolling: "touch", marginTop: "8px" } : { marginTop: "8px" }}>
              <div style={{ position: "relative", height: isMobile ? "350px" : "540px", ...(isMobile ? { width: `${Math.max(600, allLabels.length * 28)}px`, minWidth: "100%" } : {}) }} onDoubleClick={() => thisChartRef.current?.resetZoom()}>
                <Line
                  key={`${vol.id}-${zoomReady}`}
                  ref={thisChartRef}
                  plugins={[legendMarginPlugin, ...(zoomPluginRef.current ? [zoomPluginRef.current] : []), chartScrollbarPlugin]}
                  data={{
                    labels: allLabels,
                    datasets: volResults.map((r) => {
                      const data = r.volumeData.get(vol.id) || [];
                      // Single term → use volume color; multiple terms → use term color for distinction
                      const lineColor = volResults.length === 1 ? color : r.color;
                      return {
                        label: r.term,
                        data: data.map((d) => d.count),
                        fill: true,
                        backgroundColor: `${lineColor}14`,
                        borderColor: lineColor,
                        borderWidth: isSingleBook ? 2 : 2.5,
                        pointBackgroundColor: lineColor,
                        pointBorderColor: lineColor,
                        pointBorderWidth: 1,
                        pointRadius: isSingleBook ? 2 : 4,
                        pointHoverRadius: isSingleBook ? 5 : 7,
                        pointHitRadius: isMobile ? 20 : 10,
                        tension: 0.35,
                      };
                    }),
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    ...({ clip: { left: true, right: true, bottom: true, top: false } } as Record<string, unknown>),
                    onHover: (event, elements) => {
                      const canvas = event.native?.target as HTMLCanvasElement | undefined;
                      if (canvas) canvas.style.cursor = elements.length > 0 ? "pointer" : "default";
                    },
                    onClick: (_event, elements, chart) => {
                      if (elements.length === 0) return;
                      // elements contains all datasets at this x-index (mode: "index").
                      // Find the one whose rendered y-position is closest to the click.
                      const clickY = (_event as any).y as number;
                      let closestEl = elements[0];
                      let minDist = Infinity;
                      for (const el of elements) {
                        const meta = chart.getDatasetMeta(el.datasetIndex);
                        const point = meta.data[el.index];
                        if (point) {
                          const dist = Math.abs(point.y - clickY);
                          if (dist < minDist) {
                            minDist = dist;
                            closestEl = el;
                          }
                        }
                      }
                      const el = closestEl;
                      const dataIndex = el.index;
                      const datasetIndex = el.datasetIndex;
                      const termResult = volResults[datasetIndex];
                      if (!termResult) return;
                      const dataPoints = termResult.volumeData.get(vol.id);
                      if (!dataPoints || !dataPoints[dataIndex]) return;
                      const point = dataPoints[dataIndex];
                      if (point.count === 0) return;
                      setScripturePanel({
                        word: termResult.term,
                        bookId: point.bookId,
                        bookName: point.chapter != null ? vol.books[0]?.name || point.label : point.label,
                        chapter: point.chapter,
                        caseInsensitive,
                        wholeWord,
                        volumeColor: VOLUME_COLORS[vol.abbrev],
                      });
                    },
                    interaction: {
                      mode: "index",
                      intersect: false,
                    },
                    plugins: {
                      legend: {
                        position: "top",
                        align: "center",
                        labels: {
                          padding: 20,
                          usePointStyle: true,
                          pointStyle: "rectRounded",
                          pointStyleWidth: 16,
                          font: { size: 13, weight: 600, family: "'Inter', sans-serif" },
                          color: "#e0e0e0",
                          boxHeight: 8,
                        },
                      },
                      tooltip: {
                        callbacks: {
                          title: (items) => {
                            const label = items[0]?.label || "";
                            return label;
                          },
                          label: (ctx) =>
                            ` ${ctx.dataset.label}: ${ctx.raw} occurrences`,
                        },
                      },
                      datalabels: {
                        display: (ctx) => (ctx.dataset.data as number[])[ctx.dataIndex] > 0,
                        anchor: "end",
                        align: "top",
                        offset: 4,
                        color: "#fafafa",
                        font: { weight: 700, size: 10 },
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
                      y: {
                        grid: { color: "rgba(255,255,255,0.06)" },
                        ticks: { font: { weight: 600 } },
                        beginAtZero: true,
                      },
                      x: {
                        grid: { display: false },
                        ticks: {
                          maxRotation: isSingleBook ? 0 : (isMobile ? 90 : 45),
                          font: { size: isSingleBook ? 9 : (isMobile ? 9 : 11), weight: 500 },
                          // For single-book volumes with many sections, show sparse labels
                          // Use `val` (category index) not `index` (visible tick position) — index shifts when zoomed
                          callback: isSingleBook
                            ? function(this: any, val: any) {
                                const sectionNum = (val as number) + 1;
                                // When zoomed in, show more labels; when zoomed out, show every 10th
                                const scale = this as any;
                                const visibleRange = (scale.max || 0) - (scale.min || 0) + 1;
                                const step = visibleRange > 80 ? 10 : visibleRange > 30 ? 5 : 1;
                                if (sectionNum === 1 || sectionNum % step === 0) return `Sec ${sectionNum}`;
                                return null;
                              }
                            : function(this: any, val: any) {
                                return allLabels[val as number] || "";
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
              </>);
              })()}

              {/* Summary table for this volume */}
              <div style={{ marginTop: "24px", overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: "0.85rem",
                    minWidth: "300px",
                  }}
                >
                  <thead>
                    <tr>
                      {["Term", "Total", "Most Frequent In"].map((heading, idx) => (
                        <th
                          key={heading}
                          style={{
                            textAlign: idx === 1 ? "right" : "left",
                            padding: "8px 12px",
                            fontSize: "0.85rem",
                            textTransform: "uppercase",
                            letterSpacing: "0.1em",
                            color: "var(--text)",
                            fontWeight: 700,
                            borderBottom: "1px solid var(--border)",
                          }}
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {volResults.map((r) => {
                      const data = r.volumeData.get(vol.id) || [];
                      const total = data.reduce((s, d) => s + d.count, 0);
                      const peak = data.reduce(
                        (best, d) => (d.count > best.count ? d : best),
                        data[0]
                      );
                      return (
                        <tr key={r.term}>
                          <td
                            style={{
                              padding: "8px 12px",
                              borderBottom: "1px solid rgba(255,255,255,0.06)",
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                            }}
                          >
                            <span
                              style={{
                                width: "10px",
                                height: "3px",
                                borderRadius: "2px",
                                background: r.color,
                                flexShrink: 0,
                              }}
                            />
                            <span style={{ fontWeight: 600, color: "var(--text)" }}>
                              {r.term}
                            </span>
                          </td>
                          <td
                            style={{
                              padding: "8px 12px",
                              textAlign: "right",
                              fontWeight: 700,
                              fontVariantNumeric: "tabular-nums",
                              color: "var(--text)",
                              borderBottom: "1px solid rgba(255,255,255,0.06)",
                            }}
                          >
                            {total.toLocaleString()}
                          </td>
                          <td
                            style={{
                              padding: "8px 12px",
                              color: "rgba(255,255,255,0.75)",
                              borderBottom: "1px solid rgba(255,255,255,0.06)",
                            }}
                          >
                            {peak && peak.count > 0
                              ? `${peak.label} (${peak.count})`
                              : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}

      {/* Empty state with preset buttons */}
      {results.length === 0 && !isLoading && (
        <div
          style={{
            textAlign: "center",
            padding: "60px 20px",
            color: "var(--text-muted)",
          }}
        >
          <div style={{ fontSize: "1rem", fontWeight: 500, marginBottom: "20px" }}>
            Try one of these comparisons to get started
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", justifyContent: "center", maxWidth: "600px", margin: "0 auto" }}>
            {[
              { label: "Faith vs. Works", terms: ["faith", "works"] },
              { label: "Grace & Mercy", terms: ["grace", "mercy", "forgiveness"] },
              { label: "Love & Charity", terms: ["love", "charity", "compassion"] },
              { label: "War & Peace", terms: ["war", "peace", "battle"] },
              { label: "Sin & Repentance", terms: ["sin", "repentance", "forgive"] },
              { label: "Covenant & Promise", terms: ["covenant", "promise", "oath"] },
            ].map((preset) => (
              <button
                key={preset.label}
                onClick={() => {
                  setTerms(preset.terms);
                  initialSearchDone.current = true;
                }}
                style={{
                  padding: "8px 18px",
                  borderRadius: "20px",
                  border: "1px solid rgba(255,255,255,0.15)",
                  background: "rgba(255,255,255,0.04)",
                  color: "var(--text-secondary)",
                  fontSize: "0.85rem",
                  fontWeight: 500,
                  cursor: "pointer",
                  transition: "all 0.2s",
                  fontFamily: "inherit",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(59,130,246,0.15)";
                  e.currentTarget.style.borderColor = "rgba(59,130,246,0.4)";
                  e.currentTarget.style.color = "#60A5FA";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
                  e.currentTarget.style.color = "var(--text-secondary)";
                }}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Export modal */}
      {exportVolumeId !== null && (
        <ExportChartModal
          isOpen={true}
          onClose={() => { analytics.exportChart("narrative-arc", "chart"); setExportVolumeId(null); }}
          chartRef={chartRefs.current.get(exportVolumeId) || { current: null }}
          title={volumes.find((v) => v.id === exportVolumeId)?.name || "chart"}
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
