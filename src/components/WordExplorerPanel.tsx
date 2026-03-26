"use client";

import { useState, useEffect, useRef } from "react";
import { useBackToClose } from "@/lib/useBackToClose";
import { VOLUME_COLORS } from "@/lib/constants";
import { analytics } from "@/lib/analytics";

interface HeatmapResult {
  bookName: string;
  volumeAbbrev: string;
  chapter: number;
  count: number;
}

interface FreqResult {
  bookName: string;
  volumeAbbrev: string;
  count: number;
  verseCount: number;
}

type Scope = "book" | "volume" | "all";

interface WordExplorerPanelProps {
  word: string;
  bookId: number;
  bookName: string;
  chapter: number;
  chapterCount: number;
  volumeAbbrev: string;
  volColor: string;
  lightMode: boolean;
  isMobile: boolean;
  onClose: () => void;
  onNavigateToChapter?: (chapter: number) => void;
}

export default function WordExplorerPanel({
  word,
  bookId,
  bookName,
  chapter,
  chapterCount,
  volumeAbbrev,
  volColor,
  lightMode,
  isMobile,
  onClose,
  onNavigateToChapter,
}: WordExplorerPanelProps) {
  const [scope, setScope] = useState<Scope>("book");
  const [chapterData, setChapterData] = useState<{ chapter: number; count: number }[]>([]);
  const [bookData, setBookData] = useState<FreqResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);

  // Track panel open
  useEffect(() => { analytics.wordExplorerOpen(word, bookName); }, [word, bookName]);

  // Mobile back-button closes panel instead of navigating away
  useBackToClose(onClose);

  const theme = lightMode
    ? {
        bg: "#f8f6f1",
        surface: "rgba(0,0,0,0.03)",
        text: "#222222",
        textSecondary: "#555555",
        textMuted: "#999999",
        border: "rgba(0,0,0,0.10)",
        barBg: "rgba(0,0,0,0.04)",
      }
    : {
        bg: "#32323d",
        surface: "rgba(255,255,255,0.04)",
        text: "#f0f0f0",
        textSecondary: "#b0b0b0",
        textMuted: "#666666",
        border: "rgba(255,255,255,0.08)",
        barBg: "rgba(255,255,255,0.04)",
      };

  // Volume ID mapping (matches DB)
  const VOLUME_IDS: Record<string, number> = {
    OT: 1, NT: 2, BoM: 3, "D&C": 4, PoGP: 5,
  };

  // Fetch data based on scope
  useEffect(() => {
    setIsLoading(true);

    if (scope === "book") {
      // Per-chapter breakdown for this book
      fetch(`/api/word-frequency-by-chapter?word=${encodeURIComponent(word)}&bookId=${bookId}&chapterCount=${chapterCount}`)
        .then((r) => r.json())
        .then((data) => {
          const results = data.results || [];
          setChapterData(results);
          setTotalCount(results.reduce((s: number, r: { count: number }) => s + r.count, 0));
          setIsLoading(false);
        })
        .catch(() => setIsLoading(false));
    } else if (scope === "volume") {
      // Per-book breakdown for this volume
      const volId = VOLUME_IDS[volumeAbbrev];
      fetch(`/api/word-frequency?word=${encodeURIComponent(word)}&volumeIds=${volId}`)
        .then((r) => r.json())
        .then((data) => {
          setBookData(data.results || []);
          setTotalCount(data.totalCount || 0);
          setIsLoading(false);
        })
        .catch(() => setIsLoading(false));
    } else {
      // All volumes
      fetch(`/api/word-frequency?word=${encodeURIComponent(word)}`)
        .then((r) => r.json())
        .then((data) => {
          setBookData(data.results || []);
          setTotalCount(data.totalCount || 0);
          setIsLoading(false);
        })
        .catch(() => setIsLoading(false));
    }
  }, [scope, word, bookId, chapterCount, volumeAbbrev]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Build bar data
  const bars: { label: string; count: number; color: string; clickable?: boolean; chapter?: number }[] = [];

  if (scope === "book" && chapterData.length > 0) {
    const maxCount = Math.max(...chapterData.map((d) => d.count), 1);
    chapterData.forEach((d) => {
      bars.push({
        label: `${d.chapter}`,
        count: d.count,
        color: volColor,
        clickable: true,
        chapter: d.chapter,
      });
    });
  } else if (bookData.length > 0) {
    bookData.forEach((d) => {
      const color = VOLUME_COLORS[d.volumeAbbrev] || volColor;
      bars.push({
        label: d.bookName.length > 12 ? d.bookName.substring(0, 10) + "…" : d.bookName,
        count: d.count,
        color,
      });
    });
  }

  const maxCount = bars.length > 0 ? Math.max(...bars.map((b) => b.count), 1) : 1;

  // Find peak
  const peakBar = bars.reduce((best, b) => (b.count > (best?.count || 0) ? b : best), bars[0]);

  // Volume name lookup
  const volumeNames: Record<string, string> = {
    OT: "Old Testament", NT: "New Testament", BoM: "Book of Mormon",
    "D&C": "D&C", PoGP: "Pearl of Great Price",
  };

  const scopeLabel = scope === "book" ? bookName : scope === "volume" ? volumeNames[volumeAbbrev] || volumeAbbrev : "All Volumes";

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.5)",
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
          zIndex: 200,
          animation: "fadeIn 0.2s ease",
        }}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          maxHeight: isMobile ? "75vh" : "65vh",
          background: theme.bg,
          borderTopLeftRadius: "16px",
          borderTopRightRadius: "16px",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.3)",
          zIndex: 201,
          display: "flex",
          flexDirection: "column",
          animation: "slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
          willChange: "transform",
          overflow: "hidden",
        }}
      >
        {/* Drag handle */}
        <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 4px" }}>
          <div style={{
            width: "36px",
            height: "4px",
            borderRadius: "2px",
            background: lightMode ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.15)",
          }} />
        </div>

        {/* Header */}
        <div style={{
          padding: isMobile ? "4px 20px 12px" : "4px 28px 16px",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "12px",
        }}>
          <div>
            <div style={{
              fontSize: isMobile ? "1.1rem" : "1.3rem",
              fontWeight: 800,
              color: theme.text,
              letterSpacing: "-0.02em",
            }}>
              &ldquo;{word}&rdquo;
            </div>
            <div style={{
              fontSize: "0.72rem",
              color: theme.textMuted,
              marginTop: "2px",
            }}>
              {isLoading ? "Loading…" : (
                <>
                  <strong style={{ color: theme.text, fontWeight: 700 }}>{totalCount}</strong> occurrence{totalCount !== 1 ? "s" : ""} in {scopeLabel}
                  {peakBar && scope === "book" && totalCount > 0 && (
                    <> · Peak in ch. {peakBar.label}</>
                  )}
                  {peakBar && scope !== "book" && totalCount > 0 && (
                    <> · Most in {peakBar.label}</>
                  )}
                </>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: theme.textMuted,
              fontSize: "1.2rem",
              cursor: "pointer",
              padding: "4px 8px",
              fontFamily: "inherit",
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        {/* Scope toggle */}
        <div style={{
          padding: isMobile ? "0 20px 12px" : "0 28px 16px",
          display: "flex",
          gap: "6px",
        }}>
          {(["book", "volume", "all"] as Scope[]).map((s) => {
            const label = s === "book" ? bookName : s === "volume" ? volumeNames[volumeAbbrev] || volumeAbbrev : "All Volumes";
            const isActive = scope === s;
            return (
              <button
                key={s}
                onClick={() => { setScope(s); analytics.wordExplorerScope(s, word); }}
                style={{
                  padding: "4px 10px",
                  borderRadius: "6px",
                  border: `1px solid ${isActive ? (lightMode ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.15)") : theme.border}`,
                  background: isActive
                    ? (lightMode ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.08)")
                    : "transparent",
                  color: isActive ? theme.text : theme.textMuted,
                  fontSize: "0.68rem",
                  fontWeight: isActive ? 600 : 500,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  transition: "all 0.15s",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Bar chart */}
        <div style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          padding: isMobile ? "0 20px calc(20px + env(safe-area-inset-bottom, 0px))" : "0 28px calc(24px + env(safe-area-inset-bottom, 0px))",
        }}>
          {isLoading ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: theme.textMuted, fontSize: "0.82rem" }}>
              Loading…
            </div>
          ) : bars.length === 0 || totalCount === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: theme.textMuted, fontSize: "0.82rem" }}>
              &ldquo;{word}&rdquo; not found in {scopeLabel}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
              {bars.map((bar, i) => {
                const pct = (bar.count / maxCount) * 100;
                const isCurrentChapter = scope === "book" && bar.chapter === chapter;
                return (
                  <div
                    key={i}
                    onClick={() => {
                      if (bar.clickable && bar.chapter && onNavigateToChapter) {
                        onNavigateToChapter(bar.chapter);
                        onClose();
                      }
                    }}
                    style={{
                      display: "grid",
                      gridTemplateColumns: scope === "book" ? "28px 1fr 30px" : "80px 1fr 30px",
                      alignItems: "center",
                      gap: "8px",
                      padding: "3px 0",
                      cursor: bar.clickable ? "pointer" : "default",
                      borderRadius: "4px",
                      background: isCurrentChapter ? `${volColor}12` : "transparent",
                      transition: "background 0.1s",
                    }}
                    onMouseEnter={(e) => {
                      if (bar.clickable) e.currentTarget.style.background = `${volColor}18`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = isCurrentChapter ? `${volColor}12` : "transparent";
                    }}
                  >
                    <div style={{
                      fontSize: "0.68rem",
                      fontWeight: isCurrentChapter ? 700 : 500,
                      color: isCurrentChapter ? volColor : theme.textSecondary,
                      textAlign: "right",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}>
                      {bar.label}
                    </div>
                    <div style={{
                      height: "14px",
                      background: theme.barBg,
                      borderRadius: "3px",
                      overflow: "hidden",
                      position: "relative",
                    }}>
                      <div style={{
                        height: "100%",
                        width: `${pct}%`,
                        background: bar.color,
                        borderRadius: "3px",
                        opacity: bar.count === 0 ? 0 : (isCurrentChapter ? 1 : 0.7),
                        transition: "width 0.3s ease",
                      }} />
                    </div>
                    <div style={{
                      fontSize: "0.65rem",
                      fontWeight: 600,
                      color: bar.count > 0 ? theme.textSecondary : theme.textMuted,
                      textAlign: "right",
                    }}>
                      {bar.count > 0 ? bar.count : "—"}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* "Go deeper" links */}
          {!isLoading && totalCount > 0 && (
            <div style={{
              marginTop: "20px",
              paddingTop: "14px",
              borderTop: `1px solid ${theme.border}`,
              display: "flex",
              flexWrap: "wrap",
              gap: "8px",
            }}>
              <a
                href={`/heatmap?word=${encodeURIComponent(word)}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  padding: "5px 12px",
                  borderRadius: "6px",
                  border: `1px solid ${theme.border}`,
                  background: theme.surface,
                  color: theme.textSecondary,
                  fontSize: "0.72rem",
                  fontWeight: 500,
                  textDecoration: "none",
                  transition: "all 0.15s",
                }}
              >
                <img src="/heatmap.svg" alt="" style={{ width: "13px", height: "13px", filter: lightMode ? "brightness(0.4)" : "invert(1) brightness(0.75)" }} />
                Full Heatmap →
              </a>
              <a
                href={`/search?word=${encodeURIComponent(word)}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  padding: "5px 12px",
                  borderRadius: "6px",
                  border: `1px solid ${theme.border}`,
                  background: theme.surface,
                  color: theme.textSecondary,
                  fontSize: "0.72rem",
                  fontWeight: 500,
                  textDecoration: "none",
                  transition: "all 0.15s",
                }}
              >
                <img src="/search.svg" alt="" style={{ width: "13px", height: "13px", filter: lightMode ? "brightness(0.4)" : "invert(1) brightness(0.75)" }} />
                Word Search →
              </a>
              <a
                href={`/narrative-arc?terms=${encodeURIComponent(word)}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  padding: "5px 12px",
                  borderRadius: "6px",
                  border: `1px solid ${theme.border}`,
                  background: theme.surface,
                  color: theme.textSecondary,
                  fontSize: "0.72rem",
                  fontWeight: 500,
                  textDecoration: "none",
                  transition: "all 0.15s",
                }}
              >
                <img src="/narrative-arc.svg" alt="" style={{ width: "13px", height: "13px", filter: lightMode ? "brightness(0.4)" : "invert(1) brightness(0.75)" }} />
                Narrative Arc →
              </a>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
