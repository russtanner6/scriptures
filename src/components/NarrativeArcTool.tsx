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
import { Line } from "react-chartjs-2";
import type { Volume } from "@/lib/types";
import { VOLUME_COLORS, getContrastText } from "@/lib/constants";

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

const TERM_COLORS = [
  "#f59e0b", // amber
  "#3b82f6", // blue
  "#10b981", // emerald
  "#f43f5e", // rose
  "#06b6d4", // cyan
  "#a78bfa", // light violet
];

interface TermResult {
  term: string;
  color: string;
  data: { bookName: string; count: number }[];
}

export default function NarrativeArcTool() {
  const [volumes, setVolumes] = useState<Volume[]>([]);
  const [selectedVolumeId, setSelectedVolumeId] = useState<number | null>(null);
  const [terms, setTerms] = useState<string[]>([]);
  const [currentTerm, setCurrentTerm] = useState("");
  const [caseInsensitive, setCaseInsensitive] = useState(true);
  const [wholeWord, setWholeWord] = useState(true);
  const [results, setResults] = useState<TermResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load volumes on mount
  useEffect(() => {
    fetch("/api/books")
      .then((r) => r.json())
      .then((data) => {
        setVolumes(data.volumes);
        // Default to Book of Mormon
        const bom = data.volumes.find((v: Volume) => v.abbrev === "BoM");
        if (bom) setSelectedVolumeId(bom.id);
      });
  }, []);

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

  const selectedVolume = volumes.find((v) => v.id === selectedVolumeId);

  const handleAnalyze = useCallback(async () => {
    if (terms.length === 0 || !selectedVolume) return;
    setIsLoading(true);
    try {
      const newResults: TermResult[] = [];

      for (let i = 0; i < terms.length; i++) {
        const term = terms[i];
        const params = new URLSearchParams({
          word: term,
          caseInsensitive: String(caseInsensitive),
          wholeWord: String(wholeWord),
          volumeIds: String(selectedVolumeId),
        });
        const res = await fetch(`/api/word-frequency?${params}`);
        const data = await res.json();

        // Map results to book order within the selected volume
        const bookData = selectedVolume.books.map((b) => {
          const result = data.results.find(
            (r: { bookId: number }) => r.bookId === b.id
          );
          return { bookName: b.name, count: result?.count || 0 };
        });

        newResults.push({
          term,
          color: TERM_COLORS[i % TERM_COLORS.length],
          data: bookData,
        });
      }

      setResults(newResults);
    } finally {
      setIsLoading(false);
    }
  }, [terms, selectedVolume, selectedVolumeId, caseInsensitive, wholeWord]);

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
        <p style={{ color: "var(--text-secondary)", fontSize: "0.92rem" }}>
          Overlay multiple search terms on a single chart to see how themes flow
          through the books in narrative order.
        </p>
      </div>

      {/* Search panel */}
      <div className="search-panel">
        {/* Term input + add button */}
        <div
          style={{
            display: "flex",
            background: "var(--zinc-900)",
            border: "1px solid var(--border-accent)",
            borderRadius: "14px",
            overflow: "hidden",
            marginBottom: "16px",
          }}
        >
          <div
            style={{
              position: "relative",
              flex: 1,
              display: "flex",
              alignItems: "center",
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--text-muted)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                position: "absolute",
                left: "16px",
                pointerEvents: "none",
              }}
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={currentTerm}
              onChange={(e) => setCurrentTerm(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                terms.length >= 6
                  ? "Maximum 6 terms"
                  : "Add a search term..."
              }
              disabled={terms.length >= 6}
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
            onClick={addTerm}
            disabled={!currentTerm.trim() || terms.length >= 6}
            style={{
              padding: "14px 24px",
              background:
                !currentTerm.trim() || terms.length >= 6
                  ? "var(--zinc-800)"
                  : "linear-gradient(135deg, #8b5cf6, #a78bfa)",
              color:
                !currentTerm.trim() || terms.length >= 6
                  ? "var(--text-muted)"
                  : "#fff",
              border: "none",
              borderLeft: "1px solid var(--border)",
              fontSize: "0.88rem",
              fontWeight: 600,
              cursor:
                !currentTerm.trim() || terms.length >= 6
                  ? "not-allowed"
                  : "pointer",
              fontFamily: "inherit",
              transition: "background 0.2s",
              whiteSpace: "nowrap",
            }}
          >
            + Add
          </button>
        </div>

        {/* Term chips */}
        {terms.length > 0 && (
          <div
            style={{
              display: "flex",
              gap: "8px",
              flexWrap: "wrap",
              marginBottom: "16px",
            }}
          >
            {terms.map((term, i) => (
              <span
                key={term}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "6px 14px",
                  borderRadius: "8px",
                  background: TERM_COLORS[i % TERM_COLORS.length],
                  color: "#fff",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                }}
              >
                <span
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: "#fff",
                    opacity: 0.5,
                  }}
                />
                {term}
                <button
                  type="button"
                  onClick={() => removeTerm(term)}
                  style={{
                    background: "rgba(255,255,255,0.2)",
                    border: "none",
                    borderRadius: "50%",
                    width: "18px",
                    height: "18px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    color: "#fff",
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    lineHeight: 1,
                    padding: 0,
                  }}
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Volume selector — single select */}
        <div
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
            Volume
          </span>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {volumes.map((v) => {
              const isActive = v.id === selectedVolumeId;
              const color = VOLUME_COLORS[v.abbrev];
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setSelectedVolumeId(v.id)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "7px",
                    padding: "7px 14px",
                    borderRadius: "8px",
                    border: isActive
                      ? `1px solid ${color}`
                      : "1px solid rgba(255,255,255,0.15)",
                    background: isActive ? color : "rgba(255,255,255,0.06)",
                    color: isActive ? getContrastText(color) : "var(--text-secondary)",
                    fontSize: "0.8rem",
                    fontWeight: isActive ? 600 : 500,
                    fontFamily: "inherit",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  {v.abbrev === "D&C" ? "D&C" : v.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Options + Analyze */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            flexWrap: "wrap",
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
                ? "1px solid #8b5cf6"
                : "1px solid var(--border)",
              background: caseInsensitive ? "#8b5cf6" : "transparent",
              color: caseInsensitive ? "#fff" : "var(--text-muted)",
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
                ? "1px solid #8b5cf6"
                : "1px solid var(--border)",
              background: wholeWord ? "#8b5cf6" : "transparent",
              color: wholeWord ? "#fff" : "var(--text-muted)",
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

          <div style={{ flex: 1 }} />

          <button
            onClick={handleAnalyze}
            disabled={terms.length === 0 || isLoading}
            style={{
              padding: "8px 28px",
              background:
                terms.length === 0 || isLoading
                  ? "var(--zinc-800)"
                  : "linear-gradient(135deg, #8b5cf6, #a78bfa)",
              color:
                terms.length === 0 || isLoading
                  ? "var(--text-muted)"
                  : "#fff",
              border: "none",
              borderRadius: "8px",
              fontSize: "0.88rem",
              fontWeight: 600,
              cursor:
                terms.length === 0 || isLoading ? "not-allowed" : "pointer",
              fontFamily: "inherit",
              transition: "background 0.2s",
              whiteSpace: "nowrap",
            }}
          >
            {isLoading ? "Analyzing..." : "Analyze"}
          </button>
        </div>
      </div>

      {/* Chart */}
      {results.length > 0 && selectedVolume && (
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "10px",
            padding: "28px",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
          }}
        >
          <h3
            style={{
              fontSize: "0.88rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "var(--text)",
              marginBottom: "4px",
            }}
          >
            {selectedVolume.name} — Narrative Arc
          </h3>
          <p
            style={{
              fontSize: "0.85rem",
              color: "var(--text-secondary)",
              marginBottom: "24px",
            }}
          >
            Word frequency by book in narrative order
          </p>

          <div style={{ position: "relative", height: "420px" }}>
            <Line
              data={{
                labels: selectedVolume.books.map((b) => b.name),
                datasets: results.map((r) => ({
                  label: r.term,
                  data: r.data.map((d) => d.count),
                  fill: true,
                  backgroundColor: `${r.color}12`,
                  borderColor: r.color,
                  borderWidth: 2.5,
                  pointBackgroundColor: r.color,
                  pointBorderColor: r.color,
                  pointBorderWidth: 1,
                  pointRadius: 4,
                  pointHoverRadius: 7,
                  tension: 0.35,
                })),
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                ...({ clip: false } as Record<string, unknown>),
                interaction: {
                  mode: "index",
                  intersect: false,
                },
                plugins: {
                  legend: {
                    position: "top",
                    labels: {
                      padding: 20,
                      usePointStyle: true,
                      pointStyleWidth: 10,
                      font: { size: 13, weight: 600 },
                    },
                  },
                  tooltip: {
                    callbacks: {
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
                },
                layout: { padding: { top: 40 } },
                scales: {
                  y: {
                    grid: { color: "rgba(139,92,246,0.06)" },
                    ticks: { font: { weight: 600 } },
                    beginAtZero: true,
                  },
                  x: {
                    grid: { display: false },
                    ticks: {
                      maxRotation: 45,
                      font: { size: 11, weight: 500 },
                    },
                  },
                },
              }}
            />
          </div>

          {/* Summary table */}
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
                  <th
                    style={{
                      textAlign: "left",
                      padding: "8px 12px",
                      fontSize: "0.72rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      color: "var(--text-secondary)",
                      fontWeight: 600,
                      borderBottom: "1px solid var(--border)",
                    }}
                  >
                    Term
                  </th>
                  <th
                    style={{
                      textAlign: "right",
                      padding: "8px 12px",
                      fontSize: "0.72rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      color: "var(--text-secondary)",
                      fontWeight: 600,
                      borderBottom: "1px solid var(--border)",
                    }}
                  >
                    Total
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "8px 12px",
                      fontSize: "0.72rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      color: "var(--text-secondary)",
                      fontWeight: 600,
                      borderBottom: "1px solid var(--border)",
                    }}
                  >
                    Peak Book
                  </th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => {
                  const total = r.data.reduce((s, d) => s + d.count, 0);
                  const peak = r.data.reduce(
                    (best, d) => (d.count > best.count ? d : best),
                    r.data[0]
                  );
                  return (
                    <tr key={r.term}>
                      <td
                        style={{
                          padding: "8px 12px",
                          borderBottom: "1px solid rgba(139,92,246,0.06)",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <span
                          style={{
                            width: "10px",
                            height: "10px",
                            borderRadius: "50%",
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
                          borderBottom: "1px solid rgba(139,92,246,0.06)",
                        }}
                      >
                        {total.toLocaleString()}
                      </td>
                      <td
                        style={{
                          padding: "8px 12px",
                          color: "var(--text-secondary)",
                          borderBottom: "1px solid rgba(139,92,246,0.06)",
                        }}
                      >
                        {peak.bookName} ({peak.count})
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty state */}
      {results.length === 0 && !isLoading && (
        <div
          style={{
            textAlign: "center",
            padding: "80px 20px",
            color: "var(--text-muted)",
          }}
        >
          <div style={{ fontSize: "3rem", marginBottom: "16px" }}>📈</div>
          <div style={{ fontSize: "1.1rem", fontWeight: 500 }}>
            Add search terms above and click Analyze
          </div>
          <div
            style={{
              fontSize: "0.88rem",
              marginTop: "8px",
              color: "var(--text-muted)",
            }}
          >
            Try comparing &quot;faith&quot;, &quot;repentance&quot;, and
            &quot;grace&quot; across the Book of Mormon
          </div>
        </div>
      )}
    </div>
  );
}
