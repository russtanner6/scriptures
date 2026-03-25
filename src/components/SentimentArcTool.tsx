"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { usePreferencesContext } from "@/components/PreferencesProvider";
import { useIsMobile } from "@/lib/useIsMobile";
import { VOLUME_COLORS } from "@/lib/constants";
import { SENTIMENT_CATEGORIES } from "@/lib/sentiment-lexicon";
import { VOLUME_ABBREV_TO_SLUG, bookNameToSlug } from "@/lib/scripture-slugs";
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
import { Line } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, Filler, Tooltip, Legend);
ChartJS.defaults.color = "#9ca3af";

type DrillLevel = "volumes" | "books" | "chapters" | "verses";

interface VolumeSentiment {
  volumeId: number;
  volumeName: string;
  volumeAbbrev: string;
  scores: Record<string, number>;
  compositeScore: number;
  verseCount: number;
}

interface BookSentiment {
  bookId: number;
  bookName: string;
  scores: Record<string, number>;
  compositeScore: number;
  chapterCount: number;
}

interface ChapterSentiment {
  bookId: number;
  bookName: string;
  chapter: number;
  scores: Record<string, number>;
  compositeScore: number;
  lowConfidence: boolean;
}

interface VerseSentiment {
  verse: number;
  scores: Record<string, number>;
  compositeScore: number;
  smoothedScore: number;
  text: string;
}

