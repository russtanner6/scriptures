"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import type { Volume } from "@/lib/types";
import { VOLUME_COLORS } from "@/lib/constants";

interface WordCloudItem {
  word: string;
  count: number;
  weight: number;
}

interface WordCloudData {
  bookName: string;
  volumeAbbrev: string;
  chapterLabel: string;
  totalWords: number;
  words: WordCloudItem[];
}

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

// Shuffle array deterministically using a seed
function seededShuffle<T>(arr: T[], seed: number): T[] {
  const result = [...arr];
  let s = seed;
  for (let i = result.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export default function WordCloudTool() {
  const isMobile = useIsMobile();
  const searchParams = useSearchParams();
  const [volumes, setVolumes] = useState<Volume[]>([]);
  const [selectedVolume, setSelectedVolume] = useState<string | null>(null);
  const [selectedBookId, setSelectedBookId] = useState<number | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [data, setData] = useState<WordCloudData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hoveredWord, setHoveredWord] = useState<string | null>(null);
  const [wordLimit, setWordLimit] = useState(60);

  // Load volumes + handle deep link
  useEffect(() => {
    fetch("/api/books")
      .then((r) => r.json())
      .then((d) => {
        const vols = d.volumes;
        setVolumes(vols);
        // Deep link: ?bookId=X or ?bookId=X&chapter=Y
        const urlBookId = searchParams.get("bookId");
        const urlChapter = searchParams.get("chapter");
        if (urlBookId) {
          const bid = Number(urlBookId);
          for (const vol of vols) {
            const book = vol.books.find((b: { id: number }) => b.id === bid);
            if (book) {
              setSelectedVolume(vol.abbrev);
              setSelectedBookId(bid);
              if (urlChapter) setSelectedChapter(Number(urlChapter));
              break;
            }
          }
        }
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Get selected volume and book info
  const selectedVol = volumes.find((v) => v.abbrev === selectedVolume);
  const selectedBook = selectedVol?.books.find((b) => b.id === selectedBookId);

  // Fetch word cloud data (supports both book-level and volume-level)
  const fetchCloud = useCallback(async () => {
    if (!selectedBookId && !selectedVol) return;
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(wordLimit) });
      if (selectedBookId === -1 && selectedVol) {
        // Volume-level cloud
        params.set("volumeId", String(selectedVol.id));
      } else if (selectedBookId && selectedBookId > 0) {
        params.set("bookId", String(selectedBookId));
        if (selectedChapter) params.set("chapter", String(selectedChapter));
      } else {
        setIsLoading(false);
        return;
      }
      const res = await fetch(`/api/word-cloud?${params}`);
      const d = await res.json();
      setData(d);
    } finally {
      setIsLoading(false);
    }
  }, [selectedBookId, selectedChapter, wordLimit, selectedVol]);

  // Auto-fetch when selection changes + update URL
  useEffect(() => {
    if (selectedBookId) {
      fetchCloud();
      const url = new URL(window.location.href);
      if (selectedBookId === -1) {
        url.searchParams.delete("bookId");
        url.searchParams.delete("chapter");
      } else {
        url.searchParams.set("bookId", String(selectedBookId));
        if (selectedChapter) url.searchParams.set("chapter", String(selectedChapter));
        else url.searchParams.delete("chapter");
      }
      window.history.replaceState({}, "", url.toString());
    }
  }, [selectedBookId, selectedChapter, fetchCloud]);

  // Volume color for the selected book
  const volColor = selectedVolume ? VOLUME_COLORS[selectedVolume] || "#3B82F6" : "#8b5cf6";

  // Shuffle words for visual variety but keep it stable
  const displayWords = useMemo(() => {
    if (!data?.words) return [];
    return seededShuffle(data.words, selectedBookId || 0);
  }, [data?.words, selectedBookId]);

  // Size mapping: weight (0-1) to font size
  const getWordSize = (weight: number) => {
    const minSize = isMobile ? 0.65 : 0.75;
    const maxSize = isMobile ? 2.2 : 3;
    return minSize + weight * (maxSize - minSize);
  };

  // Opacity mapping
  const getWordOpacity = (weight: number) => {
    return 0.4 + weight * 0.6;
  };

  return (
    <div>
      {/* Title */}
      <div style={{ marginBottom: "24px" }}>
        <h2
          style={{
            fontSize: "1.4rem",
            fontWeight: 700,
            color: "var(--text)",
            marginBottom: "6px",
          }}
        >
          <img
            src="/word-cloud.svg"
            alt=""
            style={{
              display: "inline-block",
              width: isMobile ? "22px" : "26px",
              height: isMobile ? "22px" : "26px",
              verticalAlign: "middle",
              marginRight: "10px",
              filter: "invert(1) brightness(0.85)",
            }}
          />
          Word Cloud
        </h2>
        <p style={{ color: "var(--text-secondary)", fontSize: isMobile ? "0.85rem" : "0.92rem" }}>
          Visualize the most frequent words in any book or chapter.
          Select a volume, then a book to generate the cloud.
        </p>
      </div>

      {/* Controls */}
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "12px",
          padding: isMobile ? "16px" : "20px 24px",
          marginBottom: "24px",
        }}
      >
        {/* Volume selector */}
        <div style={{ marginBottom: "16px" }}>
          <div
            style={{
              fontSize: "0.72rem",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--text-muted)",
              marginBottom: "8px",
            }}
          >
            VOLUME
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {volumes.map((vol) => {
              const color = VOLUME_COLORS[vol.abbrev] || "#3B82F6";
              const isSelected = selectedVolume === vol.abbrev;
              return (
                <button
                  key={vol.id}
                  onClick={() => {
                    setSelectedVolume(vol.abbrev);
                    setSelectedBookId(null);
                    setSelectedChapter(null);
                    setData(null);
                  }}
                  style={{
                    background: isSelected ? color : "transparent",
                    border: `1px solid ${isSelected ? color : "var(--border)"}`,
                    borderRadius: "6px",
                    padding: "6px 12px",
                    fontSize: "0.82rem",
                    fontWeight: isSelected ? 600 : 400,
                    color: isSelected ? "#fff" : "var(--text-secondary)",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    transition: "all 0.15s",
                  }}
                >
                  {vol.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Book selector */}
        {selectedVol && (
          <div style={{ marginBottom: "16px" }}>
            <div
              style={{
                fontSize: "0.72rem",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "var(--text-muted)",
                marginBottom: "8px",
              }}
            >
              BOOK
            </div>
            <select
              value={selectedBookId || ""}
              onChange={(e) => {
                const id = Number(e.target.value);
                setSelectedBookId(id || null);
                setSelectedChapter(null);
              }}
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                color: "var(--text)",
                padding: "8px 12px",
                fontSize: "0.88rem",
                fontFamily: "inherit",
                cursor: "pointer",
                outline: "none",
                width: isMobile ? "100%" : "auto",
                minWidth: "200px",
              }}
            >
              <option value="">Select a book...</option>
              <option value={-1}>★ Entire {selectedVol.name}</option>
              {selectedVol.books.map((book) => (
                <option key={book.id} value={book.id}>
                  {book.name} ({book.chapterCount} {selectedVolume === "D&C" ? "sec" : "ch"})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Chapter selector (optional) */}
        {selectedBook && selectedBookId !== -1 && selectedBook.chapterCount > 1 && (
          <div style={{ marginBottom: "16px" }}>
            <div
              style={{
                fontSize: "0.72rem",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "var(--text-muted)",
                marginBottom: "8px",
              }}
            >
              {selectedVolume === "D&C" ? "SECTION" : "CHAPTER"} (optional)
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <select
                value={selectedChapter || ""}
                onChange={(e) => {
                  const ch = Number(e.target.value);
                  setSelectedChapter(ch || null);
                }}
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  color: "var(--text)",
                  padding: "8px 12px",
                  fontSize: "0.88rem",
                  fontFamily: "inherit",
                  cursor: "pointer",
                  outline: "none",
                }}
              >
                <option value="">All {selectedVolume === "D&C" ? "sections" : "chapters"}</option>
                {Array.from({ length: selectedBook.chapterCount }, (_, i) => i + 1).map((ch) => (
                  <option key={ch} value={ch}>
                    {selectedVolume === "D&C" ? `Section ${ch}` : `Chapter ${ch}`}
                  </option>
                ))}
              </select>
              {selectedChapter && (
                <button
                  onClick={() => setSelectedChapter(null)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--text-muted)",
                    cursor: "pointer",
                    fontSize: "0.78rem",
                    fontFamily: "inherit",
                    textDecoration: "underline",
                    textUnderlineOffset: "3px",
                  }}
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        )}

        {/* Word count slider */}
        {selectedBookId && (
          <div>
            <div
              style={{
                fontSize: "0.72rem",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "var(--text-muted)",
                marginBottom: "8px",
              }}
            >
              WORDS TO SHOW: {wordLimit}
            </div>
            <input
              type="range"
              min="20"
              max="120"
              step="10"
              value={wordLimit}
              onChange={(e) => setWordLimit(Number(e.target.value))}
              style={{
                width: isMobile ? "100%" : "200px",
                accentColor: volColor,
              }}
            />
          </div>
        )}
      </div>

      {/* Word Cloud Display */}
      {isLoading && (
        <div style={{ textAlign: "center", padding: "60px", color: "var(--text-muted)" }}>
          Generating word cloud...
        </div>
      )}

      {!isLoading && data && data.words.length > 0 && (
        <div>
          {/* Header with stats */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              marginBottom: "16px",
              flexWrap: "wrap",
              gap: "8px",
            }}
          >
            <div>
              <span style={{ fontSize: "1.1rem", fontWeight: 700, color: volColor }}>
                {data.bookName}
              </span>
              <span style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginLeft: "8px" }}>
                {data.chapterLabel}
              </span>
            </div>
            <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
              {data.words.length} unique words · {data.totalWords.toLocaleString()} total
            </div>
          </div>

          {/* The cloud */}
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "12px",
              padding: isMobile ? "20px 16px" : "32px",
              textAlign: "center",
              lineHeight: isMobile ? 2.2 : 2.4,
              minHeight: "200px",
            }}
          >
            {displayWords.map((item) => {
              const size = getWordSize(item.weight);
              const opacity = getWordOpacity(item.weight);
              const isHovered = hoveredWord === item.word;

              return (
                <span
                  key={item.word}
                  onMouseEnter={() => setHoveredWord(item.word)}
                  onMouseLeave={() => setHoveredWord(null)}
                  onClick={() => {
                    // Navigate to search for this word
                    window.location.href = `/search?word=${encodeURIComponent(item.word)}`;
                  }}
                  style={{
                    display: "inline-block",
                    fontSize: `${size}rem`,
                    fontWeight: item.weight > 0.5 ? 700 : item.weight > 0.2 ? 600 : 400,
                    color: volColor,
                    opacity: isHovered ? 1 : opacity,
                    cursor: "pointer",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    transition: "all 0.15s ease",
                    background: isHovered ? `${volColor}15` : "transparent",
                    transform: isHovered ? "scale(1.1)" : "scale(1)",
                    position: "relative",
                  }}
                  title={`${item.word}: ${item.count} occurrences`}
                >
                  {item.word}
                  {isHovered && (
                    <span
                      style={{
                        position: "absolute",
                        bottom: "100%",
                        left: "50%",
                        transform: "translateX(-50%)",
                        background: "rgba(0,0,0,0.85)",
                        color: "#fff",
                        padding: "4px 10px",
                        borderRadius: "6px",
                        fontSize: "0.72rem",
                        fontWeight: 500,
                        whiteSpace: "nowrap",
                        pointerEvents: "none",
                        zIndex: 10,
                      }}
                    >
                      {item.count}×
                    </span>
                  )}
                </span>
              );
            })}
          </div>

          {/* Legend */}
          <div
            style={{
              marginTop: "16px",
              textAlign: "center",
              fontSize: "0.72rem",
              color: "var(--text-muted)",
            }}
          >
            Larger words appear more frequently. Click any word to search for it across all volumes.
          </div>
        </div>
      )}

      {!isLoading && data && data.words.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px", color: "var(--text-muted)" }}>
          No significant words found for this selection.
        </div>
      )}

      {!isLoading && !data && !selectedBookId && (
        <div
          style={{
            textAlign: "center",
            padding: "60px",
            color: "var(--text-muted)",
            fontSize: "0.92rem",
          }}
        >
          Select a volume and book above to generate a word cloud
        </div>
      )}
    </div>
  );
}
