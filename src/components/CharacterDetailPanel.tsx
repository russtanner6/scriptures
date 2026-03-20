"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useBackToClose } from "@/lib/useBackToClose";
import type { ScriptureCharacter } from "@/lib/types";
import { VOLUME_COLORS } from "@/lib/constants";

const VOLUME_ORDER = ["OT", "NT", "BoM", "D&C", "PoGP"];

interface MentionStats {
  totalMentions: number;
  byVolume: Record<string, number>;
  byBook: { bookId: number; bookName: string; volumeAbbrev: string; count: number }[];
  firstMention: { bookId: number; bookName: string; volumeAbbrev: string; chapter: number; verse: number; text: string } | null;
  lastMention: { bookId: number; bookName: string; volumeAbbrev: string; chapter: number; verse: number; text: string } | null;
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

export default function CharacterDetailPanel({
  character,
  allCharacters,
  onClose,
  onSelectCharacter,
}: {
  character: ScriptureCharacter;
  allCharacters: ScriptureCharacter[];
  onClose: () => void;
  onSelectCharacter: (c: ScriptureCharacter) => void;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [mentions, setMentions] = useState<MentionStats | null>(null);
  const [mentionsLoading, setMentionsLoading] = useState(false);
  const isMobile = useIsMobile();
  const panelRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  const touchDeltaX = useRef(0);
  const [swipeOffset, setSwipeOffset] = useState(0);

  // Mobile back-button closes panel instead of navigating away
  useBackToClose(onClose);

  useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true));
  }, []);

  // Reset animation on character change
  useEffect(() => {
    setIsVisible(false);
    requestAnimationFrame(() => setIsVisible(true));
    // Scroll to top on character change
    panelRef.current?.scrollTo(0, 0);
  }, [character.id]);

  // Fetch mention stats
  useEffect(() => {
    setMentions(null);
    setMentionsLoading(true);
    const aliases = character.aliases.join(",");
    fetch(`/api/character-mentions?name=${encodeURIComponent(character.name)}${aliases ? `&aliases=${encodeURIComponent(aliases)}` : ""}`)
      .then((r) => r.json())
      .then((data) => { setMentions(data); setMentionsLoading(false); })
      .catch(() => setMentionsLoading(false));
  }, [character.id, character.name, character.aliases]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );
  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Swipe-to-close
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchDeltaX.current = 0;
  }, []);
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const delta = e.touches[0].clientX - touchStartX.current;
    touchDeltaX.current = delta;
    if (delta > 0) setSwipeOffset(delta);
  }, []);
  const handleTouchEnd = useCallback(() => {
    if (touchDeltaX.current > 80) onClose();
    else setSwipeOffset(0);
    touchDeltaX.current = 0;
  }, [onClose]);

  // Primary volume color
  const color = (() => {
    for (const v of VOLUME_ORDER) {
      if (character.volumes.includes(v)) return VOLUME_COLORS[v] || "#8b5cf6";
    }
    return "#8b5cf6";
  })();

  // Find family members
  const findChar = (id: string) => allCharacters.find((c) => c.id === id);

  const familyEntries: { label: string; char: ScriptureCharacter }[] = [];
  const fam = character.family;
  if (fam) {
    for (const [key, val] of Object.entries(fam)) {
      if (Array.isArray(val)) {
        val.forEach((id) => {
          const c = findChar(id);
          if (c) familyEntries.push({ label: key, char: c });
        });
      } else {
        const c = findChar(val);
        if (c) familyEntries.push({ label: key, char: c });
      }
    }
  }

  const panelWidth = isMobile ? "calc(100vw - 48px)" : "min(100vw, 520px)";
  const hasPortrait = !!character.portraitUrl;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0, 0, 0, 0.6)",
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
          zIndex: 200,
          opacity: isVisible ? 1 : 0,
          transition: "opacity 0.3s ease",
        }}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: panelWidth,
          background: "var(--bg, #111116)",
          borderLeft: "1px solid var(--border)",
          zIndex: 201,
          display: "flex",
          flexDirection: "column",
          transform: isVisible
            ? `translateX(${swipeOffset}px)`
            : "translateX(100%)",
          transition: swipeOffset > 0 ? "none" : "transform 0.3s ease",
          boxShadow: "-8px 0 32px rgba(0, 0, 0, 0.4)",
          borderRadius: isMobile ? "12px 0 0 12px" : undefined,
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {/* Swipe handle (mobile) */}
        {isMobile && (
          <div style={{
            display: "flex",
            justifyContent: "center",
            padding: "8px 0 0",
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 3,
          }}>
            <div style={{ width: "36px", height: "4px", borderRadius: "2px", background: "rgba(255,255,255,0.25)" }} />
          </div>
        )}

        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "12px",
            right: "12px",
            background: "rgba(0,0,0,0.4)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: "8px",
            width: "32px",
            height: "32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "#fff",
            fontSize: "0.9rem",
            fontFamily: "inherit",
            zIndex: 3,
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
          }}
        >
          ✕
        </button>

        {/* Hero portrait area */}
        {hasPortrait ? (
          <div style={{
            width: "100%",
            aspectRatio: "3 / 4",
            maxHeight: isMobile ? "55vh" : "480px",
            position: "relative",
            overflow: "hidden",
            flexShrink: 0,
          }}>
            <img
              src={character.portraitUrl}
              alt={character.name}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
            {/* Gradient overlay at bottom for text readability */}
            <div style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: "50%",
              background: "linear-gradient(transparent, var(--bg, #111116))",
              pointerEvents: "none",
            }} />
            {/* Name overlay on portrait */}
            <div style={{
              position: "absolute",
              bottom: "16px",
              left: isMobile ? "16px" : "24px",
              right: "16px",
              zIndex: 2,
            }}>
              <h2 style={{
                fontSize: isMobile ? "1.5rem" : "1.8rem",
                fontWeight: 700,
                color: "#fff",
                marginBottom: "6px",
                textShadow: "0 2px 8px rgba(0,0,0,0.4)",
              }}>
                {character.name}
              </h2>
              <div style={{
                fontSize: "0.85rem",
                color: "rgba(255,255,255,0.85)",
                fontWeight: 500,
                textShadow: "0 1px 4px rgba(0,0,0,0.4)",
              }}>
                {character.roles.join(" · ")}
              </div>
            </div>
          </div>
        ) : (
          /* No portrait — simple header */
          <div style={{
            padding: isMobile ? "32px 20px 20px" : "40px 28px 24px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            gap: "16px",
            alignItems: "center",
          }}>
            <div style={{
              width: "72px",
              height: "72px",
              borderRadius: "50%",
              background: `${color}15`,
              border: `2px solid ${color}30`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity={0.5}>
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <div style={{ flex: 1, paddingRight: "36px" }}>
              <h2 style={{
                fontSize: "1.3rem",
                fontWeight: 700,
                color: "var(--text)",
                marginBottom: "4px",
              }}>
                {character.name}
              </h2>
              <div style={{
                fontSize: "0.82rem",
                color: color,
                fontWeight: 600,
              }}>
                {character.roles.join(" · ")}
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div style={{ padding: isMobile ? "20px" : "24px 28px", flex: 1 }}>
          {/* Volume pills + era row */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "20px",
            flexWrap: "wrap",
          }}>
            <div style={{ display: "flex", gap: "5px" }}>
              {character.volumes.map((v) => (
                <span
                  key={v}
                  style={{
                    fontSize: "0.65rem",
                    fontWeight: 700,
                    color: VOLUME_COLORS[v] || "#888",
                    background: `${VOLUME_COLORS[v] || "#888"}18`,
                    padding: "3px 9px",
                    borderRadius: "5px",
                    letterSpacing: "0.04em",
                  }}
                >
                  {v}
                </span>
              ))}
            </div>
            <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
              {character.era}
              {character.timePeriod && character.timePeriod !== "unknown" && ` · ${character.timePeriod}`}
            </span>
          </div>

          {/* Bio */}
          <div style={{ marginBottom: "28px" }}>
            <p style={{
              fontSize: "0.92rem",
              color: "rgba(255,255,255,0.85)",
              lineHeight: 1.75,
              margin: 0,
            }}>
              {character.bio}
            </p>
          </div>

          {/* Aliases */}
          {character.aliases.length > 0 && (
            <div style={{ marginBottom: "28px" }}>
              <div style={{ fontSize: "0.68rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: "8px" }}>
                Also Known As
              </div>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {character.aliases.map((a) => (
                  <span
                    key={a}
                    style={{
                      fontSize: "0.78rem",
                      color: "var(--text-secondary)",
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid var(--border)",
                      padding: "3px 10px",
                      borderRadius: "6px",
                    }}
                  >
                    {a}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Scripture Mentions */}
          {(mentionsLoading || mentions) && (
            <div style={{ marginBottom: "28px" }}>
              <div style={{ fontSize: "0.68rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: "12px" }}>
                Scripture Mentions
              </div>

              {mentionsLoading ? (
                <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Searching scriptures...</div>
              ) : mentions && mentions.totalMentions > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  {/* Total count */}
                  <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                    Found in <strong style={{ color: "var(--text)" }}>{mentions.totalMentions.toLocaleString()}</strong> verse{mentions.totalMentions !== 1 ? "s" : ""}
                  </div>

                  {/* Volume heatmap bar */}
                  <div>
                    <div style={{ display: "flex", borderRadius: "6px", overflow: "hidden", height: "24px" }}>
                      {VOLUME_ORDER.filter((v) => mentions.byVolume[v]).map((v) => {
                        const count = mentions.byVolume[v] || 0;
                        const pct = (count / mentions.totalMentions) * 100;
                        return (
                          <div
                            key={v}
                            title={`${v}: ${count} mentions`}
                            style={{
                              width: `${pct}%`,
                              minWidth: pct > 0 ? "24px" : "0",
                              background: VOLUME_COLORS[v],
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "0.6rem",
                              fontWeight: 700,
                              color: "#fff",
                              transition: "width 0.5s ease",
                            }}
                          >
                            {pct > 8 ? v : ""}
                          </div>
                        );
                      })}
                    </div>
                    {/* Volume legend below bar */}
                    <div style={{ display: "flex", gap: "12px", marginTop: "6px", flexWrap: "wrap" }}>
                      {VOLUME_ORDER.filter((v) => mentions.byVolume[v]).map((v) => (
                        <div key={v} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <div style={{ width: "8px", height: "8px", borderRadius: "2px", background: VOLUME_COLORS[v] }} />
                          <span style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>
                            {v} <strong style={{ color: "var(--text-secondary)" }}>{mentions.byVolume[v]}</strong>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Top books */}
                  {mentions.byBook.length > 0 && (
                    <div>
                      <div style={{ fontSize: "0.65rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                        Most Mentioned In
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                        {mentions.byBook
                          .sort((a, b) => b.count - a.count)
                          .slice(0, 5)
                          .map((b) => {
                            const maxCount = mentions.byBook[0] ? Math.max(...mentions.byBook.map((x) => x.count)) : 1;
                            const pct = (b.count / maxCount) * 100;
                            return (
                              <div key={b.bookId} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)", minWidth: "100px", textAlign: "right" }}>
                                  {b.bookName}
                                </span>
                                <div style={{ flex: 1, height: "6px", borderRadius: "3px", background: "rgba(255,255,255,0.06)" }}>
                                  <div style={{
                                    height: "100%",
                                    width: `${pct}%`,
                                    borderRadius: "3px",
                                    background: VOLUME_COLORS[b.volumeAbbrev] || "#8b5cf6",
                                    transition: "width 0.5s ease",
                                  }} />
                                </div>
                                <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", minWidth: "24px" }}>
                                  {b.count}
                                </span>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}

                  {/* First & Last Mention */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {mentions.firstMention && (
                      <Link
                        href={`/read?bookId=${mentions.firstMention.bookId}&chapter=${mentions.firstMention.chapter}`}
                        style={{
                          display: "block",
                          padding: "10px 14px",
                          borderRadius: "10px",
                          background: "rgba(255,255,255,0.03)",
                          border: "1px solid var(--border)",
                          textDecoration: "none",
                          transition: "all 0.15s",
                        }}
                      >
                        <div style={{ fontSize: "0.62rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: "4px" }}>
                          First Mention
                        </div>
                        <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", fontStyle: "italic", lineHeight: 1.5, marginBottom: "4px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const, overflow: "hidden" }}>
                          &ldquo;{mentions.firstMention.text}&rdquo;
                        </div>
                        <div style={{ fontSize: "0.72rem", fontWeight: 600, color: VOLUME_COLORS[mentions.firstMention.volumeAbbrev] || "var(--accent)" }}>
                          {mentions.firstMention.bookName} {mentions.firstMention.chapter}:{mentions.firstMention.verse}
                          <span style={{ fontWeight: 400, color: "var(--accent)", marginLeft: "8px" }}>Read →</span>
                        </div>
                      </Link>
                    )}

                    {mentions.lastMention && mentions.firstMention &&
                     (mentions.lastMention.bookId !== mentions.firstMention.bookId ||
                      mentions.lastMention.chapter !== mentions.firstMention.chapter ||
                      mentions.lastMention.verse !== mentions.firstMention.verse) && (
                      <Link
                        href={`/read?bookId=${mentions.lastMention.bookId}&chapter=${mentions.lastMention.chapter}`}
                        style={{
                          display: "block",
                          padding: "10px 14px",
                          borderRadius: "10px",
                          background: "rgba(255,255,255,0.03)",
                          border: "1px solid var(--border)",
                          textDecoration: "none",
                          transition: "all 0.15s",
                        }}
                      >
                        <div style={{ fontSize: "0.62rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: "4px" }}>
                          Last Mention
                        </div>
                        <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", fontStyle: "italic", lineHeight: 1.5, marginBottom: "4px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const, overflow: "hidden" }}>
                          &ldquo;{mentions.lastMention.text}&rdquo;
                        </div>
                        <div style={{ fontSize: "0.72rem", fontWeight: 600, color: VOLUME_COLORS[mentions.lastMention.volumeAbbrev] || "var(--accent)" }}>
                          {mentions.lastMention.bookName} {mentions.lastMention.chapter}:{mentions.lastMention.verse}
                          <span style={{ fontWeight: 400, color: "var(--accent)", marginLeft: "8px" }}>Read →</span>
                        </div>
                      </Link>
                    )}
                  </div>
                </div>
              ) : mentions ? (
                <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>No direct mentions found by name.</div>
              ) : null}
            </div>
          )}

          {/* Family */}
          {familyEntries.length > 0 && (
            <div style={{ marginBottom: "24px" }}>
              <div style={{ fontSize: "0.68rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: "10px" }}>
                Family
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {familyEntries.map(({ label, char: fc }, i) => {
                  const fcColor = (() => {
                    for (const v of VOLUME_ORDER) {
                      if (fc.volumes.includes(v)) return VOLUME_COLORS[v] || "#8b5cf6";
                    }
                    return "#8b5cf6";
                  })();
                  return (
                    <button
                      key={`${fc.id}-${label}-${i}`}
                      onClick={() => onSelectCharacter(fc)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        padding: "8px 12px",
                        borderRadius: "10px",
                        border: "1px solid var(--border)",
                        background: "transparent",
                        cursor: "pointer",
                        fontFamily: "inherit",
                        textAlign: "left",
                        transition: "all 0.15s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                        e.currentTarget.style.borderColor = `${fcColor}40`;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.borderColor = "var(--border)";
                      }}
                    >
                      {/* Mini avatar for family member */}
                      <div style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "50%",
                        background: `${fcColor}15`,
                        border: `1.5px solid ${fcColor}30`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        overflow: "hidden",
                      }}>
                        {fc.portraitUrl ? (
                          <img src={fc.portraitUrl} alt={fc.name} style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={fcColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity={0.4}>
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                            <circle cx="12" cy="7" r="4" />
                          </svg>
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: "0.85rem",
                          fontWeight: 600,
                          color: "var(--text)",
                        }}>
                          {fc.name}
                        </div>
                        <div style={{
                          fontSize: "0.65rem",
                          fontWeight: 500,
                          textTransform: "capitalize",
                          color: "var(--text-muted)",
                        }}>
                          {label}
                        </div>
                      </div>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
