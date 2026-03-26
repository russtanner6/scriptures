"use client";

import { useState, useEffect } from "react";
import type { SpeakerAttribution, SpeakerType } from "@/lib/types";
import { usePreferencesContext } from "@/components/PreferencesProvider";
import { analytics } from "@/lib/analytics";

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

interface HistoricalContext {
  era: string;
  approxDate: string;
  setting: string;
}

interface NotableVerse {
  verse: number;
  reason: string;
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
  flatTopCorners?: boolean;
}

const SPEAKER_TYPE_COLORS_LIGHT: Record<SpeakerType, string> = {
  divine: "#D97706", prophet: "#3B82F6", apostle: "#10B981",
  angel: "#8B5CF6", narrator: "#0891B2", other: "",
};
const SPEAKER_TYPE_COLORS_DARK: Record<SpeakerType, string> = {
  divine: "#FBBF24", prophet: "#60A5FA", apostle: "#34D399",
  angel: "#C4B5FD", narrator: "#22D3EE", other: "",
};

const OTHER_PALETTE_LIGHT = [
  "#9333EA", "#C2410C", "#0369A1", "#15803D", "#A21CAF",
  "#B45309", "#1D4ED8", "#047857", "#7E22CE", "#BE123C",
];
const OTHER_PALETTE_DARK = [
  "#A78BFA", "#FB923C", "#38BDF8", "#4ADE80", "#E879F9",
  "#FCD34D", "#818CF8", "#2DD4BF", "#C084FC", "#FB7185",
];

