"use client";

import { useState, useEffect } from "react";
import type { SpeakerAttribution, SpeakerType } from "@/lib/types";
import { usePreferencesContext } from "@/components/PreferencesProvider";

interface ChapterStats {
  wordCount: number;
  verseCount: number;
  uniqueWords: number;
  avgVerseLength: number;
  topWords: { word: string; count: number; weight: number }[];
  keyThemes: { word: string; score: number }[];
  verseDensity: { verse: number; wordCount: number }[];
}

interface ChapterCharacter {
  id: string;
  name: string;
  portraitUrl: string | null;
  roles: string[];
  tier: number;
  aliases: string[];
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
  onExploreWord?: (word: string) => void;
  onSelectCharacter?: (characterId: string) => void;
  speakers?: SpeakerAttribution[];
}

const SPEAKER_TYPE_COLORS_LIGHT: Record<SpeakerType, string> = {
  divine: "#B47E00", prophet: "#2563EB", apostle: "#059669",
  angel: "#7C3AED", narrator: "#0E7490", other: "",
};
const SPEAKER_TYPE_COLORS_DARK: Record<SpeakerType, string> = {
  divine: "#FBBF24", prophet: "#60A5FA", apostle: "#34D399",
  angel: "#C4B5FD", narrator: "#22D3EE", other: "",
};

// Distinct palette for individual "other" speakers so each gets a unique color
const OTHER_PALETTE_LIGHT = [
  "#9333EA", "#C2410C", "#0369A1", "#15803D", "#A21CAF",
  "#B45309", "#1D4ED8", "#047857", "#7E22CE", "#BE123C",
];
const OTHER_PALETTE_DARK = [
  "#A78BFA", "#FB923C", "#38BDF8", "#4ADE80", "#E879F9",
  "#FCD34D", "#818CF8", "#2DD4BF", "#C084FC", "#FB7185",
];

