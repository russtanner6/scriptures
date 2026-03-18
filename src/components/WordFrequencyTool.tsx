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
  Legend
);

// Chart.js global defaults for dark theme
ChartJS.defaults.color = "#a1a1aa";
ChartJS.defaults.font.family = "'Inter', sans-serif";
ChartJS.defaults.font.size = 13;
ChartJS.defaults.font.weight = 500;

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
  const [volumeSelectOpen, setVolumeSelectOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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
        <div className="search-row">
          {/* Word input */}
          <div style={{ flex: "1 1 300px" }}>
            <label
              style={{
                display: "block",
                fontSize: "0.72rem",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                color: "var(--text-secondary)",
                marginBottom: "8px",
              }}
            >
              Word or phrase
            </label>
            <input
              ref={inputRef}
              type="text"
              value={word}
              onChange={(e) => setWord(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder='e.g. "Jesus", "faith", "repent"'
              style={{
                width: "100%",
                padding: "12px 16px",
                background: "var(--zinc-900)",
                border: "1px solid var(--border-accent)",
                borderRadius: "10px",
                color: "var(--text)",
                fontSize: "1rem",
                fontFamily: "inherit",
                outline: "none",
              }}
            />
          </div>

          {/* Volume selector */}
          <div className="volume-selector" style={{ position: "relative", flex: "0 0 auto" }}>
            <label
              style={{
                display: "block",
                fontSize: "0.72rem",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                color: "var(--text-secondary)",
                marginBottom: "8px",
              }}
            >
              Volumes
            </label>
            <button
              type="button"
              onClick={() => setVolumeSelectOpen(!volumeSelectOpen)}
              style={{
                padding: "12px 16px",
                background: "var(--zinc-900)",
                border: "1px solid var(--border-accent)",
                borderRadius: "10px",
                color: "var(--text)",
                fontSize: "0.92rem",
                fontFamily: "inherit",
                cursor: "pointer",
                minWidth: "180px",
                textAlign: "left",
                width: "100%",
              }}
            >
              {selectedVolumeIds.size === volumes.length
                ? "All volumes"
                : `${selectedVolumeIds.size} selected`}{" "}
              ▾
            </button>
            {volumeSelectOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  right: 0,
                  marginTop: "4px",
                  background: "var(--zinc-900)",
                  border: "1px solid var(--border-accent)",
                  borderRadius: "10px",
                  padding: "8px",
                  zIndex: 10,
                  minWidth: "220px",
                }}
              >
                {volumes.map((v) => (
                  <label
                    key={v.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "8px 10px",
                      cursor: "pointer",
                      fontSize: "0.88rem",
                      color: "var(--text-secondary)",
                      borderRadius: "6px",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background =
                        "var(--surface-hover)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    <input
                      type="checkbox"
                      checked={selectedVolumeIds.has(v.id)}
                      onChange={() => toggleVolume(v.id)}
                      style={{ accentColor: VOLUME_COLORS[v.abbrev] }}
                    />
                    <span
                      style={{
                        width: "6px",
                        height: "6px",
                        borderRadius: "50%",
                        background: VOLUME_COLORS[v.abbrev],
                      }}
                    />
                    {v.name}
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Toggles */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "6px",
              flex: "0 0 auto",
            }}
          >
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "0.82rem",
                color: "var(--text-secondary)",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={caseInsensitive}
                onChange={(e) => setCaseInsensitive(e.target.checked)}
                style={{ accentColor: "var(--accent)" }}
              />
              Case-insensitive
            </label>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "0.82rem",
                color: "var(--text-secondary)",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={wholeWord}
                onChange={(e) => setWholeWord(e.target.checked)}
                style={{ accentColor: "var(--accent)" }}
              />
              Whole word match
            </label>
          </div>

          {/* Search button */}
          <button
            onClick={handleSearch}
            disabled={!word.trim() || isLoading}
            style={{
              padding: "12px 32px",
              background:
                !word.trim() || isLoading
                  ? "var(--zinc-800)"
                  : "var(--accent)",
              color:
                !word.trim() || isLoading
                  ? "var(--text-muted)"
                  : "#fff",
              border: "none",
              borderRadius: "10px",
              fontSize: "0.92rem",
              fontWeight: 600,
              cursor:
                !word.trim() || isLoading ? "not-allowed" : "pointer",
              fontFamily: "inherit",
              transition: "background 0.2s",
              width: "100%",
            }}
          >
            {isLoading ? "Searching..." : "Analyze"}
          </button>
        </div>
      </div>

      {/* Close dropdown when clicking outside */}
      {volumeSelectOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 5,
          }}
          onClick={() => setVolumeSelectOpen(false)}
        />
      )}

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

          {/* Dashboard grid */}
          <div className="dashboard-grid">
            {/* Doughnut chart */}
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
                        borderColor: "#09090b",
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
                        position: typeof window !== "undefined" && window.innerWidth < 768 ? "bottom" : "right",
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

            {/* Horizontal bar by collection */}
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
                      {
                        data: volumeAgg.map((v) => v.count),
                        backgroundColor: volumeAgg.map(
                          (v) =>
                            v.count > 0
                              ? VOLUME_COLORS[v.abbrev]
                              : "#3f3f46"
                        ),
                        borderRadius: 8,
                        barThickness: 32,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    indexAxis: "y",
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        callbacks: {
                          label: (ctx) => ` ${ctx.raw} occurrences`,
                        },
                      },
                    },
                    scales: {
                      x: {
                        grid: { color: "rgba(255,255,255,0.04)" },
                        ticks: { font: { weight: 600 } },
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

            {/* Per-volume book breakdowns */}
            {volumeAgg
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
            {results.results.length > 0 && (
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
                          barThickness: 24,
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      indexAxis: "y",
                      plugins: {
                        legend: { display: false },
                        tooltip: {
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
                      },
                      scales: {
                        x: {
                          grid: { color: "rgba(255,255,255,0.04)" },
                          ticks: { font: { weight: 600 } },
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
            {results.results.some((r) => r.volumeAbbrev === "BoM") && (
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
                                color: "rgba(255,255,255,0.04)",
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
