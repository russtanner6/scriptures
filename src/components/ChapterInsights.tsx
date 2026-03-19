"use client";

import { useState, useEffect } from "react";

interface ChapterStats {
  wordCount: number;
  verseCount: number;
  uniqueWords: number;
  avgVerseLength: number;
  topWords: { word: string; count: number; weight: number }[];
  keyThemes: { word: string; score: number }[];
  verseDensity: { verse: number; wordCount: number }[];
}

interface ChapterInsightsProps {
  bookId: number;
  chapter: number;
  bookName: string;
  volumeAbbrev: string;
  volColor: string;
  lightMode: boolean;
  isMobile: boolean;
  onScrollToVerse?: (verse: number) => void;
}

export default function ChapterInsights({
  bookId,
  chapter,
  bookName,
  volumeAbbrev,
  volColor,
  lightMode,
  isMobile,
  onScrollToVerse,
}: ChapterInsightsProps) {
  const [stats, setStats] = useState<ChapterStats | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hoveredDensityVerse, setHoveredDensityVerse] = useState<number | null>(null);

  // Fetch stats when chapter changes
  useEffect(() => {
    setIsLoading(true);
    setIsExpanded(false);
    fetch(`/api/chapter-stats?bookId=${bookId}&chapter=${chapter}`)
      .then((r) => r.json())
      .then((data) => {
        setStats(data);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, [bookId, chapter]);

  const theme = lightMode
    ? {
        text: "#1a1a1a",
        textSecondary: "#555",
        textMuted: "#888",
        surface: "rgba(0, 0, 0, 0.03)",
        border: "rgba(0, 0, 0, 0.08)",
        pillBg: "rgba(0, 0, 0, 0.04)",
      }
    : {
        text: "var(--text)",
        textSecondary: "var(--text-secondary)",
        textMuted: "var(--text-muted)",
        surface: "var(--surface)",
        border: "var(--border)",
        pillBg: "rgba(255, 255, 255, 0.06)",
      };

  if (isLoading || !stats) return null;

  const isDC = volumeAbbrev === "D&C";
  const maxDensity = Math.max(...stats.verseDensity.map((v) => v.wordCount), 1);

  return (
    <div
      style={{
        marginBottom: "24px",
        borderRadius: "10px",
        border: `1px solid ${theme.border}`,
        overflow: "hidden",
        transition: "all 0.3s ease",
      }}
    >
      {/* Collapsed bar — always visible */}
      <button
        onClick={() => setIsExpanded((prev) => !prev)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: isMobile ? "10px 14px" : "10px 16px",
          background: theme.pillBg,
          border: "none",
          cursor: "pointer",
          fontFamily: "inherit",
          gap: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: isMobile ? "10px" : "16px", flexWrap: "wrap" }}>
          {/* Stats pills */}
          {[
            { label: "Words", value: stats.wordCount.toLocaleString() },
            { label: "Verses", value: stats.verseCount },
            { label: "Unique", value: stats.uniqueWords },
          ].map((pill) => (
            <div
              key={pill.label}
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: "4px",
              }}
            >
              <span
                style={{
                  fontSize: isMobile ? "0.82rem" : "0.88rem",
                  fontWeight: 700,
                  color: theme.text,
                }}
              >
                {pill.value}
              </span>
              <span
                style={{
                  fontSize: "0.65rem",
                  fontWeight: 500,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: theme.textMuted,
                }}
              >
                {pill.label}
              </span>
            </div>
          ))}
        </div>

        {/* Expand/collapse indicator */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            color: theme.textMuted,
            fontSize: "0.72rem",
            fontWeight: 500,
            whiteSpace: "nowrap",
          }}
        >
          {!isExpanded && <span>Insights</span>}
          <span
            style={{
              transform: isExpanded ? "rotate(180deg)" : "rotate(0)",
              transition: "transform 0.2s ease",
              fontSize: "0.6rem",
            }}
          >
            ▼
          </span>
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div
          style={{
            padding: isMobile ? "16px 14px" : "20px 16px",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
            animation: "fadeIn 0.3s ease",
          }}
        >
          {/* Key Themes */}
          {stats.keyThemes.length > 0 && (
            <div>
              <div
                style={{
                  fontSize: "0.65rem",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: theme.textMuted,
                  marginBottom: "8px",
                }}
              >
                Key Themes
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {stats.keyThemes.map((t) => (
                  <a
                    key={t.word}
                    href={`/heatmap?word=${encodeURIComponent(t.word)}`}
                    style={{
                      display: "inline-block",
                      padding: "4px 12px",
                      borderRadius: "20px",
                      background: `${volColor}18`,
                      border: `1px solid ${volColor}30`,
                      color: volColor,
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      textDecoration: "none",
                      transition: "all 0.15s",
                    }}
                  >
                    {t.word}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Mini Word Cloud */}
          {stats.topWords.length > 0 && (
            <div>
              <div
                style={{
                  fontSize: "0.65rem",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: theme.textMuted,
                  marginBottom: "8px",
                }}
              >
                Top Words
              </div>
              <div style={{ lineHeight: 2, textAlign: "center" }}>
                {stats.topWords.map((w) => {
                  const size = 0.7 + w.weight * (isMobile ? 0.8 : 1.1);
                  const opacity = 0.45 + w.weight * 0.55;
                  return (
                    <a
                      key={w.word}
                      href={`/heatmap?word=${encodeURIComponent(w.word)}`}
                      style={{
                        display: "inline-block",
                        fontSize: `${size}rem`,
                        fontWeight: w.weight > 0.5 ? 700 : w.weight > 0.2 ? 600 : 400,
                        color: volColor,
                        opacity,
                        padding: "1px 5px",
                        textDecoration: "none",
                        transition: "opacity 0.15s",
                      }}
                      title={`${w.word}: ${w.count}×`}
                    >
                      {w.word}
                    </a>
                  );
                })}
              </div>
            </div>
          )}

          {/* Verse Density Strip */}
          {stats.verseDensity.length > 0 && (
            <div>
              <div
                style={{
                  fontSize: "0.65rem",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: theme.textMuted,
                  marginBottom: "8px",
                }}
              >
                Verse Length
              </div>
              <div
                style={{
                  display: "flex",
                  gap: "1px",
                  height: "28px",
                  borderRadius: "4px",
                  overflow: "hidden",
                  position: "relative",
                }}
              >
                {stats.verseDensity.map((v) => {
                  const intensity = v.wordCount / maxDensity;
                  const isHovered = hoveredDensityVerse === v.verse;
                  return (
                    <div
                      key={v.verse}
                      style={{
                        flex: 1,
                        background: volColor,
                        opacity: 0.15 + intensity * 0.75,
                        cursor: "pointer",
                        transition: "opacity 0.15s, transform 0.1s",
                        transform: isHovered ? "scaleY(1.15)" : "scaleY(1)",
                        transformOrigin: "bottom",
                        position: "relative",
                      }}
                      onMouseEnter={() => setHoveredDensityVerse(v.verse)}
                      onMouseLeave={() => setHoveredDensityVerse(null)}
                      onClick={() => onScrollToVerse?.(v.verse)}
                      title={`Verse ${v.verse}: ${v.wordCount} words`}
                    />
                  );
                })}
              </div>
              {hoveredDensityVerse != null && (
                <div
                  style={{
                    fontSize: "0.68rem",
                    color: theme.textMuted,
                    marginTop: "4px",
                    textAlign: "center",
                  }}
                >
                  Verse {hoveredDensityVerse}:{" "}
                  {stats.verseDensity.find((v) => v.verse === hoveredDensityVerse)?.wordCount} words
                </div>
              )}
              <div
                style={{
                  fontSize: "0.62rem",
                  color: theme.textMuted,
                  marginTop: "4px",
                  textAlign: "center",
                  opacity: hoveredDensityVerse != null ? 0 : 0.7,
                  transition: "opacity 0.15s",
                }}
              >
                Click a bar to jump to that verse
              </div>
            </div>
          )}

          {/* Quick Links */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "8px",
              paddingTop: "4px",
              borderTop: `1px solid ${theme.border}`,
            }}
          >
            <a
              href={`/wordcloud?bookId=${bookId}&chapter=${chapter}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                padding: "5px 12px",
                borderRadius: "6px",
                border: `1px solid ${theme.border}`,
                background: theme.pillBg,
                color: theme.textSecondary,
                fontSize: "0.72rem",
                fontWeight: 500,
                textDecoration: "none",
                transition: "all 0.15s",
              }}
            >
              <img src="/word-cloud.svg" alt="" style={{ width: "13px", height: "13px", filter: lightMode ? "brightness(0.4)" : "invert(1) brightness(0.75)" }} /> Word Cloud
            </a>
            {stats.keyThemes[0] && (
              <a
                href={`/heatmap?word=${encodeURIComponent(stats.keyThemes[0].word)}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "5px 12px",
                  borderRadius: "6px",
                  border: `1px solid ${theme.border}`,
                  background: theme.pillBg,
                  color: theme.textSecondary,
                  fontSize: "0.72rem",
                  fontWeight: 500,
                  textDecoration: "none",
                  transition: "all 0.15s",
                }}
              >
                <img src="/heatmap.svg" alt="" style={{ width: "13px", height: "13px", filter: lightMode ? "brightness(0.4)" : "invert(1) brightness(0.75)" }} /> Heatmap: {stats.keyThemes[0].word}
              </a>
            )}
            {stats.keyThemes[0] && (
              <a
                href={`/search?word=${encodeURIComponent(stats.keyThemes[0].word)}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "5px 12px",
                  borderRadius: "6px",
                  border: `1px solid ${theme.border}`,
                  background: theme.pillBg,
                  color: theme.textSecondary,
                  fontSize: "0.72rem",
                  fontWeight: 500,
                  textDecoration: "none",
                  transition: "all 0.15s",
                }}
              >
                <img src="/search.svg" alt="" style={{ width: "13px", height: "13px", filter: lightMode ? "brightness(0.4)" : "invert(1) brightness(0.75)" }} /> Search: {stats.keyThemes[0].word}
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
