"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useBackToClose } from "@/lib/useBackToClose";
import type { ScriptureLocation } from "@/lib/types";
import { VOLUME_COLORS } from "@/lib/constants";
import VolumeTooltip from "./VolumeTooltip";
import { usePreferencesContext } from "@/components/PreferencesProvider";
import { useIsMobile } from "@/lib/useIsMobile";

const VOLUME_ORDER = ["OT", "NT", "BoM", "D&C", "PoGP"];

const LOCATION_TYPE_ICONS: Record<string, string> = {
  city: "\u{1F3DB}\uFE0F",
  mountain: "\u26F0\uFE0F",
  river: "\u{1F3DE}\uFE0F",
  sea: "\u{1F30A}",
  desert: "\u{1F3DC}\uFE0F",
  region: "\u{1F5FA}\uFE0F",
  valley: "\u{1F3D4}\uFE0F",
  garden: "\u{1F33F}",
  island: "\u{1F3DD}\uFE0F",
  well: "\u{1F4A7}",
  plain: "\u{1F33E}",
  hill: "\u26F0\uFE0F",
  land: "\u{1F5FA}\uFE0F",
  wilderness: "\u{1F332}",
  waters: "\u{1F4A7}",
};

interface MentionStats {
  totalMentions: number;
  byVolume: Record<string, number>;
  byBook: { bookId: number; bookName: string; volumeAbbrev: string; count: number }[];
  firstMention: { bookId: number; bookName: string; volumeAbbrev: string; chapter: number; verse: number; text: string } | null;
  lastMention: { bookId: number; bookName: string; volumeAbbrev: string; chapter: number; verse: number; text: string } | null;
}