// Tone display name mapping
const TONE_LABELS: Record<string, string> = {
  exaltation: "Exaltation & Glory",
  peace: "Covenant Peace",
  admonition: "Admonition & Justice",
  contrition: "Trial & Contrition",
};
const TONE_SHORT: Record<string, string> = {
  exaltation: "Exaltation",
  peace: "Peace",
  admonition: "Admonition",
  contrition: "Contrition",
};
const TONE_COLORS: Record<string, string> = {
  exaltation: "#FFD700",
  peace: "#20B2AA",
  admonition: "#DC143C",
  contrition: "#4B0082",
};

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
  flatTopCorners = false,
}: ChapterInsightsProps) {
  const { displaySpeakerName } = usePreferencesContext();
  const [stats, setStats] = useState<ChapterStats | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [chapterChars, setChapterChars] = useState<ChapterCharacter[]>([]);
  const [summary, setSummary] = useState<string | null>(null);
  const [historicalCtx, setHistoricalCtx] = useState<HistoricalContext | null>(null);
  const [dominantTone, setDominantTone] = useState<string | null>(null);
  const [notableVerses, setNotableVerses] = useState<NotableVerse[]>([]);

  // Fetch stats when chapter changes
  useEffect(() => {
    setIsLoading(true);
    setIsExpanded(false);
    setSummary(null);
    setHistoricalCtx(null);
    setDominantTone(null);
    setNotableVerses([]);
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

  // Fetch enrichment data when expanded
  useEffect(() => {
    if (!isExpanded) return;

    // Chapter summary
    fetch(`/api/chapter-summary?bookId=${bookId}&chapter=${chapter}`)
      .then((r) => r.json())
      .then((data) => { if (data.summary) setSummary(data.summary); })
      .catch(() => {});

    // Historical context
    fetch(`/api/historical-context?bookId=${bookId}&chapter=${chapter}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.era) setHistoricalCtx({ era: data.era, approxDate: data.approxDate, setting: data.setting });
      })
      .catch(() => {});

    // Dominant tone from sentiment API
    fetch(`/api/sentiment?level=chapters&bookId=${bookId}`)
      .then((r) => r.json())
      .then((data) => {
        const ch = (data.chapters || []).find(
          (c: { chapter: number; bookId: number }) => c.chapter === chapter && c.bookId === bookId
        );
        if (ch?.dominant) setDominantTone(ch.dominant);
      })
      .catch(() => {});

    // Notable verses
    fetch(`/api/notable-verses?bookId=${bookId}&chapter=${chapter}`)
      .then((r) => r.json())
      .then((data) => { if (data.verses?.length) setNotableVerses(data.verses); })
      .catch(() => {});
  }, [isExpanded, bookId, chapter]);

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
        textSecondary: "rgba(255, 255, 255, 0.7)",
        textMuted: "rgba(255, 255, 255, 0.5)",
        surface: "var(--surface)",
        border: "var(--border)",
        pillBg: "rgba(255, 255, 255, 0.06)",
      };

  if (isLoading || !stats) return null;

  // Build speaker info map
  const typeColors = lightMode ? SPEAKER_TYPE_COLORS_LIGHT : SPEAKER_TYPE_COLORS_DARK;
  const otherPalette = lightMode ? OTHER_PALETTE_LIGHT : OTHER_PALETTE_DARK;
  let otherIndex = 0;
  const speakerMap = new Map<string, { color: string; verseCount: number; speakerType: SpeakerType }>();
  speakers.forEach((s) => {
    const name = displaySpeakerName(s.speaker, s.speakerType, volumeAbbrev);
    const existing = speakerMap.get(name);
    const cappedEnd = stats ? Math.min(s.verseEnd, stats.verseCount) : s.verseEnd;
    const count = cappedEnd - s.verseStart + 1;
    if (existing) {
      existing.verseCount += count;
    } else {
      const color = s.speakerType === "other"
        ? otherPalette[otherIndex++ % otherPalette.length]
        : typeColors[s.speakerType];
      speakerMap.set(name, { color, verseCount: count, speakerType: s.speakerType });
    }
  });

  function getSpeakerInfo(charName: string, charAliases: string[]) {
    const namesToCheck = [charName, ...charAliases];
    for (const n of namesToCheck) {
      const direct = speakerMap.get(n);
      if (direct) return direct;
      for (const [speakerName, info] of speakerMap) {
        if (speakerName.toLowerCase() === n.toLowerCase()) return info;
      }
    }
    return null;
  }

  // Portrait circles for collapsed bar
  const portraitChars = chapterChars.slice(0, 3);
  while (portraitChars.length < 3 && chapterChars.length > 0) {
    portraitChars.push({ id: `placeholder-${portraitChars.length}`, name: "?", portraitUrl: null, roles: [], tier: 9, aliases: [] });
  }

  // Auto-close panel then perform action (with small delay for smooth UX)
  const closeAndDo = (fn: () => void) => {
    setIsExpanded(false);
    setTimeout(() => { setShowContent(false); fn(); }, 250);
  };

  // Section label component
  const SectionLabel = ({ children }: { children: React.ReactNode }) => (
    <div style={{
      fontSize: "0.72rem",
      fontWeight: 700,
      textTransform: "uppercase" as const,
      letterSpacing: "0.1em",
      color: "rgba(255,255,255,0.55)",
      marginBottom: "10px",
    }}>
      {children}
    </div>
  );

  // Stat pill component
  const StatPill = ({ label, value }: { label: string; value: string | number }) => (
    <div style={{
      display: "flex",
      flexDirection: "column" as const,
      gap: "2px",
      padding: isMobile ? "8px 10px" : "8px 14px",
      background: theme.pillBg,
      borderRadius: "8px",
      border: `1px solid ${theme.border}`,
      minWidth: 0,
    }}>
      <span style={{
        fontSize: "0.6rem",
        fontWeight: 600,
        textTransform: "uppercase" as const,
        letterSpacing: "0.08em",
        color: theme.textMuted,
        whiteSpace: "nowrap" as const,
      }}>
        {label}
      </span>
      <span style={{
        fontSize: "0.82rem",
        fontWeight: 700,
        color: theme.text,
        overflow: "hidden",
        textOverflow: "ellipsis" as const,
        whiteSpace: "nowrap" as const,
      }}>
        {value}
      </span>
    </div>
  );

  const chapterOrSection = volumeAbbrev === "D&C" ? "Section" : "Chapter";

  return (
    <>
      <style>{`
        @keyframes insightsSlideIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes insightsShimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes expandDown {
          from { max-height: 0; opacity: 0; }
          to { max-height: 1200px; opacity: 1; }
        }
        @keyframes collapseUp {
          from { max-height: 1200px; opacity: 1; }
          to { max-height: 0; opacity: 0; }
        }
      `}</style>
    <div
      style={{
        marginBottom: "24px",
        borderRadius: flatTopCorners ? "0" : "8px",
        border: flatTopCorners ? "none" : `1px solid ${theme.border}`,
        animation: "insightsSlideIn 0.4s ease-out",
        // Full width on mobile (escape parent padding), match image width on desktop
        ...(flatTopCorners ? {
          marginLeft: isMobile ? "-20px" : "-32px",
          marginRight: isMobile ? "-20px" : "-32px",
          width: isMobile ? "calc(100% + 40px)" : "calc(100% + 64px)",
        } : {}),
      }}
    >
      {/* Collapsed bar — sticky to top below header */}
      <button
        onClick={() => {
          if (!isExpanded) {
            // Opening
            analytics.insightsOpen(bookName, chapter || 0);
            setShowContent(true);
            setIsExpanded(true);
          } else {
            // Closing — animate out first
            setIsExpanded(false);
            setTimeout(() => setShowContent(false), 250);
          }
        }}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: isMobile ? "14px 14px" : "14px 16px",
          background: lightMode ? "rgba(0, 0, 0, 0.12)" : "rgba(0, 0, 0, 0.55)",
          border: "none",
          borderRadius: 0,
          cursor: "pointer",
          fontFamily: "inherit",
          gap: "12px",
          position: "sticky" as const,
          top: isMobile ? "44px" : "48px",
          zIndex: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: isMobile ? "12px" : "20px", flexWrap: "wrap" }}>
          {/* Verse count — hidden on mobile */}
          {!isMobile && (
            <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
              <span style={{ fontSize: "0.88rem", fontWeight: 700, color: lightMode ? "#222" : "#fff" }}>
                {stats.verseCount}
              </span>
              <span style={{ fontSize: "0.65rem", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em", color: lightMode ? "#555" : "rgba(255,255,255,0.7)" }}>
                Verses
              </span>
            </div>
          )}

          {/* People count with stacked portraits */}
          {chapterChars.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
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
                      border: `2px solid ${lightMode ? "rgba(0,0,0,0.15)" : "rgba(0,0,0,0.4)"}`,
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
                <span style={{ fontSize: isMobile ? "0.82rem" : "0.88rem", fontWeight: 700, color: lightMode ? "#222" : "#fff" }}>
                  {chapterChars.length}
                </span>
                <span style={{ fontSize: "0.65rem", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em", color: lightMode ? "#555" : "rgba(255,255,255,0.7)" }}>
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
            color: lightMode ? "#444" : "rgba(255,255,255,0.8)",
            fontSize: "0.72rem",
            fontWeight: 500,
            whiteSpace: "nowrap",
          }}
        >
          {!isExpanded && <span style={{
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            background: "linear-gradient(105deg, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.85) 35%, rgba(255,255,255,1) 48%, rgba(200,220,255,1) 50%, rgba(255,255,255,1) 52%, rgba(255,255,255,0.85) 65%, rgba(255,255,255,0.85) 100%)",
            backgroundSize: "200% 100%",
            backgroundClip: "text",
            WebkitBackgroundClip: "text",
            color: "transparent",
            animation: "insightsShimmer 1.2s ease-in-out 1.5s 1",
            backgroundPosition: "-200% center",
          }}>Insights</span>}
          <span
            style={{
              transform: isExpanded ? "rotate(180deg)" : "rotate(0)",
              transition: "transform 0.2s ease",
              fontSize: "0.6rem",
              color: lightMode ? "#333" : "#fff",
            }}
          >
            ▼
          </span>
        </div>
      </button>

      {/* Expanded content */}
      {showContent && (
        <div
          style={{
            padding: isMobile ? "16px 14px" : "20px 16px",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
            animation: isExpanded
              ? "expandDown 0.3s ease-out forwards"
              : "collapseUp 0.25s ease-in forwards",
            overflow: "hidden",
            background: "rgba(0,0,0,0.15)",
            borderTop: "none",
            borderLeft: "none",
            borderRight: "none",
            borderBottom: isExpanded ? "2px solid rgba(0,0,0,0.25)" : "none",
          }}
        >
          {/* ── Section 1: At a Glance ── */}
          <div>
            <SectionLabel>At a Glance</SectionLabel>
            <div style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(auto-fit, minmax(120px, 1fr))",
              gap: "8px",
            }}>
              <StatPill label="Verses" value={stats.verseCount} />
              <StatPill label="Words" value={stats.wordCount.toLocaleString()} />
              {historicalCtx && (
                <StatPill label="Era" value={(() => {
                  const d = historicalCtx.approxDate;
                  if (!d || d === "n/a" || d === "N/A" || d === "Unknown") {
                    // Humorous fallbacks based on era or book context
                    const era = historicalCtx.era?.toLowerCase() || "";
                    if (era.includes("creation") || era.includes("antediluvian")) return "Before calendars existed";
                    if (era.includes("patriarchal")) return "A really long time ago";
                    if (era.includes("exodus")) return "Sandals-and-manna era";
                    if (era.includes("millennial") || era.includes("last days")) return "Hasn't happened yet";
                    return "A long time ago";
                  }
                  return d;
                })()} />
              )}
              {dominantTone && (
                <StatPill
                  label="Tone"
                  value={TONE_SHORT[dominantTone] || dominantTone}
                />
              )}
            </div>
            {summary && (
              <p style={{
                margin: "12px 0 0 0",
                fontSize: "0.82rem",
                color: "rgba(255, 255, 255, 0.85)",
                lineHeight: 1.6,
              }}>
                {summary}
              </p>
            )}
          </div>

          {/* ── Section 2: People ── */}
          {chapterChars.length > 0 && (() => {
            return (
              <>
                <div>
                  <SectionLabel>People in this {chapterOrSection}</SectionLabel>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {chapterChars.map((c) => {
                      const spk = getSpeakerInfo(c.name, c.aliases || []);
                      const isSpeaker = !!spk;
                      const firstSpeakingVerse = isSpeaker ? (() => {
                        const namesToCheck = [c.name, ...(c.aliases || [])].map(n => n.toLowerCase());
                        const match = speakers.find(s =>
                          namesToCheck.some(n => s.speaker.toLowerCase() === n || s.speaker.toLowerCase().startsWith(n + ","))
                        );
                        return match?.verseStart || null;
                      })() : null;
                      return (
                        <button
                          key={c.id}
                          onClick={() => {
                            analytics.insightsPersonClick(c.name, bookName, chapter || 0);
                            closeAndDo(() => {
                              if (firstSpeakingVerse && onScrollToVerse) {
                                onScrollToVerse(firstSpeakingVerse);
                              } else {
                                onSelectCharacter?.(c.id);
                              }
                            });
                          }}
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
                </div>
              </>
            );
          })()}

          {/* ── Section 3: Speaker Timeline ── */}
          {speakers.length > 0 && stats.verseCount > 0 && (() => {
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
              <>
                <div>
                  <SectionLabel>Speaker Timeline</SectionLabel>
                  <div
                    style={{
                      background: lightMode ? "rgba(0,0,0,0.12)" : "rgba(0,0,0,0.35)",
                      borderRadius: "2px",
                      padding: "3px",
                      boxShadow: lightMode
                        ? "inset 0 2px 4px rgba(0,0,0,0.08)"
                        : "inset 0 2px 4px rgba(0,0,0,0.3)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        height: "24px",
                        borderRadius: "1px",
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
                              analytics.speakerTimelineClick(seg.speaker || "narrator", verseNum);
                              closeAndDo(() => onScrollToVerse?.(verseNum));
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
                </div>
              </>
            );
          })()}

          {/* ── Section 4: Key Themes ── */}
          {stats.keyThemes.length > 0 && (
            <>
              <div>
                <SectionLabel>Key Themes</SectionLabel>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {stats.keyThemes.map((t) => (
                    <button
                      key={t.word}
                      onClick={() => onExploreWord ? closeAndDo(() => onExploreWord(t.word)) : undefined}
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
              </div>
            </>
          )}

          {/* ── Section 5: Notable Verses ── */}
          {notableVerses.length > 0 && (
            <>
              <div>
                <SectionLabel>Notable Verses</SectionLabel>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {notableVerses.map((nv) => (
                    <button
                      key={nv.verse}
                      onClick={() => closeAndDo(() => onScrollToVerse?.(nv.verse))}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "10px",
                        padding: "10px 12px",
                        borderRadius: "8px",
                        background: theme.pillBg,
                        border: `1px solid ${theme.border}`,
                        borderLeft: `3px solid rgba(255,255,255,0.25)`,
                        cursor: "pointer",
                        fontFamily: "inherit",
                        textAlign: "left" as const,
                        transition: "all 0.15s",
                        width: "100%",
                      }}
                    >
                      <span style={{
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        color: "rgba(255,255,255,0.6)",
                        whiteSpace: "nowrap" as const,
                        marginTop: "1px",
                      }}>
                        v. {nv.verse}
                      </span>
                      <span style={{
                        fontSize: "0.78rem",
                        color: theme.textSecondary,
                        lineHeight: 1.5,
                      }}>
                        {nv.reason}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

        </div>
      )}
    </div>
    </>
  );
}