export default function SentimentArcTool() {
  const { isVolumeVisible } = usePreferencesContext();
  const isMobile = useIsMobile();

  // Data state
  const [volumeData, setVolumeData] = useState<VolumeSentiment[]>([]);
  const [bookData, setBookData] = useState<BookSentiment[]>([]);
  const [chapterData, setChapterData] = useState<ChapterSentiment[]>([]);
  const [verseData, setVerseData] = useState<VerseSentiment[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Drill-down state
  const [drillLevel, setDrillLevel] = useState<DrillLevel>("volumes");
  const [selectedVolume, setSelectedVolume] = useState<{ id: number; name: string; abbrev: string } | null>(null);
  const [selectedBook, setSelectedBook] = useState<{ id: number; name: string } | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);

  // Category toggles
  const [activeCategories, setActiveCategories] = useState<Set<string>>(
    new Set(SENTIMENT_CATEGORIES.map((c) => c.id))
  );

  // Load volume-level data on mount
  useEffect(() => {
    setIsLoading(true);
    fetch("/api/sentiment?level=volumes")
      .then((r) => r.json())
      .then((data) => {
        setVolumeData((data.volumes || []).filter((v: VolumeSentiment) => isVolumeVisible(v.volumeAbbrev)));
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, [isVolumeVisible]);

  // Drill into volume
  const drillToVolume = useCallback(async (vol: VolumeSentiment) => {
    setSelectedVolume({ id: vol.volumeId, name: vol.volumeName, abbrev: vol.volumeAbbrev });
    setDrillLevel("books");
    setIsLoading(true);
    try {
      const res = await fetch(`/api/sentiment?level=books&volumeId=${vol.volumeId}`);
      const data = await res.json();
      setBookData(data.books || []);
    } catch { setBookData([]); }
    setIsLoading(false);
  }, []);

  // Drill into book
  const drillToBook = useCallback(async (book: BookSentiment) => {
    setSelectedBook({ id: book.bookId, name: book.bookName });
    setDrillLevel("chapters");
    setIsLoading(true);
    try {
      const res = await fetch(`/api/sentiment?level=chapters&bookId=${book.bookId}`);
      const data = await res.json();
      setChapterData(data.chapters || []);
    } catch { setChapterData([]); }
    setIsLoading(false);
  }, []);

  // Drill into chapter
  const drillToChapter = useCallback(async (ch: ChapterSentiment) => {
    setSelectedChapter(ch.chapter);
    setDrillLevel("verses");
    setIsLoading(true);
    try {
      const res = await fetch(`/api/sentiment?level=verses&bookId=${ch.bookId}&chapter=${ch.chapter}`);
      const data = await res.json();
      setVerseData(data.verses || []);
    } catch { setVerseData([]); }
    setIsLoading(false);
  }, []);

  // Go back
  const goBack = () => {
    if (drillLevel === "verses") {
      setDrillLevel("chapters");
      setSelectedChapter(null);
      setVerseData([]);
    } else if (drillLevel === "chapters") {
      setDrillLevel("books");
      setSelectedBook(null);
      setChapterData([]);
    } else if (drillLevel === "books") {
      setDrillLevel("volumes");
      setSelectedVolume(null);
      setBookData([]);
    }
  };

  // Toggle category
  const toggleCategory = (catId: string) => {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) {
        if (next.size > 1) next.delete(catId);
      } else {
        next.add(catId);
      }
      return next;
    });
  };

  // Get current volume color
  const volColor = selectedVolume ? (VOLUME_COLORS[selectedVolume.abbrev] || "#888") : "#FFD700";

  // Build verse URL
  const getVerseUrl = (verse: VerseSentiment) => {
    if (!selectedVolume || !selectedBook || !selectedChapter) return "#";
    const volSlug = VOLUME_ABBREV_TO_SLUG[selectedVolume.abbrev];
    const bookSlug = bookNameToSlug(selectedBook.name);
    return `/scriptures/${volSlug}/${bookSlug}/${selectedChapter}?verse=${verse.verse}`;
  };

  // Chart options shared across levels
  const baseChartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      datalabels: { display: false },
      tooltip: {
        callbacks: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          label: (ctx: any) =>
            `${ctx.dataset?.label || ""}: ${ctx.parsed?.y?.toFixed(1) || 0}`,
        },
      },
    },
    scales: {
      y: {
        grid: { color: "rgba(255,255,255,0.06)" },
        title: { display: true, text: "Sentiment Score", color: "#9ca3af" as string },
      },
      x: {
        grid: { display: false },
        ticks: {
          maxRotation: 90,
          minRotation: isMobile ? 45 : 0,
          font: { size: isMobile ? 9 : 11 },
        },
      },
    },
  }), [isMobile]);

  // Build datasets for active categories
  const buildDatasets = (labels: string[], dataByCategory: Record<string, number[]>) => {
    return SENTIMENT_CATEGORIES
      .filter((cat) => activeCategories.has(cat.id))
      .map((cat) => ({
        label: cat.label,
        data: dataByCategory[cat.id] || labels.map(() => 0),
        borderColor: cat.color,
        backgroundColor: `${cat.color}20`,
        fill: true,
        tension: 0.4,
        pointRadius: isMobile ? 1 : 2,
        pointHoverRadius: 4,
        borderWidth: 2,
      }));
  };

  return (
    <div style={{ paddingBottom: "60px" }}>
      {/* Header */}
      <div style={{ maxWidth: "700px", margin: "0 auto", textAlign: "center", marginBottom: "32px" }}>
        <h1 style={{ fontSize: isMobile ? "1.4rem" : "1.8rem", fontWeight: 800, color: "var(--text)", marginBottom: "8px", letterSpacing: "0.02em" }}>
          Sentiment Explorer
        </h1>
        <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", marginBottom: "24px", lineHeight: 1.5 }}>
          Explore the emotional tone of scripture — from exaltation and peace to admonition and contrition. Drill down from volumes to individual verses.
        </p>

        {/* Category toggles */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "center", marginBottom: "16px" }}>
          {SENTIMENT_CATEGORIES.map((cat) => {
            const active = activeCategories.has(cat.id);
            return (
              <button
                key={cat.id}
                onClick={() => toggleCategory(cat.id)}
                style={{
                  padding: "6px 14px",
                  borderRadius: "20px",
                  border: `1.5px solid ${active ? cat.color : "var(--border)"}`,
                  background: active ? `${cat.color}18` : "transparent",
                  color: active ? cat.color : "var(--text-muted)",
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  transition: "all 0.15s",
                }}
              >
                <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", background: cat.color, marginRight: "6px", opacity: active ? 1 : 0.3 }} />
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
          Analyzing...
        </div>
      )}

      {/* Breadcrumb */}
      {drillLevel !== "volumes" && (
        <div style={{ maxWidth: "900px", margin: "0 auto 16px", display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            onClick={goBack}
            style={{
              background: "none",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              padding: "6px 12px",
              color: "var(--text-secondary)",
              fontSize: "0.78rem",
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            ← Back
          </button>
          <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
            {selectedVolume?.name}
            {selectedBook && ` → ${selectedBook.name}`}
            {selectedChapter && ` → Chapter ${selectedChapter}`}
          </span>
        </div>
      )}

      {/* ── LEVEL 1: Volume Overview ── */}
      {!isLoading && drillLevel === "volumes" && volumeData.length > 0 && (
        <div style={{ maxWidth: "900px", margin: "0 auto", marginBottom: "32px" }}>
          {/* Drill-down pills */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "center", marginBottom: "20px" }}>
            <span style={{ fontSize: "0.72rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", alignSelf: "center", marginRight: "4px" }}>
              Drill into:
            </span>
            {volumeData.map((vol) => (
              <button
                key={vol.volumeId}
                onClick={() => drillToVolume(vol)}
                style={{
                  padding: "6px 14px",
                  borderRadius: "8px",
                  border: `1px solid ${VOLUME_COLORS[vol.volumeAbbrev]}50`,
                  background: `${VOLUME_COLORS[vol.volumeAbbrev]}15`,
                  color: VOLUME_COLORS[vol.volumeAbbrev],
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  transition: "all 0.15s",
                }}
              >
                {vol.volumeName}
              </button>
            ))}
          </div>

          <div style={{ height: isMobile ? "280px" : "360px" }}>
            <Line
              data={{
                labels: volumeData.map((v) => v.volumeAbbrev),
                datasets: buildDatasets(
                  volumeData.map((v) => v.volumeAbbrev),
                  Object.fromEntries(
                    SENTIMENT_CATEGORIES.map((cat) => [
                      cat.id,
                      volumeData.map((v) => v.scores[cat.id] || 0),
                    ])
                  )
                ),
              }}
              options={baseChartOptions}
            />
          </div>
        </div>
      )}

      {/* ── LEVEL 2: Book Drill-Down ── */}
      {!isLoading && drillLevel === "books" && bookData.length > 0 && (
        <div style={{ maxWidth: "900px", margin: "0 auto", marginBottom: "32px" }}>
          {/* Book pills */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", justifyContent: "center", marginBottom: "20px" }}>
            <span style={{ fontSize: "0.72rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", alignSelf: "center", marginRight: "4px" }}>
              Drill into:
            </span>
            {bookData.map((book) => (
              <button
                key={book.bookId}
                onClick={() => drillToBook(book)}
                style={{
                  padding: "4px 10px",
                  borderRadius: "6px",
                  border: `1px solid ${volColor}30`,
                  background: "transparent",
                  color: "var(--text-secondary)",
                  fontSize: "0.72rem",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                {book.bookName}
              </button>
            ))}
          </div>

          <div style={{ height: isMobile ? "300px" : "400px" }}>
            <Line
              data={{
                labels: bookData.map((b) => b.bookName),
                datasets: buildDatasets(
                  bookData.map((b) => b.bookName),
                  Object.fromEntries(
                    SENTIMENT_CATEGORIES.map((cat) => [
                      cat.id,
                      bookData.map((b) => b.scores[cat.id] || 0),
                    ])
                  )
                ),
              }}
              options={{
                ...baseChartOptions,
                scales: {
                  ...baseChartOptions.scales,
                  x: {
                    ...baseChartOptions.scales.x,
                    ticks: { ...baseChartOptions.scales.x.ticks, maxRotation: 90, minRotation: 45 },
                  },
                },
              }}
            />
          </div>
        </div>
      )}

      {/* ── LEVEL 3: Chapter Drill-Down ── */}
      {!isLoading && drillLevel === "chapters" && chapterData.length > 0 && (
        <div style={{ maxWidth: "900px", margin: "0 auto", marginBottom: "32px" }}>
          <div style={{ height: isMobile ? "280px" : "360px", marginBottom: "24px" }}>
            <Line
              data={{
                labels: chapterData.map((c) => `${c.chapter}`),
                datasets: buildDatasets(
                  chapterData.map((c) => `${c.chapter}`),
                  Object.fromEntries(
                    SENTIMENT_CATEGORIES.map((cat) => [
                      cat.id,
                      chapterData.map((c) => c.scores[cat.id] || 0),
                    ])
                  )
                ),
              }}
              options={{
                ...baseChartOptions,
                scales: {
                  ...baseChartOptions.scales,
                  x: {
                    ...baseChartOptions.scales.x,
                    title: { display: true, text: selectedVolume?.abbrev === "D&C" ? "Section" : "Chapter", color: "#9ca3af" },
                    ticks: {
                      font: { size: 10 },
                      callback: function (val: string | number, index: number, ticks: unknown[]) {
                        const total = (ticks as unknown[]).length;
                        if (total <= 20) return val;
                        if (index === 0 || index === total - 1 || index === Math.floor(total / 2)) return val;
                        if (total > 50 && index % 10 === 0) return val;
                        if (total <= 50 && index % 5 === 0) return val;
                        return "";
                      },
                    },
                  },
                },
                onClick: (_event: unknown, elements: unknown[]) => {
                  const els = elements as { index: number }[];
                  if (els.length > 0) {
                    const ch = chapterData[els[0].index];
                    if (ch) drillToChapter(ch);
                  }
                },
              }}
            />
          </div>

          {/* Top sentiment chapters */}
          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", justifyContent: "center" }}>
            {(() => {
              const sorted = [...chapterData].sort((a, b) => b.compositeScore - a.compositeScore);
              const top3 = sorted.slice(0, 3);
              const bottom3 = sorted.slice(-3).reverse();
              return (
                <>
                  <div>
                    <div style={{ fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", color: "#FFD700", marginBottom: "6px" }}>Most Positive</div>
                    {top3.map((ch) => (
                      <button key={ch.chapter} onClick={() => drillToChapter(ch)} style={{ display: "block", background: "none", border: "none", color: "var(--text-secondary)", fontSize: "0.78rem", cursor: "pointer", fontFamily: "inherit", padding: "2px 0" }}>
                        {ch.bookName} {ch.chapter} ({ch.compositeScore > 0 ? "+" : ""}{ch.compositeScore})
                      </button>
                    ))}
                  </div>
                  <div>
                    <div style={{ fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", color: "#4B0082", marginBottom: "6px" }}>Most Intense</div>
                    {bottom3.map((ch) => (
                      <button key={ch.chapter} onClick={() => drillToChapter(ch)} style={{ display: "block", background: "none", border: "none", color: "var(--text-secondary)", fontSize: "0.78rem", cursor: "pointer", fontFamily: "inherit", padding: "2px 0" }}>
                        {ch.bookName} {ch.chapter} ({ch.compositeScore > 0 ? "+" : ""}{ch.compositeScore})
                      </button>
                    ))}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* ── LEVEL 4: Verse Drill-Down ── */}
      {!isLoading && drillLevel === "verses" && verseData.length > 0 && (
        <div style={{ maxWidth: "900px", margin: "0 auto", marginBottom: "32px" }}>
          <div style={{ height: isMobile ? "240px" : "300px", marginBottom: "24px" }}>
            <Line
              data={{
                labels: verseData.map((v) => `${v.verse}`),
                datasets: [{
                  label: "Smoothed Sentiment",
                  data: verseData.map((v) => v.smoothedScore),
                  borderColor: "#FFD700",
                  backgroundColor: (context: { chart: ChartJS; dataIndex: number }) => {
                    const chart = context.chart;
                    const { ctx, chartArea } = chart;
                    if (!chartArea) return "rgba(255,215,0,0.1)";
                    const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                    gradient.addColorStop(0, "rgba(255, 215, 0, 0.3)");
                    gradient.addColorStop(0.5, "rgba(255, 215, 0, 0.05)");
                    gradient.addColorStop(1, "rgba(75, 0, 130, 0.3)");
                    return gradient;
                  },
                  fill: true,
                  tension: 0.4,
                  pointRadius: 1,
                  pointHoverRadius: 4,
                  borderWidth: 2,
                }],
              }}
              options={{
                ...baseChartOptions,
                scales: {
                  ...baseChartOptions.scales,
                  x: {
                    ...baseChartOptions.scales.x,
                    title: { display: true, text: "Verse", color: "#9ca3af" },
                    ticks: {
                      font: { size: 9 },
                      callback: function (val: string | number, index: number, ticks: unknown[]) {
                        const total = (ticks as unknown[]).length;
                        if (index === 0 || index === total - 1 || index === Math.floor(total / 2)) return val;
                        return "";
                      },
                    },
                  },
                },
              }}
            />
          </div>

          {/* Verse list */}
          <div style={{ maxWidth: "700px", margin: "0 auto" }}>
            {verseData.map((v) => {
              const dominant = (() => {
                let best = { id: "", score: 0 };
                for (const cat of SENTIMENT_CATEGORIES) {
                  if ((v.scores[cat.id] || 0) > best.score) {
                    best = { id: cat.id, score: v.scores[cat.id] };
                  }
                }
                return best.id ? SENTIMENT_CATEGORIES.find((c) => c.id === best.id) : null;
              })();

              return (
                <a
                  key={v.verse}
                  href={getVerseUrl(v)}
                  style={{
                    display: "block",
                    padding: "10px 14px",
                    marginBottom: "6px",
                    borderRadius: "8px",
                    background: "var(--surface)",
                    border: `1px solid ${dominant ? `${dominant.color}30` : "var(--border)"}`,
                    borderLeft: dominant ? `3px solid ${dominant.color}` : undefined,
                    textDecoration: "none",
                    transition: "all 0.15s",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                    <span style={{ fontSize: "0.75rem", fontWeight: 700, color: dominant?.color || "var(--text-muted)" }}>
                      Verse {v.verse}
                    </span>
                    <span style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>
                      {v.compositeScore > 0 ? "+" : ""}{v.compositeScore}
                    </span>
                  </div>
                  <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                    {v.text}{v.text.length >= 150 ? "..." : ""}
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && drillLevel === "volumes" && volumeData.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px", color: "var(--text-muted)" }}>
          No sentiment data available. Enable volumes in Settings.
        </div>
      )}
    </div>
  );
}