export default function ChapterInsights({
  bookId,
  chapter,
  bookName,
  volumeAbbrev,
  volColor,
  lightMode,
  isMobile,
  onScrollToVerse,
  onExploreWord,
  onSelectCharacter,
  speakers = [],
}: ChapterInsightsProps) {
  const { displaySpeakerName } = usePreferencesContext();
  const [stats, setStats] = useState<ChapterStats | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [chapterChars, setChapterChars] = useState<ChapterCharacter[]>([]);

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

  // Fetch characters in this chapter
  useEffect(() => {
    setChapterChars([]);
    fetch(`/api/chapter-characters?bookId=${bookId}&chapter=${chapter}`)
      .then((r) => r.json())
      .then((data) => setChapterChars(data.characters || []))
      .catch(() => {});
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

  // Build speaker info map: speaker name → { color, verseCount, speakerType }
  // Each "other" speaker gets a unique color from a palette
  const typeColors = lightMode ? SPEAKER_TYPE_COLORS_LIGHT : SPEAKER_TYPE_COLORS_DARK;
  const otherPalette = lightMode ? OTHER_PALETTE_LIGHT : OTHER_PALETTE_DARK;
  let otherIndex = 0;
  const speakerMap = new Map<string, { color: string; verseCount: number; speakerType: SpeakerType }>();
  speakers.forEach((s) => {
    const name = displaySpeakerName(s.speaker, s.speakerType, volumeAbbrev);
    const existing = speakerMap.get(name);
    const count = s.verseEnd - s.verseStart + 1;
    if (existing) {
      existing.verseCount += count;
    } else {
      const color = s.speakerType === "other"
        ? otherPalette[otherIndex++ % otherPalette.length]
        : typeColors[s.speakerType];
      speakerMap.set(name, {
        color,
        verseCount: count,
        speakerType: s.speakerType,
      });
    }
  });

  // Match characters to speakers (by name or aliases, case-insensitive)
  function getSpeakerInfo(charName: string, charAliases: string[]) {
    // Check character name and all aliases against speaker names
    const namesToCheck = [charName, ...charAliases];
    for (const n of namesToCheck) {
      const direct = speakerMap.get(n);
      if (direct) return direct;
      // Case-insensitive fallback
      for (const [speakerName, info] of speakerMap) {
        if (speakerName.toLowerCase() === n.toLowerCase()) return info;
      }
    }
    return null;
  }

  // Portrait circles for collapsed bar — always show 3, use real portraits where available
  const portraitChars = chapterChars.slice(0, 3);
  // Fill to 3 with placeholders if fewer characters
  while (portraitChars.length < 3 && chapterChars.length > 0) {
    portraitChars.push({ id: `placeholder-${portraitChars.length}`, name: "?", portraitUrl: null, roles: [], tier: 9, aliases: [] });
  }


  return (
    <div
      style={{
        marginBottom: "24px",
        borderRadius: "8px",
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
        <div style={{ display: "flex", alignItems: "center", gap: isMobile ? "12px" : "20px", flexWrap: "wrap" }}>
          {/* Verse count */}
          <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
            <span style={{ fontSize: isMobile ? "0.82rem" : "0.88rem", fontWeight: 700, color: theme.text }}>
              {stats.verseCount}
            </span>
            <span style={{ fontSize: "0.65rem", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em", color: theme.textMuted }}>
              Verses
            </span>
          </div>

          {/* People count with stacked portraits */}
          {chapterChars.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              {/* Stacked portrait circles */}
              <div style={{ display: "flex", position: "relative", width: `${18 + (Math.min(portraitChars.length, 3) - 1) * 12}px`, height: "22px" }}>
                {portraitChars.slice(0, 3).map((c, i) => (
                  <div
                    key={c.id}
                    style={{
                      position: "absolute",
                      left: `${i * 12}px`,
                      width: "22px",
                      height: "22px",
                      borderRadius: "50%",
                      overflow: "hidden",
                      border: `2px solid ${lightMode ? "#f0efe8" : "#1a1a21"}`,
                      zIndex: 3 - i,
                      background: c.portraitUrl ? undefined : `${volColor}30`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {c.portraitUrl ? (
                      <img
                        src={c.portraitUrl}
                        alt=""
                        style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 20%" }}
                      />
                    ) : (
                      <span style={{ fontSize: "0.5rem", fontWeight: 700, color: volColor }}>
                        {c.name.charAt(0)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
                <span style={{ fontSize: isMobile ? "0.82rem" : "0.88rem", fontWeight: 700, color: theme.text }}>
                  {chapterChars.length}
                </span>
                <span style={{ fontSize: "0.65rem", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em", color: theme.textMuted }}>
                  People
                </span>
              </div>
            </div>
          )}
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
          {!isExpanded && <span style={{ textTransform: "uppercase", letterSpacing: "0.08em", color: theme.textSecondary }}>Insights</span>}
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
            padding: isMobile ? "18px 14px" : "24px 16px",
            display: "flex",
            flexDirection: "column",
            gap: "28px",
            animation: "fadeIn 0.3s ease",
          }}
        >
          {/* People in this Chapter — merged with speaker indicators */}
          {chapterChars.length > 0 && (
            <div>
              <div
                style={{
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: theme.text,
                  marginBottom: "8px",
                }}
              >
                People in this {volumeAbbrev === "D&C" ? "Section" : "Chapter"}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {chapterChars.map((c) => {
                  const spk = getSpeakerInfo(c.name, c.aliases || []);
                  const isSpeaker = !!spk;
                  return (
                    <button
                      key={c.id}
                      onClick={() => onSelectCharacter?.(c.id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "7px",
                        padding: "4px 10px 4px 4px",
                        borderRadius: "20px",
                        background: theme.pillBg,
                        border: isSpeaker
                          ? `2.5px solid ${spk!.color}`
                          : `1px solid ${theme.border}`,
                        cursor: onSelectCharacter ? "pointer" : "default",
                        fontFamily: "inherit",
                        transition: "all 0.15s",
                      }}
                      title={isSpeaker ? `${c.name} — speaks in ${spk!.verseCount} verse${spk!.verseCount !== 1 ? "s" : ""}` : c.roles.join(", ")}
                    >
                      {c.portraitUrl ? (
                        <img
                          src={c.portraitUrl}
                          alt=""
                          loading="lazy"
                          style={{
                            width: "26px",
                            height: "26px",
                            borderRadius: "50%",
                            objectFit: "cover",
                            objectPosition: "center 20%",
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: "26px",
                            height: "26px",
                            borderRadius: "50%",
                            background: `${volColor}25`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "0.62rem",
                            fontWeight: 700,
                            color: volColor,
                          }}
                        >
                          {c.name.charAt(0)}
                        </div>
                      )}
                      <span
                        style={{
                          fontSize: "0.74rem",
                          fontWeight: 600,
                          color: isSpeaker ? spk!.color : theme.textSecondary,
                        }}
                      >
                        {c.name}
                      </span>
                      {isSpeaker && (
                        <span
                          style={{
                            fontSize: "0.68rem",
                            fontWeight: 700,
                            color: spk!.color,
                            opacity: 0.8,
                          }}
                        >
                          {spk!.verseCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              {/* Speaker legend hint */}
              {speakers.length > 0 && (
                <div style={{
                  fontSize: "0.74rem",
                  color: theme.textSecondary,
                  marginTop: "14px",
                  lineHeight: 1.6,
                }}>
                  Color borders indicate speakers. The number next to their name is how many verses they speak. Colors match the verse margins below.
                </div>
              )}
            </div>
          )}

          {/* Speaker Timeline — color-coded heatmap of who speaks where */}
          {speakers.length > 0 && stats.verseCount > 0 && (() => {
            // Build per-verse speaker color map
            const verseColors: (string | null)[] = new Array(stats.verseCount).fill(null);
            const verseSpeakerNames: (string | null)[] = new Array(stats.verseCount).fill(null);
            for (const s of speakers) {
              const name = displaySpeakerName(s.speaker, s.speakerType, volumeAbbrev);
              const spkInfo = speakerMap.get(name);
              const color = spkInfo?.color || "#888";
              for (let v = s.verseStart; v <= s.verseEnd && v <= stats.verseCount; v++) {
                verseColors[v - 1] = color;
                verseSpeakerNames[v - 1] = name;
              }
            }

            // Group consecutive verses with same color into segments
            const segments: { start: number; end: number; color: string | null; speaker: string | null }[] = [];
            let segStart = 0;
            for (let i = 1; i <= verseColors.length; i++) {
              if (i === verseColors.length || verseColors[i] !== verseColors[segStart]) {
                segments.push({
                  start: segStart,
                  end: i - 1,
                  color: verseColors[segStart],
                  speaker: verseSpeakerNames[segStart],
                });
                segStart = i;
              }
            }

            const neutralColor = lightMode ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.06)";

            return (
              <div>
                <div
                  style={{
                    fontSize: "0.65rem",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    color: theme.textMuted,
                    marginBottom: "10px",
                  }}
                >
                  Speaker Timeline
                </div>
                <div
                  style={{
                    background: lightMode ? "rgba(0,0,0,0.12)" : "rgba(0,0,0,0.35)",
                    borderRadius: "10px",
                    padding: "4px",
                    boxShadow: lightMode
                      ? "inset 0 2px 4px rgba(0,0,0,0.08)"
                      : "inset 0 2px 4px rgba(0,0,0,0.3)",
                  }}
                >
                <div
                  style={{
                    display: "flex",
                    height: "24px",
                    borderRadius: "6px",
                    overflow: "hidden",
                    cursor: "pointer",
                  }}
                >
                  {segments.map((seg, i) => {
                    const width = ((seg.end - seg.start + 1) / stats.verseCount) * 100;
                    const verseNum = seg.start + 1;
                    const verseLabel = seg.start === seg.end
                      ? `Verse ${verseNum}`
                      : `Verses ${verseNum}–${seg.end + 1}`;
                    const title = seg.speaker
                      ? `${seg.speaker} — ${verseLabel}`
                      : verseLabel;
                    return (
                      <div
                        key={i}
                        onClick={(e) => {
                          e.stopPropagation();
                          onScrollToVerse?.(verseNum);
                        }}
                        title={title}
                        style={{
                          width: `${width}%`,
                          minWidth: "2px",
                          background: seg.color || neutralColor,
                          opacity: seg.color ? 0.7 : 1,
                          transition: "opacity 0.15s",
                          borderRight: i < segments.length - 1
                            ? `1px solid ${lightMode ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.3)"}`
                            : "none",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.opacity = seg.color ? "0.7" : "1"; }}
                      />
                    );
                  })}
                </div>
                </div>
                {/* Verse scale markers */}
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: "4px",
                  fontSize: "0.58rem",
                  color: theme.textMuted,
                  fontWeight: 500,
                }}>
                  <span>1</span>
                  {stats.verseCount > 10 && <span>{Math.round(stats.verseCount / 2)}</span>}
                  <span>{stats.verseCount}</span>
                </div>
                <div style={{
                  fontSize: "0.74rem",
                  color: theme.textSecondary,
                  marginTop: "10px",
                  lineHeight: 1.6,
                }}>
                  Each color represents a speaker — tap any segment to jump to that verse
                </div>
              </div>
            );
          })()}

          {/* Key Themes */}
          {stats.keyThemes.length > 0 && (
            <div>
              <div
                style={{
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: theme.text,
                  marginBottom: "10px",
                }}
              >
                Key Themes
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {stats.keyThemes.map((t) => (
                  <button
                    key={t.word}
                    onClick={() => onExploreWord ? onExploreWord(t.word) : undefined}
                    style={{
                      display: "inline-block",
                      padding: "5px 14px",
                      borderRadius: "6px",
                      background: theme.pillBg,
                      border: `1px solid ${theme.border}`,
                      color: theme.text,
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      cursor: onExploreWord ? "pointer" : "default",
                      fontFamily: "inherit",
                      transition: "all 0.15s",
                    }}
                  >
                    {t.word}
                  </button>
                ))}
              </div>
              <div style={{
                fontSize: "0.74rem",
                color: theme.textSecondary,
                marginTop: "12px",
                lineHeight: 1.6,
              }}>
                Tap any theme to see how often it appears across all scripture
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
