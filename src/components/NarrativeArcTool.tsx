"use client";

import { useState, useEffect, useRef, useCallback, createRef } from "react";
import ExportChartModal, { ExportButton } from "./ExportChartModal";
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
import ChartZoomControls from "./ChartZoomControls";

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

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < breakpoint);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [breakpoint]);
  return isMobile;
}

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
  const isMobile = useIsMobile();

  // Register zoom plugin client-side only
  useEffect(() => {
    import("chartjs-plugin-zoom").then((mod) => {
      ChartJS.register(mod.default);
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
        setVolumes(data.volumes);
        setSelectedVolumeIds(new Set(data.volumes.map((v: Volume) => v.id)));

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
    setResults([]);
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

  return (
    <div>
      {/* Tool header */}
      <div style={{ marginBottom: "24px" }}>
        <h2
          style={{
            fontSize: "1.4rem",
            fontWeight: 700,
            color: "var(--text)",
            marginBottom: "6px",
          }}
        >
          Narrative Arc Explorer
        </h2>
        <p style={{ color: "var(--text-secondary)", fontSize: isMobile ? "0.85rem" : "0.92rem" }}>
          Compare up to 6 search terms across multiple volumes to see how themes
          flow through the scriptures in narrative order.
        </p>
      </div>

      {/* Search panel */}
      <div className="search-panel">
        {/* Search input + Add + Go */}
        <div
          className="search-bar-glow"
          style={{
            display: "flex",
            background: "var(--zinc-900)",
            border: "1px solid var(--border-accent)",
            borderRadius: "14px",
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
              value={currentTerm}
              onChange={(e) => setCurrentTerm(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={terms.length >= 6 ? "Maximum 6 terms" : isMobile ? "Add term..." : "Add a search term..."}
              disabled={terms.length >= 6}
              style={{ width: "100%", padding: "14px 16px 14px 46px", background: "transparent", border: "none", color: "var(--text)", fontSize: "0.95rem", fontFamily: "inherit", outline: "none" }}
            />
          </div>
          <button
            onClick={addTerm}
            disabled={!currentTerm.trim() || terms.length >= 6}
            style={{
              padding: "14px 20px",
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
              padding: "14px 28px",
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
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "12px" }}>
            {terms.map((term, i) => (
              <span key={term} style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "5px 12px", borderRadius: "8px", background: TERM_COLORS[i % TERM_COLORS.length], color: "#fff", fontSize: "0.82rem", fontWeight: 600 }}>
                {term}
                <button type="button" onClick={() => removeTerm(term)} style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: "50%", width: "18px", height: "18px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff", fontSize: "0.7rem", fontWeight: 700, lineHeight: 1, padding: 0 }}>✕</button>
              </span>
            ))}
          </div>
        )}

        {/* Volumes + Options */}
        <div style={{ display: "flex", alignItems: isMobile ? "flex-start" : "center", gap: isMobile ? "10px" : "16px", flexWrap: "wrap", flexDirection: isMobile ? "column" : "row" }}>
          <span style={{ fontSize: "0.68rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--text-muted)" }}>Volumes</span>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            {volumes.map((v) => {
              const isActive = selectedVolumeIds.has(v.id);
              const color = VOLUME_COLORS[v.abbrev];
              return (
                <label key={v.id} style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "0.8rem", fontWeight: isActive ? 600 : 400, color: isActive ? "var(--text)" : "var(--text-secondary)", transition: "color 0.15s", whiteSpace: "nowrap" }}>
                  <span onClick={(e) => { e.preventDefault(); toggleVolume(v.id); }} style={{ width: "14px", height: "14px", borderRadius: "3px", border: isActive ? `2px solid ${color}` : "2px solid rgba(255,255,255,0.2)", background: isActive ? color : "transparent", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s", flexShrink: 0 }}>
                    {isActive && <svg width="8" height="8" viewBox="0 0 10 10" fill="none"><path d="M2 5L4 7L8 3" stroke={getContrastText(color)} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                  </span>
                  {compactVolumeName(v.name, isMobile)}
                </label>
              );
            })}
          </div>

          <span style={{ width: "1px", height: "16px", background: "rgba(255,255,255,0.1)" }} />

          <div style={{ display: "flex", gap: "10px" }}>
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
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "10px",
                padding: "28px",
                marginTop: "20px",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
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
                    {" — "}
                    <span style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>click any point to read verses</span>
                  </p>
                </div>
                <ExportButton onClick={() => setExportVolumeId(vol.id)} />
              </div>

              {(() => {
                const isSingleBook = vol.books.length === 1;
                const firstTermData = volResults[0]?.volumeData.get(vol.id) || [];
                const allLabels = firstTermData.map((d) => d.label);

                return (
              <>
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px", marginBottom: "4px" }}>
                <ChartZoomControls chartRef={thisChartRef} color={color} isMobile={isMobile} />
              </div>
              <div style={{ position: "relative", height: isMobile ? "350px" : "540px", overflow: "hidden" }}>
                <Line
                  ref={thisChartRef}
                  plugins={[legendMarginPlugin]}
                  data={{
                    labels: allLabels,
                    datasets: volResults.map((r) => {
                      const data = r.volumeData.get(vol.id) || [];
                      return {
                        label: r.term,
                        data: data.map((d) => d.count),
                        fill: true,
                        backgroundColor: `${r.color}12`,
                        borderColor: r.color,
                        borderWidth: isSingleBook ? 2 : 2.5,
                        pointBackgroundColor: r.color,
                        pointBorderColor: r.color,
                        pointBorderWidth: 1,
                        pointRadius: isSingleBook ? 2 : 4,
                        pointHoverRadius: isSingleBook ? 5 : 7,
                        tension: 0.35,
                      };
                    }),
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    ...({ clip: false } as Record<string, unknown>),
                    onHover: (event, elements) => {
                      const canvas = event.native?.target as HTMLCanvasElement | undefined;
                      if (canvas) canvas.style.cursor = elements.length > 0 ? "pointer" : "default";
                    },
                    onClick: (_event, elements) => {
                      if (elements.length === 0) return;
                      const el = elements[0];
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
                      zoom: {
                        zoom: { wheel: { enabled: false }, pinch: { enabled: false }, drag: { enabled: false } },
                        pan: { enabled: true, mode: "x" as const },
                        limits: { x: { minRange: 3 } },
                      },
                    },
                    layout: { padding: { top: 20 } },
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
                          // For single-book volumes with many sections, show every 10th label
                          callback: isSingleBook
                            ? function(this: any, _val: any, index: number) {
                                const sectionNum = index + 1;
                                if (sectionNum === 1 || sectionNum % 10 === 0) return sectionNum.toString();
                                return "";
                              }
                            : undefined,
                          autoSkip: false,
                        },
                      },
                    },
                  }}
                />
              </div>
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
                      {["Term", "Total", "Peak Book"].map((heading, idx) => (
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

      {/* Empty state */}
      {results.length === 0 && !isLoading && (
        <div
          style={{
            textAlign: "center",
            padding: "80px 20px",
            color: "var(--text-muted)",
          }}
        >
          <div style={{ marginBottom: "16px" }}><img src="/narrative-arc.svg" alt="" style={{ width: "48px", height: "48px", filter: "invert(1) brightness(0.4)" }} /></div>
          <div style={{ fontSize: "1.1rem", fontWeight: 500 }}>
            Add search terms and click Go
          </div>
          <div
            style={{
              fontSize: "0.88rem",
              marginTop: "8px",
              color: "var(--text-muted)",
            }}
          >
            Try comparing &quot;faith&quot;, &quot;repentance&quot;, and
            &quot;grace&quot; across all volumes
          </div>
        </div>
      )}

      {/* Export modal */}
      {exportVolumeId !== null && (
        <ExportChartModal
          isOpen={true}
          onClose={() => setExportVolumeId(null)}
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
