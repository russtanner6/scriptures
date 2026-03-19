"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
// Zoom plugin loaded client-side only (see useEffect below)
import { Line } from "react-chartjs-2";
import type { Volume, WordFrequencyResponse } from "@/lib/types";
import { VOLUME_COLORS, getContrastText, compactVolumeName } from "@/lib/constants";
import StatCard from "./StatCard";
import DashboardCard from "./DashboardCard";
import HorizontalBarList from "./HorizontalBarList";
import ChartZoomControls from "./ChartZoomControls";
import type { BarItem } from "./HorizontalBarList";
import DataTable from "./DataTable";
import ScripturePanel from "./ScripturePanel";
import type { ScripturePanelState } from "@/lib/types";

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
// Zoom plugin registered client-side in useEffect

// Chart.js global defaults for dark theme
ChartJS.defaults.color = "#9ca3af";
// Disable datalabels by default — enable per-chart
ChartJS.defaults.plugins.datalabels = { display: false } as never;
ChartJS.defaults.font.family = "'Inter', sans-serif";
ChartJS.defaults.font.size = 13;
ChartJS.defaults.font.weight = 500;

// Hook to detect mobile viewport
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

export default function WordFrequencyTool() {
  const [volumes, setVolumes] = useState<Volume[]>([]);
  const [selectedVolumeIds, setSelectedVolumeIds] = useState<Set<number>>(
    new Set()
  );
  const [word, setWord] = useState("");
  const [caseInsensitive, setCaseInsensitive] = useState(true);
  const [wholeWord, setWholeWord] = useState(true);
  const [results, setResults] = useState<WordFrequencyResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [volumesExpanded, setVolumesExpanded] = useState(false);
  const [optionsExpanded, setOptionsExpanded] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingSearch = useRef(false);
  const isMobile = useIsMobile();

  // Register zoom plugin client-side only (avoids SSR window error)
  useEffect(() => {
    import("chartjs-plugin-zoom").then((mod) => {
      ChartJS.register(mod.default);
    });
  }, []);

  // Chart visibility toggles — all on by default
  const [arcVolumeTab, setArcVolumeTab] = useState<number | null>(null);
  const [breakdownTab, setBreakdownTab] = useState<number | null>(null);
  const [scripturePanel, setScripturePanel] = useState<ScripturePanelState | null>(null);
  const arcChartRef = useRef<any>(null);
  // Chapter-level data for single-book volumes (e.g., D&C) — keyed by volume id
  const [chapterData, setChapterData] = useState<Map<number, { label: string; count: number; bookId: number; chapter: number }[]>>(new Map());
  const [visiblePanels, setVisiblePanels] = useState<Set<string>>(
    new Set(["breakdowns", "top10", "arc", "table"])
  );
  const togglePanel = (key: string) => {
    setVisiblePanels((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const initialSearchDone = useRef(false);

  // Load volumes on mount + check URL for deep link
  useEffect(() => {
    fetch("/api/books")
      .then((r) => r.json())
      .then((data) => {
        setVolumes(data.volumes);
        setSelectedVolumeIds(
          new Set(data.volumes.map((v: Volume) => v.id))
        );

        // Check URL params for deep link
        if (!initialSearchDone.current) {
          const urlParams = new URLSearchParams(window.location.search);
          const urlWord = urlParams.get("word");
          if (urlWord) {
            initialSearchDone.current = true;
            setWord(urlWord);
            if (urlParams.get("ci") === "false") setCaseInsensitive(false);
            if (urlParams.get("ww") === "false") setWholeWord(false);
          }
        }
      });
  }, []);

  const handleSearch = useCallback(async () => {
    if (!word.trim()) return;
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        word: word.trim(),
        caseInsensitive: String(caseInsensitive),
        wholeWord: String(wholeWord),
      });
      if (selectedVolumeIds.size < volumes.length) {
        params.set(
          "volumeIds",
          Array.from(selectedVolumeIds).join(",")
        );
      }
      const res = await fetch(`/api/word-frequency?${params}`);
      const data = await res.json();
      setResults(data);

      // Update URL for deep linking (without page reload)
      const urlParams = new URLSearchParams();
      urlParams.set("word", word.trim());
      if (!caseInsensitive) urlParams.set("ci", "false");
      if (!wholeWord) urlParams.set("ww", "false");
      window.history.replaceState({}, "", `?${urlParams.toString()}`);

      // Save to recent searches (for landing page)
      try {
        const recent = JSON.parse(localStorage.getItem("recent-searches") || "[]");
        const filtered = recent.filter((s: string) => s !== word.trim());
        filtered.unshift(word.trim());
        localStorage.setItem("recent-searches", JSON.stringify(filtered.slice(0, 10)));
      } catch {}

    } finally {
      setIsLoading(false);
    }
  }, [word, caseInsensitive, wholeWord, selectedVolumeIds, volumes.length]);

  // Auto-search if word was set from URL params
  useEffect(() => {
    if (initialSearchDone.current && word && volumes.length > 0 && !results) {
      handleSearch();
    }
  }, [word, volumes.length, handleSearch, results]);

  // Fetch chapter-level data for single-book volumes (e.g., D&C) when results change
  useEffect(() => {
    if (!results) { setChapterData(new Map()); return; }
    const singleBookVols = volumes.filter(
      (v) => v.books.length === 1 && selectedVolumeIds.has(v.id)
    );
    if (singleBookVols.length === 0) { setChapterData(new Map()); return; }

    Promise.all(
      singleBookVols.map(async (vol) => {
        const book = vol.books[0];
        const params = new URLSearchParams({
          word: results.word,
          bookId: String(book.id),
          chapterCount: String(book.chapterCount),
          caseInsensitive: String(results.caseInsensitive),
          wholeWord: String(results.wholeWord),
        });
        const res = await fetch(`/api/word-frequency-by-chapter?${params}`);
        const data = await res.json();
        const chapters = (data.results as { chapter: number; count: number }[]).map((r) => ({
          label: `Section ${r.chapter}`,
          count: r.count,
          bookId: book.id,
          chapter: r.chapter,
        }));
        return [vol.id, chapters] as const;
      })
    ).then((entries) => {
      setChapterData(new Map(entries));
    });
  }, [results, volumes, selectedVolumeIds]);

  // Auto-search when a matched word pill is clicked
  useEffect(() => {
    if (pendingSearch.current && word) {
      pendingSearch.current = false;
      handleSearch();
    }
  }, [word, handleSearch]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  // Aggregate results by volume
  const volumeAgg = results
    ? volumes
        .map((v) => {
          const bookResults = results.results.filter(
            (r) => r.volumeAbbrev === v.abbrev
          );
          const count = bookResults.reduce((s, r) => s + r.count, 0);
          return { ...v, count };
        })
        .filter((v) => selectedVolumeIds.has(v.id))
    : [];

  const toggleVolume = (id: number) => {
    setSelectedVolumeIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size > 1) next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div>
      {/* Search Controls */}
      <div className="search-panel">
        {/* Search bar with integrated button */}
        <div
          className="search-bar-glow"
          style={{
            display: "flex",
            background: "var(--zinc-900)",
            border: "1px solid var(--border-accent)",
            borderRadius: "14px",
            overflow: "hidden",
            marginBottom: "20px",
          }}
        >
          <div style={{ position: "relative", flex: 1, display: "flex", alignItems: "center" }}>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--text-muted)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ position: "absolute", left: "16px", pointerEvents: "none" }}
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={word}
              onChange={(e) => setWord(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isMobile ? 'Search...' : 'Search a word, phrase, or "exact phrase"...'}
              style={{
                width: "100%",
                padding: "14px 16px 14px 46px",
                background: "transparent",
                border: "none",
                color: "var(--text)",
                fontSize: "0.95rem",
                fontFamily: "inherit",
                outline: "none",
              }}
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={!word.trim() || isLoading}
            style={{
              padding: "14px 20px",
              background:
                !word.trim() || isLoading
                  ? "var(--zinc-800)"
                  : "linear-gradient(135deg, #3b82f6, #60a5fa)",
              color:
                !word.trim() || isLoading
                  ? "var(--text-muted)"
                  : "#fff",
              border: "none",
              borderLeft: "1px solid var(--border)",
              fontSize: "0.88rem",
              fontWeight: 600,
              cursor:
                !word.trim() || isLoading ? "not-allowed" : "pointer",
              fontFamily: "inherit",
              transition: "background 0.2s",
              whiteSpace: "nowrap",
              letterSpacing: "0.02em",
            }}
          >
            {isLoading ? (isMobile ? "..." : "Searching...") : "Go"}
          </button>
        </div>
        {/* Search tips link — below search bar */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px", marginBottom: "-8px" }}>
          <button
            type="button"
            onClick={() => setShowHelp(!showHelp)}
            style={{
              background: "none",
              border: "none",
              color: showHelp ? "#3b82f6" : "var(--text-muted)",
              fontSize: "0.75rem",
              fontWeight: 500,
              fontFamily: "inherit",
              cursor: "pointer",
              textDecoration: "underline",
              textUnderlineOffset: "3px",
              padding: 0,
              transition: "color 0.15s",
            }}
          >
            Search tips
          </button>
        </div>

        {/* Help popup */}
        {showHelp && (
          <div
            style={{
              background: "var(--zinc-900)",
              border: "1px solid var(--border-accent)",
              borderRadius: "12px",
              padding: "20px",
              marginBottom: "16px",
              fontSize: "0.85rem",
              lineHeight: 1.7,
              color: "var(--text-secondary)",
            }}
          >
            <div style={{ fontWeight: 700, color: "var(--text)", marginBottom: "12px", fontSize: "0.9rem" }}>
              Search Tips
            </div>
            <div style={{ display: "grid", gap: "8px" }}>
              <div>
                <code style={{ color: "var(--accent)", background: "var(--accent-soft)", padding: "2px 6px", borderRadius: "4px", fontSize: "0.8rem" }}>Jesus</code>
                {" "}— Search for a single word
              </div>
              <div>
                <code style={{ color: "var(--accent)", background: "var(--accent-soft)", padding: "2px 6px", borderRadius: "4px", fontSize: "0.8rem" }}>{'"come unto me"'}</code>
                {" "}— Wrap in quotes to search an exact phrase
              </div>
              <div>
                <code style={{ color: "var(--accent)", background: "var(--accent-soft)", padding: "2px 6px", borderRadius: "4px", fontSize: "0.8rem" }}>tim</code>
                {" "}+ <span style={{ color: "var(--emerald)" }}>Exact match OFF</span> — Find all words containing &quot;tim&quot; (time, Timothy, etc.)
              </div>
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: "8px", marginTop: "4px" }}>
                <strong style={{ color: "var(--text)" }}>Options:</strong>
              </div>
              <div>
                <span style={{ color: "var(--accent)" }}>Case-insensitive</span> — &quot;jesus&quot; matches &quot;Jesus&quot; and &quot;JESUS&quot;
              </div>
              <div>
                <span style={{ color: "var(--accent)" }}>Exact match</span> — Only matches the exact word, not words containing it. Turn off for partial/substring matching.
              </div>
              <div>
                <span style={{ color: "var(--emerald)" }}>Show toggles</span> — After searching, use the green toggles to show/hide chart sections
              </div>
            </div>
          </div>
        )}

        {/* Volume pills — render helper */}
        {(() => {
          const volumePills = volumes.map((v) => {
            const isActive = selectedVolumeIds.has(v.id);
            const color = VOLUME_COLORS[v.abbrev];
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => toggleVolume(v.id)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "7px",
                  padding: "7px 14px",
                  borderRadius: "8px",
                  border: isActive
                    ? `1px solid ${color}`
                    : "1px solid rgba(255,255,255,0.08)",
                  background: isActive ? color : "rgba(255,255,255,0.06)",
                  color: isActive ? getContrastText(color) : "var(--text-secondary)",
                  fontSize: "0.8rem",
                  fontWeight: isActive ? 600 : 500,
                  fontFamily: "inherit",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  letterSpacing: "0.01em",
                }}
              >
                {compactVolumeName(v.name, isMobile)}
              </button>
            );
          });

          return (
            <>
              {/* Desktop: inline pills */}
              <div
                className="volumes-desktop"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  marginBottom: "16px",
                }}
              >
                <span
                  style={{
                    fontSize: "0.68rem",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.12em",
                    color: "var(--text-muted)",
                    marginRight: "8px",
                    whiteSpace: "nowrap",
                  }}
                >
                  Volumes
                </span>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {volumePills}
                </div>
              </div>

              {/* Mobile: collapsible section */}
              <div
                className="volumes-mobile"
                style={{
                  display: "none",
                  marginBottom: "16px",
                }}
              >
                <button
                  type="button"
                  onClick={() => setVolumesExpanded(!volumesExpanded)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    width: "100%",
                    padding: "10px 14px",
                    background: "var(--zinc-900)",
                    border: "1px solid var(--border-accent)",
                    borderRadius: volumesExpanded ? "10px 10px 0 0" : "10px",
                    color: "var(--text)",
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    fontFamily: "inherit",
                    cursor: "pointer",
                    transition: "border-radius 0.15s",
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span
                      style={{
                        fontSize: "0.68rem",
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.12em",
                        color: "var(--text-muted)",
                      }}
                    >
                      Volumes
                    </span>
                    <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>
                      {selectedVolumeIds.size === volumes.length
                        ? "All selected"
                        : `${selectedVolumeIds.size} of ${volumes.length}`}
                    </span>
                  </span>
                  <span
                    style={{
                      fontSize: "0.7rem",
                      color: "var(--text-muted)",
                      transition: "transform 0.2s",
                      transform: volumesExpanded ? "rotate(180deg)" : "rotate(0deg)",
                    }}
                  >
                    ▼
                  </span>
                </button>
                {volumesExpanded && (
                  <div
                    style={{
                      display: "flex",
                      gap: "8px",
                      flexWrap: "wrap",
                      padding: "12px 14px",
                      background: "var(--zinc-900)",
                      border: "1px solid var(--border-accent)",
                      borderTop: "none",
                      borderRadius: "0 0 10px 10px",
                    }}
                  >
                    {volumePills}
                  </div>
                )}
              </div>
            </>
          );
        })()}

        {/* Options section */}
        {(() => {
          const optionPills = (
            <>
              <button
                type="button"
                onClick={() => setCaseInsensitive(!caseInsensitive)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "5px 12px",
                  borderRadius: "8px",
                  border: caseInsensitive
                    ? "1px solid #3b82f6"
                    : "1px solid var(--border)",
                  background: caseInsensitive
                    ? "#3b82f6"
                    : "transparent",
                  color: caseInsensitive
                    ? "#fff"
                    : "var(--text-muted)",
                  fontSize: "0.78rem",
                  fontWeight: 500,
                  fontFamily: "inherit",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <span style={{ fontSize: "0.7rem" }}>
                  {caseInsensitive ? "✓" : ""}
                </span>
                Case-insensitive
              </button>
              <button
                type="button"
                onClick={() => setWholeWord(!wholeWord)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "5px 12px",
                  borderRadius: "8px",
                  border: wholeWord
                    ? "1px solid #3b82f6"
                    : "1px solid var(--border)",
                  background: wholeWord
                    ? "#3b82f6"
                    : "transparent",
                  color: wholeWord
                    ? "#fff"
                    : "var(--text-muted)",
                  fontSize: "0.78rem",
                  fontWeight: 500,
                  fontFamily: "inherit",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <span style={{ fontSize: "0.7rem" }}>
                  {wholeWord ? "✓" : ""}
                </span>
                Exact match
              </button>
            </>
          );

          return (
            <>
              {/* Desktop: inline */}
              <div
                className="volumes-desktop"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  paddingTop: "12px",
                }}
              >
                <span
                  style={{
                    fontSize: "0.68rem",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.12em",
                    color: "var(--text-muted)",
                    marginRight: "8px",
                  }}
                >
                  Options
                </span>
                {optionPills}
              </div>

              {/* Mobile: collapsible */}
              <div
                className="volumes-mobile"
                style={{
                  display: "none",
                  paddingTop: "12px",
                }}
              >
                <button
                  type="button"
                  onClick={() => setOptionsExpanded(!optionsExpanded)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    width: "100%",
                    padding: "10px 14px",
                    background: "var(--zinc-900)",
                    border: "1px solid var(--border-accent)",
                    borderRadius: optionsExpanded ? "10px 10px 0 0" : "10px",
                    color: "var(--text)",
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    fontFamily: "inherit",
                    cursor: "pointer",
                    transition: "border-radius 0.15s",
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span
                      style={{
                        fontSize: "0.68rem",
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.12em",
                        color: "var(--text-muted)",
                      }}
                    >
                      Options
                    </span>
                    <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>
                      {[caseInsensitive && "Case-insensitive", wholeWord && "Exact match"].filter(Boolean).join(", ") || "None"}
                    </span>
                  </span>
                  <span
                    style={{
                      fontSize: "0.7rem",
                      color: "var(--text-muted)",
                      transition: "transform 0.2s",
                      transform: optionsExpanded ? "rotate(180deg)" : "rotate(0deg)",
                    }}
                  >
                    ▼
                  </span>
                </button>
                {optionsExpanded && (
                  <div
                    style={{
                      display: "flex",
                      gap: "8px",
                      flexWrap: "wrap",
                      padding: "12px 14px",
                      background: "var(--zinc-900)",
                      border: "1px solid var(--border-accent)",
                      borderTop: "none",
                      borderRadius: "0 0 10px 10px",
                    }}
                  >
                    {optionPills}
                  </div>
                )}
              </div>
            </>
          );
        })()}
      </div>

      {/* Results */}
      {results && (
        <>
          {/* Stat cards row */}
          <div
            className="stat-grid"
            style={{
              gridTemplateColumns: `repeat(${Math.min(volumeAgg.length, 5)}, 1fr)`,
            }}
          >
            {volumeAgg.map((v) => (
              <StatCard
                key={v.id}
                label={compactVolumeName(v.name, isMobile)}
                value={v.count}
                subtitle={
                  results.totalCount > 0
                    ? `${((v.count / results.totalCount) * 100).toFixed(1)}% of total`
                    : "0% of total"
                }
                color={VOLUME_COLORS[v.abbrev] || "var(--text-muted)"}
              />
            ))}
          </div>

          {/* Sticky jump-to nav + cross-tool links */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              marginBottom: "20px",
              flexWrap: "wrap",
              position: "sticky",
              top: 0,
              zIndex: 50,
              paddingTop: "8px",
              paddingBottom: "8px",
            }}
          >
            <span
              style={{
                fontSize: "0.68rem",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: "var(--text-muted)",
                marginRight: "8px",
                whiteSpace: "nowrap",
              }}
            >
              Jump to
            </span>
            {[
              { key: "section-arc", label: "Narrative Arc" },
              { key: "section-breakdowns", label: "Breakdowns" },
              { key: "section-top10", label: "Top Books" },
              { key: "section-table", label: "Data Table" },
            ].map((panel) => (
              <button
                key={panel.key}
                type="button"
                onClick={() => {
                  const el = document.getElementById(panel.key);
                  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  padding: "5px 12px",
                  borderRadius: "8px",
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.06)",
                  color: "var(--text-secondary)",
                  fontSize: "0.78rem",
                  fontWeight: 500,
                  fontFamily: "inherit",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                {panel.label}
              </button>
            ))}

            {/* Separator + cross-tool links */}
            <span style={{ color: "var(--border)", margin: "0 4px" }}>|</span>
            <a
              href={`/heatmap?word=${encodeURIComponent(results.word)}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                padding: "5px 12px",
                borderRadius: "8px",
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.04)",
                color: "var(--accent)",
                fontSize: "0.78rem",
                fontWeight: 500,
                fontFamily: "inherit",
                textDecoration: "none",
                transition: "all 0.15s ease",
              }}
            >
              <img src="/heatmap.svg" alt="" style={{ width: "14px", height: "14px", filter: "invert(1) brightness(0.85)" }} /> Heatmap
            </a>
            {results.results.length > 0 && (
              <a
                href={`/wordcloud?bookId=${results.results[0].bookId}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  padding: "5px 12px",
                  borderRadius: "8px",
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.04)",
                  color: "var(--accent)",
                  fontSize: "0.78rem",
                  fontWeight: 500,
                  fontFamily: "inherit",
                  textDecoration: "none",
                  transition: "all 0.15s ease",
                }}
              >
                <img src="/word-cloud.svg" alt="" style={{ width: "14px", height: "14px", filter: "invert(1) brightness(0.85)" }} /> Word Cloud
              </a>
            )}
          </div>

          {/* Matched words breakdown (partial search only) */}
          {results.matchedWords && results.matchedWords.length > 1 && (
            <DashboardCard
              title={`Words containing "${results.word}"`}
              tag={`${results.matchedWords.length} words`}
              tagColor="var(--accent)"
              description={`All distinct words matching your partial search, sorted by frequency`}
            >
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "6px",
                  maxHeight: "280px",
                  overflowY: "auto",
                }}
              >
                {results.matchedWords.map((mw) => (
                  <button
                    key={mw.word}
                    type="button"
                    onClick={() => {
                      setWord(mw.word);
                      setWholeWord(true);
                      pendingSearch.current = true;
                    }}
                    title={`Search for "${mw.word}"`}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "5px 12px",
                      borderRadius: "8px",
                      background: "var(--accent-soft)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      fontSize: "0.8rem",
                      color: "var(--text)",
                      fontWeight: 500,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      transition: "all 0.15s",
                    }}
                  >
                    {mw.word}
                    <span
                      style={{
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        color: "var(--accent)",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {mw.count.toLocaleString()}
                    </span>
                  </button>
                ))}
              </div>
            </DashboardCard>
          )}

          {/* Dashboard grid */}
          <div className="dashboard-grid">
            {/* Per-volume book breakdowns — tabbed */}
            {visiblePanels.has("breakdowns") && (() => {
              const breakdownVolumes = volumeAgg.filter((v) => v.count > 0);
              if (breakdownVolumes.length === 0) return null;

              const activeId = breakdownVolumes.some((v) => v.id === breakdownTab)
                ? breakdownTab!
                : breakdownVolumes[0].id;

              const activeV = breakdownVolumes.find((v) => v.id === activeId);
              if (!activeV) return null;

              const activeVolObj = volumes.find((vol) => vol.id === activeId);
              const isSingleBookBreakdown = activeVolObj && activeVolObj.books.length === 1;

              const allBooksInVolume = isSingleBookBreakdown
                ? (chapterData.get(activeId) || []).map((d) => ({
                    label: d.label,
                    value: d.count,
                    id: d.bookId,
                    chapter: d.chapter,
                  }))
                : (() => {
                    const volumeBooks = results.results.filter(
                      (r) => r.volumeAbbrev === activeV.abbrev
                    );
                    return (
                      activeVolObj?.books.map((b) => {
                        const result = volumeBooks.find(
                          (r) => r.bookId === b.id
                        );
                        return {
                          label: b.name,
                          value: result?.count || 0,
                          id: b.id,
                          chapter: undefined as number | undefined,
                        };
                      }) || []
                    );
                  })();

              return (
                <div id="section-breakdowns">
                <DashboardCard
                  title="Volume breakdown"
                  description={isSingleBookBreakdown ? `Occurrences by section — click a bar to read verses` : `Occurrences by book — click a bar to read verses`}
                  fullWidth
                >
                  {/* Volume tabs */}
                  {breakdownVolumes.length > 1 && (
                    <div style={{ display: "flex", gap: "6px", marginBottom: "20px", flexWrap: "wrap" }}>
                      {breakdownVolumes.map((v) => {
                        const isActive = v.id === activeId;
                        const tabColor = VOLUME_COLORS[v.abbrev] || "#3b82f6";
                        return (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => setBreakdownTab(v.id)}
                            style={{
                              padding: "6px 16px",
                              borderRadius: "8px",
                              border: isActive
                                ? `1px solid ${tabColor}`
                                : "1px solid var(--border)",
                              background: isActive ? tabColor : "transparent",
                              color: isActive ? getContrastText(tabColor) : "var(--text-muted)",
                              fontSize: "0.78rem",
                              fontWeight: isActive ? 600 : 500,
                              fontFamily: "inherit",
                              cursor: "pointer",
                              transition: "all 0.15s ease",
                            }}
                          >
                            {v.name}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <HorizontalBarList
                    items={allBooksInVolume}
                    color={VOLUME_COLORS[activeV.abbrev]}
                    onBarClick={(item: BarItem) => {
                      if (!item.id || !results) return;
                      const matchingItem = allBooksInVolume.find((b) => b.label === item.label && b.id === item.id);
                      setScripturePanel({
                        word: results.word,
                        bookId: item.id,
                        bookName: item.label,
                        chapter: matchingItem?.chapter,
                        caseInsensitive: results.caseInsensitive,
                        wholeWord: results.wholeWord,
                        volumeColor: VOLUME_COLORS[activeV.abbrev],
                      });
                    }}
                  />
                </DashboardCard>
                </div>
              );
            })()}

            {/* Top 10 books */}
            {visiblePanels.has("top10") && results.results.length > 0 && (
              <div id="section-top10" className="full-width">
              <DashboardCard
                title={`Top ${Math.min(10, results.results.length)} books (all volumes)`}
                description="Ranked by raw count"
              >
                <HorizontalBarList
                  items={results.results
                    .slice()
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 10)
                    .map((r) => ({
                      label: r.bookName,
                      value: r.count,
                      color: VOLUME_COLORS[r.volumeAbbrev] || "#3b82f6",
                      id: r.bookId,
                    }))}
                  onBarClick={(item: BarItem) =>
                    item.id && results && setScripturePanel({
                      word: results.word,
                      bookId: item.id,
                      bookName: item.label,
                      caseInsensitive: results.caseInsensitive,
                      wholeWord: results.wholeWord,
                      volumeColor: item.color,
                    })
                  }
                />
              </DashboardCard>
              </div>
            )}

            {/* Narrative arcs — tabbed by volume */}
            {visiblePanels.has("arc") && (() => {
              const arcVolumes = volumeAgg.filter((v) => v.count > 0);
              if (arcVolumes.length === 0) return null;

              // Auto-select first tab if none selected or selection invalid
              const activeTabId = arcVolumes.some((v) => v.id === arcVolumeTab)
                ? arcVolumeTab
                : arcVolumes[0].id;

              const activeVol = volumes.find((v) => v.id === activeTabId);
              if (!activeVol) return null;

              const color = VOLUME_COLORS[arcVolumes.find((v) => v.id === activeTabId)?.abbrev || ""] || "#3b82f6";
              const isSingleBook = activeVol.books.length === 1;
              const arcData = isSingleBook
                ? (chapterData.get(activeVol.id) || []).map((d) => ({
                    name: d.label,
                    count: d.count,
                    bookId: d.bookId,
                    chapter: d.chapter,
                  }))
                : activeVol.books.map((b) => {
                    const r = results.results.find((r) => r.bookId === b.id);
                    return { name: b.name, count: r?.count || 0, bookId: b.id, chapter: undefined as number | undefined };
                  });
              const maxCount = Math.max(...arcData.map((d) => d.count), 0);

              return (
                <div id="section-arc">
                <DashboardCard
                  title="Narrative arc"
                  description={isSingleBook ? `Frequency of "${results.word}" by section` : `Frequency of "${results.word}" by book in narrative order`}
                  fullWidth
                  headerExtra={
                    <a
                      href="/narrative-arc"
                      style={{
                        fontSize: "0.78rem",
                        fontWeight: 600,
                        color: "var(--accent)",
                        textDecoration: "underline",
                        textUnderlineOffset: "3px",
                        whiteSpace: "nowrap",
                        opacity: 0.85,
                        transition: "opacity 0.15s",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.opacity = "0.85"; }}
                    >
                      Compare multiple terms →
                    </a>
                  }
                >
                  {/* Volume tabs */}
                  {arcVolumes.length > 1 && (
                    <div style={{ display: "flex", gap: "6px", marginBottom: "20px", flexWrap: "wrap" }}>
                      {arcVolumes.map((v) => {
                        const isActive = v.id === activeTabId;
                        const tabColor = VOLUME_COLORS[v.abbrev] || "#3b82f6";
                        return (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => setArcVolumeTab(v.id)}
                            style={{
                              padding: "6px 16px",
                              borderRadius: "8px",
                              border: isActive
                                ? `1px solid ${tabColor}`
                                : "1px solid var(--border)",
                              background: isActive ? tabColor : "transparent",
                              color: isActive ? getContrastText(tabColor) : "var(--text-muted)",
                              fontSize: "0.78rem",
                              fontWeight: isActive ? 600 : 500,
                              fontFamily: "inherit",
                              cursor: "pointer",
                              transition: "all 0.15s ease",
                            }}
                          >
                            {v.name}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "8px" }}>
                    <ChartZoomControls chartRef={arcChartRef} color={color} isMobile={isMobile} />
                  </div>
                  <div className="chart-container-tall" style={{ overflow: "hidden" }}>
                    <Line
                      ref={arcChartRef}
                      key={activeTabId}
                      data={{
                        labels: arcData.map((d) => d.name),
                        datasets: [
                          {
                            data: arcData.map((d) => d.count),
                            fill: true,
                            backgroundColor: `${color}14`,
                            borderColor: color,
                            borderWidth: 2,
                            pointBackgroundColor: arcData.map((d) =>
                              d.count === maxCount && d.count > 0
                                ? "#fff"
                                : color
                            ),
                            pointBorderColor: color,
                            pointBorderWidth: arcData.map((d) =>
                              d.count === maxCount && d.count > 0
                                ? 3
                                : 1
                            ),
                            pointRadius: isSingleBook
                              ? 2
                              : arcData.map((d) =>
                                  d.count === maxCount && d.count > 0
                                    ? 7
                                    : d.count > 0
                                      ? 3.5
                                      : 2
                                ),
                            pointHoverRadius: isSingleBook ? 5 : 7,
                            tension: 0.35,
                          },
                        ],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        ...({ clip: false } as Record<string, unknown>),
                        plugins: {
                          legend: { display: false },
                          tooltip: {
                            callbacks: {
                              title: isSingleBook
                                ? (items) => `Section ${items[0].dataIndex + 1}`
                                : undefined,
                              label: (ctx) =>
                                ` ${ctx.raw} occurrences`,
                            },
                          },
                          datalabels: isSingleBook
                            ? { display: false }
                            : {
                                display: (ctx: any) => (ctx.dataset.data as number[])[ctx.dataIndex] > 0,
                                anchor: "end",
                                align: "top",
                                offset: 4,
                                color: "#fafafa",
                                font: { weight: 700, size: 11 },
                                formatter: (value: number) => value.toLocaleString(),
                              } as any,
                          zoom: {
                            zoom: {
                              wheel: { enabled: false },
                              pinch: { enabled: false },
                              drag: { enabled: false },
                            },
                            pan: {
                              enabled: true,
                              mode: "x" as const,
                            },
                            limits: {
                              x: { minRange: 3 },
                            },
                          },
                        },
                        layout: { padding: { top: 30 } },
                        onHover: (_event: any, elements: any[]) => {
                          const canvas = (_event as any)?.native?.target as HTMLCanvasElement | undefined;
                          if (canvas) canvas.style.cursor = elements.length > 0 ? "pointer" : "default";
                        },
                        onClick: (_event: any, elements: any[]) => {
                          if (elements.length === 0) return;
                          const idx = elements[0].index;
                          const point = arcData[idx];
                          if (!point || point.count === 0) return;
                          setScripturePanel({
                            word: results.word,
                            bookId: point.bookId,
                            bookName: isSingleBook ? (activeVol?.books[0]?.name || point.name) : point.name,
                            chapter: point.chapter,
                            caseInsensitive: results.caseInsensitive,
                            wholeWord: results.wholeWord,
                            volumeColor: color,
                          });
                        },
                        scales: {
                          y: {
                            grid: {
                              color: "rgba(255,255,255,0.06)",
                            },
                            ticks: { font: { weight: 600 } },
                            beginAtZero: true,
                          },
                          x: {
                            grid: { display: false },
                            ticks: {
                              maxRotation: isSingleBook ? 0 : 45,
                              font: { size: isSingleBook ? 9 : 12, weight: 500 },
                              callback: isSingleBook
                                ? function(this: unknown, _val: unknown, index: number) {
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
                </DashboardCard>
                </div>
              );
            })()}

            {/* Summary table */}
            {visiblePanels.has("table") && (
            <div id="section-table" className="full-width">
            <DashboardCard
              title="Summary statistics"
              description="All books with occurrences"
              fullWidth
            >
              <DataTable
                columns={[
                  { key: "book", label: "Book" },
                  { key: "volume", label: "Volume" },
                  { key: "count", label: "Count", align: "right", mono: true },
                  {
                    key: "verses",
                    label: "Verses",
                    align: "right",
                    mono: true,
                  },
                ]}
                rows={results.results
                  .slice()
                  .sort((a, b) => b.count - a.count)
                  .map((r) => ({
                    book: r.bookName,
                    volume: r.volumeAbbrev,
                    count: r.count,
                    verses: r.verseCount,
                  }))}
                totalRow={{
                  book: "Total",
                  volume: "",
                  count: results.totalCount,
                  verses: results.totalVerses,
                }}
              />
            </DashboardCard>
            </div>
            )}
          </div>
        </>
      )}

      {/* Empty state */}
      {!results && !isLoading && (
        <div
          style={{
            textAlign: "center",
            padding: "80px 20px",
            color: "var(--text-muted)",
          }}
        >
          <div style={{ fontSize: "3rem", marginBottom: "16px" }}>
            &#x1F50D;
          </div>
          <div style={{ fontSize: "1.1rem", fontWeight: 500 }}>
            Enter a word or phrase above to analyze its frequency across the
            scriptures
          </div>
          <div
            style={{
              fontSize: "0.88rem",
              marginTop: "8px",
              color: "var(--text-muted)",
            }}
          >
            Try &quot;Jesus&quot;, &quot;faith&quot;, &quot;covenant&quot;, or
            &quot;repent&quot;
          </div>
        </div>
      )}

      {/* No results state */}
      {results && results.totalCount === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "60px 20px",
            color: "var(--text-muted)",
          }}
        >
          <div style={{ fontSize: "1.1rem", fontWeight: 500 }}>
            No occurrences of &quot;{results.word}&quot; found
          </div>
          <div style={{ fontSize: "0.88rem", marginTop: "8px" }}>
            Try a different word or adjust your search settings
          </div>
        </div>
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