export default function LocationDetailPanel({
  location,
  onClose,
  onSelectLocation,
}: {
  location: ScriptureLocation;
  onClose: () => void;
  onSelectLocation?: (loc: ScriptureLocation) => void;
}) {
  const { isVolumeVisible } = usePreferencesContext();
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

  // Reset animation on location change
  useEffect(() => {
    setIsVisible(false);
    requestAnimationFrame(() => setIsVisible(true));
    panelRef.current?.scrollTo(0, 0);
  }, [location.id]);

  // Fetch mention stats
  useEffect(() => {
    setMentions(null);
    setMentionsLoading(true);
    const aliases = location.aliases.join(",");
    fetch(`/api/location-mentions?name=${encodeURIComponent(location.name)}${aliases ? `&aliases=${encodeURIComponent(aliases)}` : ""}`)
      .then((r) => r.json())
      .then((data) => { setMentions(data); setMentionsLoading(false); })
      .catch(() => setMentionsLoading(false));
  }, [location.id, location.name, location.aliases]);

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

  // Swipe-to-close with dead zone + velocity tracking
  const touchStartY = useRef(0);
  const touchStartTime = useRef(0);
  const swipeEngaged = useRef(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    touchStartTime.current = Date.now();
    touchDeltaX.current = 0;
    swipeEngaged.current = false;
  }, []);
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - touchStartX.current;
    const dy = e.touches[0].clientY - touchStartY.current;
    touchDeltaX.current = dx;
    if (!swipeEngaged.current) {
      if (Math.abs(dx) > 15 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        swipeEngaged.current = true;
      } else return;
    }
    if (dx > 0) setSwipeOffset(dx);
  }, []);
  const handleTouchEnd = useCallback(() => {
    if (!swipeEngaged.current) { touchDeltaX.current = 0; return; }
    const elapsed = Date.now() - touchStartTime.current;
    const velocity = touchDeltaX.current / Math.max(elapsed, 1);
    if (velocity > 0.5 || touchDeltaX.current > 120) onClose();
    else setSwipeOffset(0);
    touchDeltaX.current = 0;
    swipeEngaged.current = false;
  }, [onClose]);

  // Primary volume color
  const color = (() => {
    for (const v of VOLUME_ORDER) {
      if (location.volumes.includes(v)) return VOLUME_COLORS[v] || "#8b5cf6";
    }
    return "#8b5cf6";
  })();

  const panelWidth = isMobile ? "calc(100vw - 48px)" : "min(100vw, 520px)";
  const hasMap = location.knownLocation && location.lat != null && location.lng != null;

  const typeIcon = LOCATION_TYPE_ICONS[location.locationType] || "\u{1F4CD}";

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
          transition: swipeOffset > 0 ? "none" : "transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
          willChange: "transform",
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

        {/* Hero map area */}
        {hasMap ? (
          <div style={{
            width: "100%",
            aspectRatio: "16 / 9",
            maxHeight: isMobile ? "40vh" : "280px",
            position: "relative",
            overflow: "hidden",
            flexShrink: 0,
          }}>
            <iframe
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${location.lng! - 0.5},${location.lat! - 0.5},${location.lng! + 0.5},${location.lat! + 0.5}&layer=mapnik&marker=${location.lat},${location.lng}`}
              style={{
                width: "100%",
                height: "100%",
                border: "none",
              }}
              title={`Map of ${location.name}`}
              loading="lazy"
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
            {/* Name overlay on map */}
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
                textShadow: "0 2px 8px rgba(0,0,0,0.6)",
              }}>
                {location.name}
              </h2>
              <div style={{
                fontSize: "0.85rem",
                color: "rgba(255,255,255,0.85)",
                fontWeight: 500,
                textShadow: "0 1px 4px rgba(0,0,0,0.6)",
              }}>
                {typeIcon} {location.locationType.charAt(0).toUpperCase() + location.locationType.slice(1)}
                {location.region && ` \u00B7 ${location.region}`}
              </div>
            </div>
          </div>
        ) : (
          /* No known location -- simple header with map pin placeholder */
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
              flexDirection: "column",
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity={0.5}>
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <span style={{ fontSize: "0.5rem", color: "var(--text-muted)", marginTop: "2px" }}>Unknown</span>
            </div>
            <div style={{ flex: 1, paddingRight: "36px" }}>
              <h2 style={{
                fontSize: "1.3rem",
                fontWeight: 700,
                color: "var(--text)",
                marginBottom: "4px",
              }}>
                {location.name}
              </h2>
              <div style={{
                fontSize: "0.82rem",
                color: color,
                fontWeight: 600,
              }}>
                {typeIcon} {location.locationType.charAt(0).toUpperCase() + location.locationType.slice(1)}
                {location.region && ` \u00B7 ${location.region}`}
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div style={{ padding: isMobile ? "20px" : "24px 28px", flex: 1 }}>
          {/* Volume pills + era + region row */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "20px",
            flexWrap: "wrap",
          }}>
            <div style={{ display: "flex", gap: "5px" }}>
              {location.volumes.map((v) => (
                <VolumeTooltip key={v} abbrev={v} style={{
                  fontSize: "0.65rem",
                  fontWeight: 700,
                  color: VOLUME_COLORS[v] || "#888",
                  background: `${VOLUME_COLORS[v] || "#888"}18`,
                  padding: "3px 9px",
                  borderRadius: "5px",
                  letterSpacing: "0.04em",
                }} />
              ))}
            </div>
            {/* Location type badge */}
            <span style={{
              fontSize: "0.7rem",
              fontWeight: 600,
              color: color,
              background: `${color}15`,
              padding: "2px 8px",
              borderRadius: "5px",
              textTransform: "capitalize",
            }}>
              {typeIcon} {location.locationType}
            </span>
            {/* Region badge */}
            {location.region && (
              <span style={{
                fontSize: "0.7rem",
                fontWeight: 600,
                color: "var(--text-secondary)",
                background: "rgba(255,255,255,0.06)",
                padding: "2px 8px",
                borderRadius: "5px",
              }}>
                {location.region}
              </span>
            )}
            {/* Era */}
            {location.era && (
              <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                {location.era}
              </span>
            )}
          </div>

          {/* Description */}
          {location.description && (
            <div style={{ marginBottom: "28px" }}>
              <p style={{
                fontSize: "0.92rem",
                color: "rgba(255,255,255,0.85)",
                lineHeight: 1.75,
                margin: 0,
              }}>
                {location.description}
              </p>
            </div>
          )}

          {/* Significance */}
          {location.significance && (
            <div style={{ marginBottom: "28px" }}>
              <div style={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text)", marginBottom: "10px" }}>
                Significance
              </div>
              <p style={{
                fontSize: "0.88rem",
                color: "rgba(255,255,255,0.75)",
                lineHeight: 1.7,
                margin: 0,
                fontStyle: "italic",
              }}>
                {location.significance}
              </p>
            </div>
          )}

          {/* Aliases */}
          {location.aliases.length > 0 && (
            <div style={{ marginBottom: "28px" }}>
              <div style={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text)", marginBottom: "10px" }}>
                Also Known As
              </div>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {location.aliases.map((a) => (
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

          {/* View on Google Maps link */}
          {hasMap && (
            <div style={{ marginBottom: "28px" }}>
              <a
                href={`https://www.google.com/maps?q=${location.lat},${location.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "8px 16px",
                  borderRadius: "8px",
                  background: `${color}15`,
                  border: `1px solid ${color}30`,
                  color: color,
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  textDecoration: "none",
                  transition: "all 0.15s",
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                View on Google Maps
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </a>
            </div>
          )}

          {/* Scripture Mentions */}
          {(mentionsLoading || mentions) && (
            <div style={{ marginBottom: "28px" }}>
              <div style={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text)", marginBottom: "12px" }}>
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
                      {VOLUME_ORDER.filter((v) => mentions.byVolume[v] && isVolumeVisible(v)).map((v) => {
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
                      {VOLUME_ORDER.filter((v) => mentions.byVolume[v] && isVolumeVisible(v)).map((v) => (
                        <div key={v} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <div style={{ width: "8px", height: "8px", borderRadius: "2px", background: VOLUME_COLORS[v] }} />
                          <span style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>
                            <VolumeTooltip abbrev={v} /> <strong style={{ color: "var(--text-secondary)" }}>{mentions.byVolume[v]}</strong>
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
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "8px" }}>
                    {mentions.firstMention && (() => {
                      const m = mentions.firstMention;
                      const refColor = VOLUME_COLORS[m.volumeAbbrev] || "var(--accent)";
                      const chapterStr = m.chapter > 0 ? `${m.chapter}:${m.verse}` : `${m.verse}`;
                      return (
                        <Link
                          href={`/scriptures?bookId=${m.bookId}${m.chapter > 0 ? `&chapter=${m.chapter}` : ""}&verse=${m.verse}`}
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
                          <div style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text)", marginBottom: "5px" }}>
                            First Mention
                          </div>
                          <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", fontStyle: "italic", lineHeight: 1.5, marginBottom: "6px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const, overflow: "hidden" }}>
                            &ldquo;{m.text}&rdquo;
                          </div>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <span style={{ fontSize: "0.72rem", fontWeight: 600, color: refColor }}>
                              {m.bookName} {chapterStr}
                            </span>
                            <span style={{ fontSize: "0.72rem", fontWeight: 500, color: refColor, display: "flex", alignItems: "center", gap: "3px" }}>
                              Read <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 2L8.5 6L4.5 10"/></svg>
                            </span>
                          </div>
                        </Link>
                      );
                    })()}

                    {mentions.lastMention && mentions.firstMention &&
                     (mentions.lastMention.bookId !== mentions.firstMention.bookId ||
                      mentions.lastMention.chapter !== mentions.firstMention.chapter ||
                      mentions.lastMention.verse !== mentions.firstMention.verse) && (() => {
                      const m = mentions.lastMention!;
                      const refColor = VOLUME_COLORS[m.volumeAbbrev] || "var(--accent)";
                      const chapterStr = m.chapter > 0 ? `${m.chapter}:${m.verse}` : `${m.verse}`;
                      return (
                        <Link
                          href={`/scriptures?bookId=${m.bookId}${m.chapter > 0 ? `&chapter=${m.chapter}` : ""}&verse=${m.verse}`}
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
                          <div style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text)", marginBottom: "5px" }}>
                            Last Mention
                          </div>
                          <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", fontStyle: "italic", lineHeight: 1.5, marginBottom: "6px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const, overflow: "hidden" }}>
                            &ldquo;{m.text}&rdquo;
                          </div>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <span style={{ fontSize: "0.72rem", fontWeight: 600, color: refColor }}>
                              {m.bookName} {chapterStr}
                            </span>
                            <span style={{ fontSize: "0.72rem", fontWeight: 500, color: refColor, display: "flex", alignItems: "center", gap: "3px" }}>
                              Read <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 2L8.5 6L4.5 10"/></svg>
                            </span>
                          </div>
                        </Link>
                      );
                    })()}
                  </div>
                </div>
              ) : mentions ? (
                <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>No direct mentions found by name.</div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
