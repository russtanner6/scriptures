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
import type { BarItem } from "./HorizontalBarList";
import DataTable from "./DataTable";
import ExportChartModal, { ExportButton } from "./ExportChartModal";
import ChartHints from "./ChartHints";
import FilterDropdown from "./FilterDropdown";
import ScripturePanel from "./ScripturePanel";
import type { ScripturePanelState } from "@/lib/types";
import { chartScrollbarPlugin } from "@/lib/chart-scrollbar-plugin";
import { usePreferencesContext } from "@/components/PreferencesProvider";
import { useIsMobile } from "@/lib/useIsMobile";

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

export default function WordFrequencyTool() {
  const { isVolumeVisible } = usePreferencesContext();
  const [volumes, setVolumes] = useState<Volume[]>([]);
  const [selectedVolumeIds, setSelectedVolumeIds] = useState<Set<number>>(
    new Set()
  );
  const [word, setWord] = useState("");
  const [caseInsensitive, setCaseInsensitive] = useState(true);
  const [wholeWord, setWholeWord] = useState(true);
  const [results, setResults] = useState<WordFrequencyResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingSearch = useRef(false);
  const isMobile = useIsMobile();

  // Register zoom plugin client-side only (avoids SSR window error)
  const zoomPluginRef = useRef<any>(null);
  const [zoomReady, setZoomReady] = useState(false);
  useEffect(() => {
    import("chartjs-plugin-zoom").then((mod) => {
      ChartJS.register(mod.default);
      zoomPluginRef.current = mod.default;
      setZoomReady(true);
    });
  }, []);

  // Chart visibility toggles — all on by default
  const [arcVolumeTab, setArcVolumeTab] = useState<number | null>(null);
  const [breakdownTab, setBreakdownTab] = useState<number | null>(null);
  const [scripturePanel, setScripturePanel] = useState<ScripturePanelState | null>(null);
  const arcChartRef = useRef<any>(null);
  const [exportArc, setExportArc] = useState(false);
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
        const filtered = data.volumes.filter((v: Volume) => isVolumeVisible(v.abbrev));
        setVolumes(filtered);
        setSelectedVolumeIds(
          new Set(filtered.map((v: Volume) => v.id))
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
      // Always fetch all volumes — toggles filter client-side after initial search
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

  // Auto-re-search when options change and we already have results
  const prevOptions = useRef({ caseInsensitive, wholeWord });
  useEffect(() => {
    if (!results || !word.trim()) return;
    if (
      prevOptions.current.caseInsensitive !== caseInsensitive ||
      prevOptions.current.wholeWord !== wholeWord
    ) {
      prevOptions.current = { caseInsensitive, wholeWord };
      handleSearch();
    }
  }, [caseInsensitive, wholeWord]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Expand single-book volumes (D&C) into per-section entries for Top Books & Data Table
  const expandedResults = results
    ? results.results.flatMap((r) => {
        // Find the volume for this result
        const vol = volumes.find((v) => v.abbrev === r.volumeAbbrev);
        if (vol && vol.books.length === 1) {
          // Single-book volume — replace with per-section entries from chapterData
          const sections = chapterData.get(vol.id);
          if (sections && sections.length > 0) {
            return sections
              .filter((s) => s.count > 0)
              .map((s) => ({
                bookId: s.bookId,
                bookName: `${r.bookName} ${s.chapter}`,
                volumeName: r.volumeName,
                volumeAbbrev: r.volumeAbbrev,
                displayOrder: r.displayOrder + s.chapter * 0.001,
                count: s.count,
                verseCount: 0, // chapter-level verse count not available
                chapter: s.chapter,
              }));
          }
        }
        return [r];
      })
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

  // Active volume color dots for the filter dropdown badge
  const activeVolumeDots = volumes.filter((v) => selectedVolumeIds.has(v.id)).map((v) => VOLUME_COLORS[v.abbrev]);
  const optionsActiveCount = (caseInsensitive ? 1 : 0) + (wholeWord ? 1 : 0);

  return (
    <div>
      {/* Search Controls — two-column layout */}
      <div className="search-panel">
        <div style={{ display: "flex", gap: isMobile ? "16px" : "24px", flexDirection: isMobile ? "column" : "row", alignItems: "flex-start" }}>
          {/* LEFT COLUMN — Title, description, search bar */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontSize: isMobile ? "1.2rem" : "1.4rem", fontWeight: 700, color: "var(--text)", marginBottom: "6px", lineHeight: 1.2 }}>
              Word Search
            </h1>
            <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "14px", lineHeight: 1.4 }}>
              Search any word or phrase across all scripture volumes.
            </p>

            {/* Search bar */}
            <div
              className="search-bar-glow"
              style={{
                display: "flex",
                background: "var(--zinc-900)",
                border: "1px solid var(--border-accent)",
                borderRadius: "12px",
                overflow: "hidden",
              }}
            >
              <div style={{ position: "relative", flex: 1, display: "flex", alignItems: "center" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", left: "14px", pointerEvents: "none" }}>
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
                  placeholder={isMobile ? 'Search...' : 'Search a word or "exact phrase"...'}
                  style={{ width: "100%", padding: "12px 14px 12px 42px", background: "transparent", border: "none", color: "var(--text)", fontSize: "0.92rem", fontFamily: "inherit", outline: "none" }}
                />
              </div>
              <button
                onClick={handleSearch}
                disabled={!word.trim() || isLoading}
                style={{
                  padding: "12px 20px",
                  background: !word.trim() || isLoading ? "var(--zinc-800)" : "linear-gradient(135deg, #3b82f6, #60a5fa)",
                  color: !word.trim() || isLoading ? "var(--text-muted)" : "#fff",
                  border: "none", borderLeft: "1px solid var(--border)",
                  fontSize: "0.85rem", fontWeight: 600, cursor: !word.trim() || isLoading ? "not-allowed" : "pointer",
                  fontFamily: "inherit", transition: "background 0.2s", whiteSpace: "nowrap",
                }}
              >
                {isLoading ? (isMobile ? "..." : "Searching...") : "Go"}
              </button>
            </div>

            {/* Search tips link */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "6px" }}>
              <button
                type="button"
                onClick={() => setShowHelp(!showHelp)}
                style={{ background: "none", border: "none", color: showHelp ? "#3b82f6" : "var(--text-muted)", fontSize: "0.72rem", fontWeight: 500, fontFamily: "inherit", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: "3px", padding: 0, transition: "color 0.15s" }}
              >
                Search tips
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN — Filter dropdowns */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", flexShrink: 0, paddingTop: isMobile ? "0" : "36px" }}>
            <FilterDropdown
              label="Volumes"
              activeCount={selectedVolumeIds.size}
              totalCount={volumes.length}
              colorDots={activeVolumeDots}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {volumes.map((v) => {
                  const isActive = selectedVolumeIds.has(v.id);
                  const color = VOLUME_COLORS[v.abbrev];
                  return (
                    <label key={v.id} style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "0.82rem", fontWeight: isActive ? 600 : 400, color: isActive ? "var(--text)" : "var(--text-secondary)", transition: "color 0.15s", whiteSpace: "nowrap" }}>
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
              activeCount={optionsActiveCount}
              totalCount={2}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "0.82rem", color: caseInsensitive ? "var(--text)" : "var(--text-secondary)", whiteSpace: "nowrap" }}>
                  <span onClick={(e) => { e.preventDefault(); setCaseInsensitive(!caseInsensitive); }} style={{ width: "14px", height: "14px", borderRadius: "3px", border: caseInsensitive ? "2px solid #3B82F6" : "2px solid rgba(255,255,255,0.2)", background: caseInsensitive ? "#3B82F6" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s", flexShrink: 0 }}>
                    {caseInsensitive && <svg width="8" height="8" viewBox="0 0 10 10" fill="none"><path d="M2 5L4 7L8 3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                  </span>
                  Case-insensitive
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "0.82rem", color: wholeWord ? "var(--text)" : "var(--text-secondary)", whiteSpace: "nowrap" }}>
                  <span onClick={(e) => { e.preventDefault(); setWholeWord(!wholeWord); }} style={{ width: "14px", height: "14px", borderRadius: "3px", border: wholeWord ? "2px solid #3B82F6" : "2px solid rgba(255,255,255,0.2)", background: wholeWord ? "#3B82F6" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s", flexShrink: 0 }}>
                    {wholeWord && <svg width="8" height="8" viewBox="0 0 10 10" fill="none"><path d="M2 5L4 7L8 3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                  </span>
                  Exact match
                </label>
              </div>
            </FilterDropdown>
          </div>
        </div>

        {/* Help popup — full width below the two columns */}
        {showHelp && (
          <div
            style={{
              background: "var(--zinc-900)",
              border: "1px solid var(--border-accent)",
              borderRadius: "12px",
              padding: "16px 20px",
              marginTop: "16px",
              fontSize: "0.82rem",
              lineHeight: 1.7,
              color: "var(--text-secondary)",
            }}
          >
            <div style={{ fontWeight: 700, color: "var(--text)", marginBottom: "10px", fontSize: "0.85rem" }}>
              Search Tips
            </div>
            <div style={{ display: "grid", gap: "6px" }}>
              <div>
                <code style={{ color: "var(--accent)", background: "var(--accent-soft)", padding: "2px 6px", borderRadius: "4px", fontSize: "0.78rem" }}>Jesus</code>
                {" "}— Search for a single word
              </div>
              <div>
                <code style={{ color: "var(--accent)", background: "var(--accent-soft)", padding: "2px 6px", borderRadius: "4px", fontSize: "0.78rem" }}>{'"come unto me"'}</code>
                {" "}— Wrap in quotes to search an exact phrase
              </div>
              <div>
                <code style={{ color: "var(--accent)", background: "var(--accent-soft)", padding: "2px 6px", borderRadius: "4px", fontSize: "0.78rem" }}>tim</code>
                {" "}+ <span style={{ color: "var(--emerald)" }}>Exact match OFF</span> — Find all words containing &quot;tim&quot; (time, Timothy, etc.)
              </div>
            </div>
          </div>
        )}
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
            {visiblePanels.has("top10") && expandedResults.length > 0 && (
              <div id="section-top10" className="full-width">
              <DashboardCard
                title={`Top ${Math.min(10, expandedResults.length)} books & sections (all volumes)`}
                description="Ranked by raw count"
              >
                <HorizontalBarList
                  items={expandedResults
                    .slice()
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 10)
                    .map((r) => ({
                      label: r.bookName,
                      value: r.count,
                      color: VOLUME_COLORS[r.volumeAbbrev] || "#3b82f6",
                      id: r.bookId,
                    }))}
                  onBarClick={(item: BarItem) => {
                    if (!item.id || !results) return;
                    const match = expandedResults.find((r) => r.bookName === item.label && r.bookId === item.id);
                    setScripturePanel({
                      word: results.word,
                      bookId: item.id,
                      bookName: item.label,
                      chapter: match && "chapter" in match ? (match as { chapter?: number }).chapter : undefined,
                      caseInsensitive: results.caseInsensitive,
                      wholeWord: results.wholeWord,
                      volumeColor: item.color,
                    });
                  }}
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
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
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
                      <ExportButton compact={isMobile} onClick={() => setExportArc(true)} />
                    </div>
                  }
                >
                  <ChartHints isMobile={isMobile} />

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

                  <div style={isMobile ? { overflowX: "auto", WebkitOverflowScrolling: "touch", margin: "0 -16px", padding: "0 16px" } : {}}>
                  <div className={`chart-container-tall${isMobile ? " chart-touch-container" : ""}`} style={isMobile ? { width: `${Math.max(600, arcData.length * 28)}px`, minWidth: "100%" } : {}} onDoubleClick={() => arcChartRef.current?.resetZoom()}>
                    <Line
                      ref={arcChartRef}
                      key={`${activeTabId}-${zoomReady}`}
                      plugins={[...(zoomPluginRef.current ? [zoomPluginRef.current] : []), chartScrollbarPlugin]}
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
                            pointHitRadius: isMobile ? 20 : 10,
                            tension: 0.35,
                          },
                        ],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        ...({ clip: { left: true, right: true, bottom: true, top: false } } as Record<string, unknown>),
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
                          zoom: (isMobile
                            ? { zoom: { wheel: { enabled: false }, pinch: { enabled: true, threshold: 10 }, drag: { enabled: false }, mode: "x" }, pan: { enabled: true, mode: "x", threshold: 10 }, limits: { x: { minRange: 8 } } }
                            : {
                              zoom: {
                                wheel: { enabled: true, speed: 0.05, modifierKey: "alt" },
                                pinch: { enabled: true, threshold: 10 },
                                drag: { enabled: false },
                                mode: "x",
                              },
                              pan: { enabled: true, mode: "x", threshold: 10 },
                              limits: { x: { minRange: 3 } },
                            }) as any,
                        },
                        layout: { padding: { top: 30, bottom: 20 } },
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
                              // Use `val` (category index) not `index` (visible tick position) — index shifts when zoomed
                              callback: isSingleBook
                                ? function(this: any, val: unknown) {
                                    const sectionNum = (val as number) + 1;
                                    const scale = this as any;
                                    const visibleRange = (scale.max || 0) - (scale.min || 0) + 1;
                                    const step = visibleRange > 80 ? 10 : visibleRange > 30 ? 5 : 1;
                                    if (sectionNum === 1 || sectionNum % step === 0) return `Sec ${sectionNum}`;
                                    return null;
                                  }
                                : function(this: unknown, val: unknown) {
                                    return arcData[val as number]?.name || "";
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
                rows={expandedResults
                  .slice()
                  .sort((a, b) => b.count - a.count)
                  .map((r) => ({
                    book: r.bookName,
                    volume: r.volumeAbbrev,
                    count: r.count,
                    verses: r.verseCount || "—",
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

      {/* Export modal for narrative arc */}
      <ExportChartModal
        isOpen={exportArc}
        onClose={() => setExportArc(false)}
        chartRef={arcChartRef}
        title={results ? `${results.word} narrative arc` : "narrative arc"}
      />
    </div>
  );
}
