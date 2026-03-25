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

// Shared dropdown style
const selectStyle: React.CSSProperties = {
  padding: "8px 32px 8px 12px",
  borderRadius: "8px",
  border: "1px solid var(--border)",
  background: "var(--surface)",
  color: "var(--text)",
  fontSize: "0.85rem",
  fontFamily: "inherit",
  fontWeight: 600,
  cursor: "pointer",
  appearance: "none",
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M2 4l4 4 4-4' stroke='%239ca3af' stroke-width='1.5' fill='none'/%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 10px center",
  minWidth: "140px",
};

export default function SentimentArcTool() {
  const { isVolumeVisible } = usePreferencesContext();
  const isMobile = useIsMobile();

  // Data
  const [volumeData, setVolumeData] = useState<VolumeSentiment[]>([]);
  const [bookData, setBookData] = useState<BookSentiment[]>([]);
  const [chapterData, setChapterData] = useState<ChapterSentiment[]>([]);
  const [verseData, setVerseData] = useState<VerseSentiment[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Selections
  const [selectedVolumeIdx, setSelectedVolumeIdx] = useState<number>(0);
  const [selectedBookIdx, setSelectedBookIdx] = useState<number>(-1); // -1 = not selected
  const [selectedChapterIdx, setSelectedChapterIdx] = useState<number>(-1);

  // Category toggles
  const [activeCategories, setActiveCategories] = useState<Set<string>>(
    new Set(SENTIMENT_CATEGORIES.map((c) => c.id))
  );

  // Current derived state
  const selectedVolume = volumeData[selectedVolumeIdx] || null;
  const selectedBook = selectedBookIdx >= 0 ? bookData[selectedBookIdx] : null;
  const selectedChapter = selectedChapterIdx >= 0 ? chapterData[selectedChapterIdx] : null;

  // What level of chart are we showing?
  const chartLevel = selectedChapterIdx >= 0 ? "verses" : selectedBookIdx >= 0 ? "chapters" : "books";

  // Load volumes on mount, then auto-load first volume's books
  useEffect(() => {
    setIsLoading(true);
    fetch("/api/sentiment?level=volumes")
      .then((r) => r.json())
      .then((data) => {
        const vols = (data.volumes || []).filter((v: VolumeSentiment) => isVolumeVisible(v.volumeAbbrev));
        setVolumeData(vols);
        setIsLoading(false);
        // Auto-load first volume's books
        if (vols.length > 0) {
          loadBooks(vols[0].volumeId);
        }
      })
      .catch(() => setIsLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVolumeVisible]);

  // Load books for a volume
  const loadBooks = useCallback(async (volumeId: number) => {
    setIsLoading(true);
    setBookData([]);
    setChapterData([]);
    setVerseData([]);
    setSelectedBookIdx(-1);
    setSelectedChapterIdx(-1);
    try {
      const res = await fetch(`/api/sentiment?level=books&volumeId=${volumeId}`);
      const data = await res.json();
      setBookData(data.books || []);
    } catch { setBookData([]); }
    setIsLoading(false);
  }, []);

  // Load chapters for a book
  const loadChapters = useCallback(async (bookId: number) => {
    setIsLoading(true);
    setChapterData([]);
    setVerseData([]);
    setSelectedChapterIdx(-1);
    try {
      const res = await fetch(`/api/sentiment?level=chapters&bookId=${bookId}`);
      const data = await res.json();
      setChapterData(data.chapters || []);
    } catch { setChapterData([]); }
    setIsLoading(false);
  }, []);

  // Load verses for a chapter (no chart — just list)
  const loadVerses = useCallback(async (bookId: number, chapter: number) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/sentiment?level=verses&bookId=${bookId}&chapter=${chapter}`);
      const data = await res.json();
      setVerseData(data.verses || []);
    } catch { setVerseData([]); }
    setIsLoading(false);
  }, []);

  // Volume changed
  const handleVolumeChange = (idx: number) => {
    setSelectedVolumeIdx(idx);
    const vol = volumeData[idx];
    if (vol) loadBooks(vol.volumeId);
  };

  // Book changed
  const handleBookChange = (idx: number) => {
    setSelectedBookIdx(idx);
    if (idx >= 0) {
      const book = bookData[idx];
      if (book) loadChapters(book.bookId);
    } else {
      setChapterData([]);
      setVerseData([]);
      setSelectedChapterIdx(-1);
    }
  };

  // Chapter changed
  const handleChapterChange = (idx: number) => {
    setSelectedChapterIdx(idx);
    if (idx >= 0 && selectedBook) {
      const ch = chapterData[idx];
      if (ch) loadVerses(ch.bookId, ch.chapter);
    } else {
      setVerseData([]);
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

  // Volume color
  const volColor = selectedVolume ? (VOLUME_COLORS[selectedVolume.volumeAbbrev] || "#888") : "#FFD700";

  // Build verse URL
  const getVerseUrl = (verse: VerseSentiment) => {
    if (!selectedVolume || !selectedBook || !selectedChapter) return "#";
    const volSlug = VOLUME_ABBREV_TO_SLUG[selectedVolume.volumeAbbrev];
    const bookSlug = bookNameToSlug(selectedBook.bookName);
    return `/scriptures/${volSlug}/${bookSlug}/${selectedChapter.chapter}?verse=${verse.verse}`;
  };

  // Chart options
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

  // Current chart data
  const chartData = useMemo(() => {
    if (chartLevel === "books" && bookData.length > 0) {
      return {
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
      };
    }
    if (chartLevel === "chapters" && chapterData.length > 0) {
      return {
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
      };
    }
    return null;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartLevel, bookData, chapterData, activeCategories]);

  return (
    <div style={{ paddingBottom: "60px" }}>
      {/* Header */}
      <div style={{ maxWidth: "700px", margin: "0 auto", textAlign: "center", marginBottom: "24px" }}>
        <h1 style={{ fontSize: isMobile ? "1.4rem" : "1.8rem", fontWeight: 800, color: "var(--text)", marginBottom: "8px", letterSpacing: "0.02em" }}>
          Sentiment Explorer
        </h1>
        <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", marginBottom: "20px", lineHeight: 1.5 }}>
          Explore the emotional tone of scripture. Select a volume, then drill into books and chapters.
        </p>

        {/* Category toggles */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "center", marginBottom: "20px" }}>
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

        {/* Cascading dropdowns */}
        <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
          {/* Volume dropdown */}
          <select
            value={selectedVolumeIdx}
            onChange={(e) => handleVolumeChange(Number(e.target.value))}
            style={{ ...selectStyle, borderColor: `${volColor}60` }}
          >
            {volumeData.map((vol, i) => (
              <option key={vol.volumeId} value={i}>{vol.volumeName}</option>
            ))}
          </select>

          {/* Book dropdown */}
          {bookData.length > 0 && (
            <select
              value={selectedBookIdx}
              onChange={(e) => handleBookChange(Number(e.target.value))}
              style={selectStyle}
            >
              <option value={-1}>— All Books —</option>
              {bookData.map((book, i) => (
                <option key={book.bookId} value={i}>{book.bookName}</option>
              ))}
            </select>
          )}

          {/* Chapter dropdown (only when book selected) */}
          {selectedBookIdx >= 0 && chapterData.length > 0 && (
            <select
              value={selectedChapterIdx}
              onChange={(e) => handleChapterChange(Number(e.target.value))}
              style={selectStyle}
            >
              <option value={-1}>— All {selectedVolume?.volumeAbbrev === "D&C" ? "Sections" : "Chapters"} —</option>
              {chapterData.map((ch, i) => (
                <option key={ch.chapter} value={i}>
                  {selectedVolume?.volumeAbbrev === "D&C" ? "Section" : "Chapter"} {ch.chapter}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
          Analyzing...
        </div>
      )}

      {/* Chart (book or chapter level only — no verse chart) */}
      {!isLoading && chartData && chartLevel !== "verses" && (
        <div style={{ maxWidth: "900px", margin: "0 auto", marginBottom: "32px" }}>
          <div style={{ height: isMobile ? "300px" : "400px" }}>
            <Line
              data={chartData}
              options={{
                ...baseChartOptions,
                scales: {
                  ...baseChartOptions.scales,
                  x: {
                    ...baseChartOptions.scales.x,
                    ...(chartLevel === "chapters" ? {
                      title: { display: true, text: selectedVolume?.volumeAbbrev === "D&C" ? "Section" : "Chapter", color: "#9ca3af" },
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
                    } : {
                      ticks: { maxRotation: 90, minRotation: 45, font: { size: isMobile ? 9 : 11 } },
                    }),
                  },
                },
              }}
            />
          </div>

          {/* Top/bottom chapters (only at chapter level) */}
          {chartLevel === "chapters" && chapterData.length > 3 && (
            <div style={{ display: "flex", gap: "24px", flexWrap: "wrap", justifyContent: "center", marginTop: "20px" }}>
              {(() => {
                const sorted = [...chapterData].sort((a, b) => b.compositeScore - a.compositeScore);
                const top3 = sorted.slice(0, 3);
                const bottom3 = sorted.slice(-3).reverse();
                return (
                  <>
                    <div>
                      <div style={{ fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", color: "#FFD700", marginBottom: "6px" }}>Most Positive</div>
                      {top3.map((ch) => (
                        <button
                          key={ch.chapter}
                          onClick={() => {
                            const idx = chapterData.findIndex((c) => c.chapter === ch.chapter);
                            handleChapterChange(idx);
                          }}
                          style={{ display: "block", background: "none", border: "none", color: "var(--text-secondary)", fontSize: "0.78rem", cursor: "pointer", fontFamily: "inherit", padding: "2px 0" }}
                        >
                          {selectedVolume?.volumeAbbrev === "D&C" ? "Section" : "Chapter"} {ch.chapter} ({ch.compositeScore > 0 ? "+" : ""}{ch.compositeScore})
                        </button>
                      ))}
                    </div>
                    <div>
                      <div style={{ fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", color: "#4B0082", marginBottom: "6px" }}>Most Intense</div>
                      {bottom3.map((ch) => (
                        <button
                          key={ch.chapter}
                          onClick={() => {
                            const idx = chapterData.findIndex((c) => c.chapter === ch.chapter);
                            handleChapterChange(idx);
                          }}
                          style={{ display: "block", background: "none", border: "none", color: "var(--text-secondary)", fontSize: "0.78rem", cursor: "pointer", fontFamily: "inherit", padding: "2px 0" }}
                        >
                          {selectedVolume?.volumeAbbrev === "D&C" ? "Section" : "Chapter"} {ch.chapter} ({ch.compositeScore > 0 ? "+" : ""}{ch.compositeScore})
                        </button>
                      ))}
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* Verse list (chapter selected — no chart, just references) */}
      {!isLoading && chartLevel === "verses" && verseData.length > 0 && (
        <div style={{ maxWidth: "700px", margin: "0 auto", marginBottom: "32px" }}>
          <div style={{ textAlign: "center", marginBottom: "16px", fontSize: "0.82rem", color: "var(--text-muted)" }}>
            {verseData.length} verses in {selectedBook?.bookName} {selectedChapter?.chapter}
          </div>
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
                  {dominant && (
                    <span style={{ fontSize: "0.65rem", color: dominant.color, opacity: 0.7 }}>
                      {dominant.label}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                  {v.text}{v.text.length >= 150 ? "..." : ""}
                </div>
              </a>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && volumeData.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px", color: "var(--text-muted)" }}>
          No sentiment data available. Enable volumes in Settings.
        </div>
      )}
    </div>
  );
}
