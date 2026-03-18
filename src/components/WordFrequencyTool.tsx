"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Filler,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import ChartDataLabels from "chartjs-plugin-datalabels";
import type { Volume, WordFrequencyResponse } from "@/lib/types";
import { VOLUME_COLORS } from "@/lib/constants";
import StatCard from "./StatCard";
import DashboardCard from "./DashboardCard";
import HorizontalBarList from "./HorizontalBarList";
import DataTable from "./DataTable";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Filler,
  Tooltip,
  Legend,
  ChartDataLabels
);

// Chart.js global defaults for dark theme
ChartJS.defaults.color = "#b0a8c0";
ChartJS.defaults.font.family = "'Inter', sans-serif";
ChartJS.defaults.font.size = 13;
ChartJS.defaults.font.weight = 500;
// Disable datalabels globally — enable per-chart
ChartJS.defaults.plugins.datalabels = { display: false } as never;

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
  const isMobile = useIsMobile();

  // Chart visibility toggles — all on by default
  const [visiblePanels, setVisiblePanels] = useState<Set<string>>(
    new Set(["share", "counts", "breakdowns", "top10", "arc", "table"])
  );
  const togglePanel = (key: string) => {
    setVisiblePanels((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Load volumes on mount
  useEffect(() => {
    fetch("/api/books")
      .then((r) => r.json())
      .then((data) => {
        setVolumes(data.volumes);
        setSelectedVolumeIds(
          new Set(data.volumes.map((v: Volume) => v.id))
        );
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
    } finally {
      setIsLoading(false);
    }
  }, [word, caseInsensitive, wholeWord, selectedVolumeIds, volumes.length]);

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
                  : "linear-gradient(135deg, #8b5cf6, #a78bfa)",
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
            {isLoading ? (isMobile ? "..." : "Analyzing...") : (isMobile ? "Go" : "Analyze")}
          </button>
        </div>

        {/* Help link — sits below the search bar, not inside it */}
        <div style={{ marginBottom: "16px", display: "flex", alignItems: "center", gap: "6px" }}>
          <button
            type="button"
            onClick={() => setShowHelp(!showHelp)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "0",
              background: "none",
              border: "none",
              color: showHelp ? "var(--accent)" : "var(--text-muted)",
              fontSize: "0.78rem",
              fontWeight: 500,
              fontFamily: "inherit",
              cursor: "pointer",
              transition: "color 0.15s",
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "18px",
                height: "18px",
                borderRadius: "50%",
                background: showHelp ? "var(--accent)" : "var(--text-muted)",
                color: "#fff",
                fontSize: "0.68rem",
                fontWeight: 700,
                lineHeight: 1,
                flexShrink: 0,
              }}
            >
              ?
            </span>
            {showHelp ? "Hide search tips" : "Search tips & syntax"}
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
                {" "}+ <span style={{ color: "var(--emerald)" }}>Whole word OFF</span> — Find all words containing &quot;tim&quot; (time, Timothy, etc.)
              </div>
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: "8px", marginTop: "4px" }}>
                <strong style={{ color: "var(--text)" }}>Options:</strong>
              </div>
              <div>
                <span style={{ color: "var(--accent)" }}>Case-insensitive</span> — &quot;jesus&quot; matches &quot;Jesus&quot; and &quot;JESUS&quot;
              </div>
              <div>
                <span style={{ color: "var(--accent)" }}>Whole word</span> — Only matches the exact word, not words containing it. Turn off for partial/substring matching.
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
                  borderRadius: "100px",
                  border: isActive
                    ? `1px solid ${color}`
                    : "1px solid var(--border)",
                  background: isActive ? color : "transparent",
                  color: isActive ? "#fff" : "var(--text-muted)",
                  fontSize: "0.8rem",
                  fontWeight: isActive ? 600 : 500,
                  fontFamily: "inherit",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  letterSpacing: "0.01em",
                }}
              >
                <span
                  style={{
                    width: "7px",
                    height: "7px",
                    borderRadius: "50%",
                    background: color,
                    opacity: isActive ? 1 : 0.3,
                    transition: "opacity 0.15s",
                  }}
                />
                {v.abbrev === "D&C" ? "D&C" : v.name}
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
                  borderRadius: "100px",
                  border: caseInsensitive
                    ? "1px solid #8b5cf6"
                    : "1px solid var(--border)",
                  background: caseInsensitive
                    ? "#8b5cf6"
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
                  borderRadius: "100px",
                  border: wholeWord
                    ? "1px solid #8b5cf6"
                    : "1px solid var(--border)",
                  background: wholeWord
                    ? "#8b5cf6"
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
                Whole word
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
                  borderTop: "1px solid var(--border)",
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
                  borderTop: "1px solid var(--border)",
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
                      {[caseInsensitive && "Case-insensitive", wholeWord && "Whole word"].filter(Boolean).join(", ") || "None"}
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
                label={v.abbrev === "D&C" ? "D&C" : v.name}
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

          {/* Chart visibility toggles */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              marginBottom: "20px",
              flexWrap: "wrap",
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
              Show
            </span>
            {[
              { key: "share", label: "Share Chart" },
              { key: "counts", label: "Counts" },
              { key: "breakdowns", label: "Breakdowns" },
              { key: "top10", label: "Top Books" },
              { key: "arc", label: "Narrative Arc" },
              { key: "table", label: "Data Table" },
            ].map((panel) => {
              const isOn = visiblePanels.has(panel.key);
              return (
                <button
                  key={panel.key}
                  type="button"
                  onClick={() => togglePanel(panel.key)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    padding: "5px 12px",
                    borderRadius: "100px",
                    border: isOn
                      ? "1px solid #10b981"
                      : "1px solid var(--border)",
                    background: isOn
                      ? "#10b981"
                      : "transparent",
                    color: isOn ? "#fff" : "var(--text-muted)",
                    fontSize: "0.78rem",
                    fontWeight: 500,
                    fontFamily: "inherit",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  <span style={{ fontSize: "0.7rem" }}>
                    {isOn ? "✓" : ""}
                  </span>
                  {panel.label}
                </button>
              );
            })}
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
                  <span
                    key={mw.word}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "5px 12px",
                      borderRadius: "100px",
                      background: "var(--accent-soft)",
                      border: "1px solid rgba(59, 130, 246, 0.15)",
                      fontSize: "0.8rem",
                      color: "var(--text)",
                      fontWeight: 500,
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
                  </span>
                ))}
              </div>
            </DashboardCard>
          )}

          {/* Dashboard grid */}
          <div className="dashboard-grid">
            {/* Doughnut chart */}
            {visiblePanels.has("share") && (
            <DashboardCard
              title="Share by collection"
              description={`Proportion of all ${results.totalCount.toLocaleString()} occurrences`}
            >
              <div className="chart-container">
                <Doughnut
                  data={{
                    labels: volumeAgg.map((v) => v.name),
                    datasets: [
                      {
                        data: volumeAgg.map((v) => v.count),
                        backgroundColor: volumeAgg.map(
                          (v) =>
                            v.count > 0
                              ? VOLUME_COLORS[v.abbrev]
                              : "#3f3f46"
                        ),
                        borderColor: "#0a0a1a",
                        borderWidth: 3,
                        hoverOffset: 6,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: "68%",
                    plugins: {
                      legend: {
                        position: isMobile ? "bottom" : "right",
                        labels: {
                          padding: 16,
                          usePointStyle: true,
                          pointStyleWidth: 8,
                          font: { size: 13, weight: 500 },
                        },
                      },
                      tooltip: {
                        callbacks: {
                          label: (ctx) =>
                            ` ${ctx.label}: ${ctx.raw}  (${(
                              ((ctx.raw as number) / results.totalCount) *
                              100
                            ).toFixed(1)}%)`,
                        },
                      },
                    },
                  }}
                />
              </div>
            </DashboardCard>
            )}

            {/* Horizontal bar by collection */}
            {visiblePanels.has("counts") && (
            <DashboardCard
              title="Raw counts by collection"
              description="Total occurrences per volume"
            >
              <div className="chart-container">
                <Bar
                  data={{
                    labels: volumeAgg.map((v) =>
                      v.name.length > 18
                        ? v.abbrev
                        : v.name
                    ),
                    datasets: [
                      // Track/trough (behind the colored bars)
                      {
                        data: volumeAgg.map(() => Math.max(...volumeAgg.map(v => v.count), 1)),
                        backgroundColor: "rgba(139, 92, 246, 0.08)",
                        borderRadius: 8,
                        borderSkipped: false,
                        barPercentage: 0.6,
                        categoryPercentage: 0.8,
                      },
                      // Actual data bars
                      {
                        data: volumeAgg.map((v) => v.count),
                        backgroundColor: volumeAgg.map(
                          (v) =>
                            v.count > 0
                              ? VOLUME_COLORS[v.abbrev]
                              : "#3f3f46"
                        ),
                        borderRadius: 8,
                        borderSkipped: false,
                        barPercentage: 0.6,
                        categoryPercentage: 0.8,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    indexAxis: "y",
                    ...({ grouped: false } as Record<string, unknown>),
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        filter: (item) => item.datasetIndex === 1,
                        callbacks: {
                          label: (ctx) => ` ${ctx.raw} occurrences`,
                        },
                      },
                      datalabels: {
                        display: (ctx) => ctx.datasetIndex === 1,
                        anchor: "end",
                        align: (ctx) => {
                          const max = Math.max(...(ctx.dataset.data as number[]));
                          const val = (ctx.dataset.data as number[])[ctx.dataIndex];
                          return val / max > 0.3 ? "start" : "end";
                        },
                        color: (ctx) => {
                          const max = Math.max(...(ctx.dataset.data as number[]));
                          const val = (ctx.dataset.data as number[])[ctx.dataIndex];
                          return val / max > 0.3 ? "#fff" : "#b0a8c0";
                        },
                        font: { weight: 700, size: 12 },
                        formatter: (value: number) => value.toLocaleString(),
                      },
                    },
                    scales: {
                      x: {
                        display: false,
                      },
                      y: {
                        grid: { display: false },
                        ticks: { font: { weight: 500 } },
                      },
                    },
                  }}
                />
              </div>
            </DashboardCard>
            )}

            {/* Per-volume book breakdowns */}
            {visiblePanels.has("breakdowns") && volumeAgg
              .filter((v) => v.count > 0)
              .map((v) => {
                const volumeBooks = results.results.filter(
                  (r) => r.volumeAbbrev === v.abbrev
                );
                const allBooksInVolume =
                  volumes
                    .find((vol) => vol.id === v.id)
                    ?.books.map((b) => {
                      const result = volumeBooks.find(
                        (r) => r.bookId === b.id
                      );
                      return {
                        label: b.name,
                        value: result?.count || 0,
                      };
                    }) || [];

                return (
                  <DashboardCard
                    key={v.id}
                    title={`${v.name} breakdown`}
                    tag={String(v.count)}
                    tagColor={VOLUME_COLORS[v.abbrev]}
                    description={`Occurrences by book within ${v.name}`}
                  >
                    <HorizontalBarList
                      items={allBooksInVolume}
                      color={VOLUME_COLORS[v.abbrev]}
                      gradientEnd={
                        v.abbrev === "BoM"
                          ? "#fbbf24"
                          : v.abbrev === "NT"
                            ? "#60a5fa"
                            : undefined
                      }
                    />
                  </DashboardCard>
                );
              })}

            {/* Top 10 books */}
            {visiblePanels.has("top10") && results.results.length > 0 && (
              <DashboardCard
                title={`Top ${Math.min(10, results.results.length)} books — all scripture`}
                description="Ranked by raw count"
              >
                <div className="chart-container">
                  <Bar
                    data={{
                      labels: results.results
                        .slice(0, 10)
                        .sort((a, b) => b.count - a.count)
                        .map((r) => r.bookName),
                      datasets: [
                        // Track/trough
                        {
                          data: (() => {
                            const sorted = results.results.slice().sort((a, b) => b.count - a.count).slice(0, 10);
                            const maxVal = Math.max(...sorted.map(r => r.count), 1);
                            return sorted.map(() => maxVal);
                          })(),
                          backgroundColor: "rgba(139, 92, 246, 0.08)",
                          borderRadius: 6,
                          borderSkipped: false,
                          barPercentage: 0.6,
                          categoryPercentage: 0.8,
                        },
                        // Data bars
                        {
                          data: results.results
                            .slice()
                            .sort((a, b) => b.count - a.count)
                            .slice(0, 10)
                            .map((r) => r.count),
                          backgroundColor: results.results
                            .slice()
                            .sort((a, b) => b.count - a.count)
                            .slice(0, 10)
                            .map(
                              (r) =>
                                VOLUME_COLORS[r.volumeAbbrev] ||
                                "#3f3f46"
                            ),
                          borderRadius: 6,
                          borderSkipped: false,
                          barPercentage: 0.6,
                          categoryPercentage: 0.8,
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      indexAxis: "y",
                      ...({ grouped: false } as Record<string, unknown>),
                      plugins: {
                        legend: { display: false },
                        tooltip: {
                          filter: (item) => item.datasetIndex === 1,
                          callbacks: {
                            label: (ctx) => {
                              const sorted = results.results
                                .slice()
                                .sort((a, b) => b.count - a.count)
                                .slice(0, 10);
                              const item = sorted[ctx.dataIndex];
                              return ` ${item.bookName} (${item.volumeAbbrev}): ${ctx.raw}`;
                            },
                          },
                        },
                        datalabels: {
                          display: (ctx) => ctx.datasetIndex === 1,
                          anchor: "end",
                          align: (ctx) => {
                            const max = Math.max(...(ctx.dataset.data as number[]));
                            const val = (ctx.dataset.data as number[])[ctx.dataIndex];
                            return val / max > 0.3 ? "start" : "end";
                          },
                          color: (ctx) => {
                            const max = Math.max(...(ctx.dataset.data as number[]));
                            const val = (ctx.dataset.data as number[])[ctx.dataIndex];
                            return val / max > 0.3 ? "#fff" : "#b0a8c0";
                          },
                          font: { weight: 700, size: 11 },
                          formatter: (value: number) => value.toLocaleString(),
                        },
                      },
                      scales: {
                        x: {
                          display: false,
                        },
                        y: {
                          grid: { display: false },
                          ticks: {
                            font: { size: 13, weight: 500 },
                          },
                        },
                      },
                    }}
                  />
                </div>
              </DashboardCard>
            )}

            {/* Narrative arc — Book of Mormon */}
            {visiblePanels.has("arc") && results.results.some((r) => r.volumeAbbrev === "BoM") && (
              <DashboardCard
                title="Book of Mormon narrative arc"
                description={`Frequency of "${results.word}" by book in narrative order`}
                fullWidth
              >
                <div className="chart-container-tall">
                  {(() => {
                    const bomVolume = volumes.find(
                      (v) => v.abbrev === "BoM"
                    );
                    if (!bomVolume) return null;
                    const bomData = bomVolume.books.map((b) => {
                      const r = results.results.find(
                        (r) => r.bookId === b.id
                      );
                      return { name: b.name, count: r?.count || 0 };
                    });
                    const maxCount = Math.max(
                      ...bomData.map((d) => d.count)
                    );

                    return (
                      <Line
                        data={{
                          labels: bomData.map((d) => d.name),
                          datasets: [
                            {
                              data: bomData.map((d) => d.count),
                              fill: true,
                              backgroundColor: "rgba(245,158,11,0.08)",
                              borderColor: "#f59e0b",
                              borderWidth: 2,
                              pointBackgroundColor: bomData.map((d) =>
                                d.count === maxCount && d.count > 0
                                  ? "#fff"
                                  : "#f59e0b"
                              ),
                              pointBorderColor: "#f59e0b",
                              pointBorderWidth: bomData.map((d) =>
                                d.count === maxCount && d.count > 0
                                  ? 3
                                  : 1
                              ),
                              pointRadius: bomData.map((d) =>
                                d.count === maxCount && d.count > 0
                                  ? 7
                                  : d.count > 0
                                    ? 3.5
                                    : 2
                              ),
                              tension: 0.35,
                            },
                          ],
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: { display: false },
                            tooltip: {
                              callbacks: {
                                label: (ctx) =>
                                  ` ${ctx.raw} occurrences`,
                              },
                            },
                          },
                          scales: {
                            y: {
                              grid: {
                                color: "rgba(139,92,246,0.06)",
                              },
                              ticks: { font: { weight: 600 } },
                            },
                            x: {
                              grid: { display: false },
                              ticks: {
                                maxRotation: 45,
                                font: { size: 12, weight: 500 },
                              },
                            },
                          },
                        }}
                      />
                    );
                  })()}
                </div>
              </DashboardCard>
            )}

            {/* Summary table */}
            {visiblePanels.has("table") && (
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
    </div>
  );
}
