"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Volume } from "@/lib/types";
import { VOLUME_COLORS } from "@/lib/constants";
import { getVerseUrl } from "@/lib/scripture-urls";
import ChapterInsights from "./ChapterInsights";
import VersePopover from "./VersePopover";

interface ReaderVerse {
  chapter: number;
  verse: number;
  text: string;
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

export default function ScriptureReader() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isMobile = useIsMobile();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const [volumes, setVolumes] = useState<Volume[]>([]);
  const [lightMode, setLightMode] = useState(false);
  const [fontSize, setFontSize] = useState(1); // 0=small, 1=medium, 2=large

  // Navigation state
  const [selectedVolume, setSelectedVolume] = useState<string | null>(null);
  const [selectedBookId, setSelectedBookId] = useState<number | null>(null);
  const [selectedBookName, setSelectedBookName] = useState<string | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [chapterCount, setChapterCount] = useState<number>(0);

  // Verses
  const [verses, setVerses] = useState<ReaderVerse[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Reading progress
  const [scrollProgress, setScrollProgress] = useState(0);

  // In-chapter search
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Verse popover state
  const [activeVerse, setActiveVerse] = useState<{
    verse: number;
    chapter: number;
    text: string;
  } | null>(null);

  // Search term highlight (when arriving from ScripturePanel)
  const highlightWord = searchParams.get("highlight") || null;

  // Font size map
  const fontSizes = [
    { body: isMobile ? "0.92rem" : "0.95rem", label: "A" },
    { body: isMobile ? "1rem" : "1.05rem", label: "A" },
    { body: isMobile ? "1.1rem" : "1.18rem", label: "A" },
  ];

  // Load preferences from localStorage
  useEffect(() => {
    const savedLight = localStorage.getItem("reader-light-mode");
    if (savedLight === "true") setLightMode(true);
    const savedFont = localStorage.getItem("reader-font-size");
    if (savedFont) setFontSize(Number(savedFont));
  }, []);

  // Track scroll progress in reading view
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || selectedChapter === null) return;
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const progress = scrollHeight <= clientHeight ? 1 : scrollTop / (scrollHeight - clientHeight);
      setScrollProgress(Math.min(1, Math.max(0, progress)));
    };
    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [selectedChapter, verses]);

  // Load volumes + handle deep link
  useEffect(() => {
    fetch("/api/books")
      .then((r) => r.json())
      .then((data) => {
        const vols: Volume[] = data.volumes;
        setVolumes(vols);

        // Deep link: ?bookId=X&chapter=Y
        const urlBookId = searchParams.get("bookId");
        const urlChapter = searchParams.get("chapter");
        if (urlBookId && urlChapter) {
          const bid = Number(urlBookId);
          let ch = Number(urlChapter);
          for (const vol of vols) {
            const book = vol.books.find((b) => b.id === bid);
            if (book) {
              ch = Math.max(1, Math.min(ch, book.chapterCount));
              setSelectedVolume(vol.abbrev);
              setSelectedBookId(bid);
              setSelectedBookName(book.name);
              setSelectedChapter(ch);
              setChapterCount(book.chapterCount);
              const params = new URLSearchParams({ bookId: String(bid), chapter: String(ch) });
              fetch(`/api/chapter?${params}`)
                .then((r) => r.json())
                .then((data) => setVerses(data.verses || []));
              break;
            }
          }
        }
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch chapter verses
  const loadChapter = useCallback(async (bookId: number, chapter: number) => {
    setIsLoading(true);
    setScrollProgress(0);
    setSearchTerm("");
    setSearchOpen(false);
    try {
      const params = new URLSearchParams({
        bookId: String(bookId),
        chapter: String(chapter),
      });
      const res = await fetch(`/api/chapter?${params}`);
      const data = await res.json();
      setVerses(data.verses || []);
      setSelectedBookName(data.bookName);
      setChapterCount(data.chapterCount);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Navigate to a chapter + update URL
  const goToChapter = useCallback(
    (volAbbrev: string, bookId: number, bookName: string, chapter: number, bookChapterCount: number) => {
      setSelectedVolume(volAbbrev);
      setSelectedBookId(bookId);
      setSelectedBookName(bookName);
      setSelectedChapter(chapter);
      setChapterCount(bookChapterCount);
      loadChapter(bookId, chapter);
      // Update URL for bookmarking/sharing (without full navigation)
      const url = `/read?bookId=${bookId}&chapter=${chapter}${highlightWord ? `&highlight=${encodeURIComponent(highlightWord)}` : ""}`;
      window.history.replaceState({}, "", url);
      // Scroll to top of reading container
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo(0, 0);
      }
    },
    [loadChapter, highlightWord]
  );

  const toggleLightMode = () => {
    setLightMode((prev) => {
      const next = !prev;
      localStorage.setItem("reader-light-mode", String(next));
      return next;
    });
  };

  const cycleFontSize = () => {
    setFontSize((prev) => {
      const next = (prev + 1) % 3;
      localStorage.setItem("reader-font-size", String(next));
      return next;
    });
  };

  // Get prev/next book info for better nav labels
  const getAdjacentBookInfo = useCallback(() => {
    if (!selectedVolume || !selectedBookId) return { prev: null, next: null };
    const vol = volumes.find((v) => v.abbrev === selectedVolume);
    if (!vol) return { prev: null, next: null };
    const bookIdx = vol.books.findIndex((b) => b.id === selectedBookId);
    return {
      prev: bookIdx > 0 ? vol.books[bookIdx - 1] : null,
      next: bookIdx < vol.books.length - 1 ? vol.books[bookIdx + 1] : null,
    };
  }, [selectedVolume, selectedBookId, volumes]);

  // Navigate to prev/next chapter
  const goToPrevChapter = useCallback(() => {
    if (!selectedBookId || !selectedChapter || !selectedVolume) return;
    if (selectedChapter > 1) {
      goToChapter(selectedVolume, selectedBookId, selectedBookName || "", selectedChapter - 1, chapterCount);
    } else {
      const { prev } = getAdjacentBookInfo();
      if (prev) {
        goToChapter(selectedVolume, prev.id, prev.name, prev.chapterCount, prev.chapterCount);
      }
    }
  }, [selectedBookId, selectedChapter, selectedVolume, selectedBookName, chapterCount, goToChapter, getAdjacentBookInfo]);

  const goToNextChapter = useCallback(() => {
    if (!selectedBookId || !selectedChapter || !selectedVolume) return;
    if (selectedChapter < chapterCount) {
      goToChapter(selectedVolume, selectedBookId, selectedBookName || "", selectedChapter + 1, chapterCount);
    } else {
      const { next } = getAdjacentBookInfo();
      if (next) {
        goToChapter(selectedVolume, next.id, next.name, 1, next.chapterCount);
      }
    }
  }, [selectedBookId, selectedChapter, selectedVolume, selectedBookName, chapterCount, goToChapter, getAdjacentBookInfo]);

  // Keyboard navigation
  useEffect(() => {
    if (selectedChapter === null) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") { e.preventDefault(); goToPrevChapter(); }
      if (e.key === "ArrowRight") { e.preventDefault(); goToNextChapter(); }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedChapter, goToPrevChapter, goToNextChapter]);

  // Highlight search term in verse text
  // Active highlight word: either from deep link or from in-chapter search
  const activeHighlight = searchTerm.length >= 2 ? searchTerm : highlightWord;

  // Count search matches across all verses
  const searchMatchCount = activeHighlight
    ? verses.reduce((count, v) => {
        const escaped = activeHighlight.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(`\\b${escaped}\\b`, "gi");
        const matches = v.text.match(regex);
        return count + (matches ? matches.length : 0);
      }, 0)
    : 0;

  const renderVerseText = (text: string) => {
    if (!activeHighlight) return text;
    const escaped = activeHighlight.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(\\b${escaped}\\b)`, "gi");
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark
          key={i}
          style={{
            background: lightMode ? "rgba(59, 130, 246, 0.25)" : "rgba(139, 92, 246, 0.3)",
            color: "inherit",
            padding: "1px 3px",
            borderRadius: "3px",
          }}
        >
          {part}
        </mark>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  };

  // Color theme
  const theme = lightMode
    ? {
        bg: "#faf9f6",
        text: "#1a1a1a",
        textSecondary: "#555",
        textMuted: "#888",
        surface: "rgba(0, 0, 0, 0.03)",
        border: "rgba(0, 0, 0, 0.08)",
        verseNum: "#aaa",
        verseText: "#2a2a2a",
      }
    : {
        bg: "var(--bg)",
        text: "var(--text)",
        textSecondary: "var(--text-secondary)",
        textMuted: "var(--text-muted)",
        surface: "var(--surface)",
        border: "var(--border)",
        verseNum: "var(--text-muted)",
        verseText: "rgba(255, 255, 255, 0.85)",
      };

  // ── READING VIEW ──
  if (selectedChapter !== null && selectedBookId !== null && selectedVolume) {
    const volColor = VOLUME_COLORS[selectedVolume] || "#3B82F6";
    const vol = volumes.find((v) => v.abbrev === selectedVolume);
    const isDC = selectedVolume === "D&C";
    const chapterLabel = isDC ? `Section ${selectedChapter}` : `Chapter ${selectedChapter}`;
    const { prev: prevBook, next: nextBook } = getAdjacentBookInfo();
    const isFirstChapterOfVolume = selectedChapter === 1 && (!prevBook);
    const isLastChapterOfVolume = selectedChapter === chapterCount && (!nextBook);

    // Bottom nav labels
    const prevLabel = selectedChapter > 1
      ? (isDC ? `Sec ${selectedChapter - 1}` : `Ch ${selectedChapter - 1}`)
      : prevBook ? prevBook.name : null;
    const nextLabel = selectedChapter < chapterCount
      ? (isDC ? `Sec ${selectedChapter + 1}` : `Ch ${selectedChapter + 1}`)
      : nextBook ? nextBook.name : null;

    return (
      <div
        ref={scrollContainerRef}
        style={{
          position: "fixed",
          inset: 0,
          background: theme.bg,
          zIndex: 60,
          overflowY: "auto",
          transition: "background 0.3s ease, color 0.3s ease",
        }}
      >
        {/* Reading progress bar */}
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            height: "2px",
            width: `${scrollProgress * 100}%`,
            background: volColor,
            zIndex: 100,
            transition: "width 0.1s linear",
          }}
        />

        {/* Top bar */}
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 50,
            background: lightMode ? "rgba(250, 249, 246, 0.95)" : "rgba(15, 15, 18, 0.95)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            borderBottom: `1px solid ${theme.border}`,
            padding: isMobile ? "10px 16px" : "12px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
            <button
              onClick={() => {
                setSelectedChapter(null);
                setVerses([]);
                // Reset URL
                window.history.replaceState({}, "", "/read");
              }}
              style={{
                background: "none",
                border: "none",
                color: theme.textSecondary,
                cursor: "pointer",
                fontSize: "1.2rem",
                padding: "4px 8px",
                fontFamily: "inherit",
              }}
              title="Back to book list"
            >
              ←
            </button>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: isMobile ? "0.85rem" : "0.95rem",
                  fontWeight: 700,
                  color: theme.text,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {selectedBookName}
              </div>
              <div
                style={{
                  fontSize: "0.68rem",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: volColor,
                }}
              >
                {chapterLabel}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: isMobile ? "6px" : "8px" }}>
            {/* Search toggle */}
            {searchOpen ? (
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      setSearchOpen(false);
                      setSearchTerm("");
                    }
                  }}
                  placeholder="Find..."
                  autoFocus
                  style={{
                    width: isMobile ? "90px" : "130px",
                    padding: "5px 10px",
                    borderRadius: "8px",
                    border: `1px solid ${theme.border}`,
                    background: lightMode ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.06)",
                    color: theme.text,
                    fontSize: "0.78rem",
                    fontFamily: "inherit",
                    outline: "none",
                  }}
                />
                {searchTerm.length >= 2 && (
                  <span style={{ fontSize: "0.68rem", color: theme.textMuted, whiteSpace: "nowrap" }}>
                    {searchMatchCount}
                  </span>
                )}
                <button
                  onClick={() => { setSearchOpen(false); setSearchTerm(""); }}
                  style={{
                    background: "none",
                    border: "none",
                    color: theme.textMuted,
                    fontSize: "0.85rem",
                    cursor: "pointer",
                    padding: "4px",
                    fontFamily: "inherit",
                  }}
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setSearchOpen(true);
                  setTimeout(() => searchInputRef.current?.focus(), 100);
                }}
                title="Search in chapter"
                style={{
                  background: lightMode ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.06)",
                  border: `1px solid ${theme.border}`,
                  borderRadius: "8px",
                  width: "36px",
                  height: "36px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  fontSize: "0.85rem",
                  transition: "all 0.15s",
                  color: theme.textSecondary,
                }}
              >
                🔍
              </button>
            )}

            {/* Font size toggle */}
            <button
              onClick={cycleFontSize}
              title="Change font size"
              style={{
                background: lightMode ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.06)",
                border: `1px solid ${theme.border}`,
                borderRadius: "8px",
                width: "36px",
                height: "36px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                fontSize: fontSize === 0 ? "0.7rem" : fontSize === 1 ? "0.85rem" : "1rem",
                fontWeight: 700,
                color: theme.textSecondary,
                fontFamily: "inherit",
                transition: "all 0.15s",
              }}
            >
              {fontSizes[fontSize].label}
            </button>

            {/* Light/dark toggle */}
            <button
              onClick={toggleLightMode}
              title={lightMode ? "Switch to dark mode" : "Switch to light mode"}
              style={{
                background: lightMode ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.06)",
                border: `1px solid ${theme.border}`,
                borderRadius: "8px",
                width: "36px",
                height: "36px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                fontSize: "1rem",
                transition: "all 0.15s",
              }}
            >
              {lightMode ? "🌙" : "☀️"}
            </button>

            {/* Chapter selector */}
            <select
              value={selectedChapter}
              onChange={(e) => {
                const ch = Number(e.target.value);
                goToChapter(selectedVolume, selectedBookId, selectedBookName || "", ch, chapterCount);
              }}
              style={{
                background: lightMode ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.06)",
                border: `1px solid ${theme.border}`,
                borderRadius: "8px",
                color: theme.text,
                padding: "6px 10px",
                fontSize: "0.82rem",
                fontFamily: "inherit",
                cursor: "pointer",
                outline: "none",
              }}
            >
              {Array.from({ length: chapterCount }, (_, i) => i + 1).map((ch) => (
                <option key={ch} value={ch}>
                  {isDC ? `Sec ${ch}` : `Ch ${ch}`}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Verses */}
        <div
          style={{
            maxWidth: "680px",
            margin: "0 auto",
            padding: isMobile ? "24px 20px 100px" : "40px 32px 120px",
          }}
        >
          {/* Volume context */}
          <div
            style={{
              fontSize: "0.72rem",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.15em",
              color: theme.textMuted,
              marginBottom: "6px",
            }}
          >
            {vol?.name}
          </div>

          {/* Chapter heading */}
          <h2
            style={{
              fontSize: isMobile ? "1.5rem" : "1.8rem",
              fontWeight: 700,
              color: theme.text,
              marginBottom: "4px",
              letterSpacing: "-0.01em",
            }}
          >
            {selectedBookName}
          </h2>
          <div
            style={{
              fontSize: "0.85rem",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              color: volColor,
              marginBottom: "32px",
            }}
          >
            {chapterLabel}
          </div>

          {/* Chapter Insights Panel */}
          {!isLoading && verses.length > 0 && (
            <ChapterInsights
              bookId={selectedBookId}
              chapter={selectedChapter}
              bookName={selectedBookName || ""}
              volumeAbbrev={selectedVolume}
              volColor={volColor}
              lightMode={lightMode}
              isMobile={isMobile}
              onScrollToVerse={(verse) => {
                const el = document.getElementById(`verse-${verse}`);
                if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
              }}
            />
          )}

          {isLoading && (
            <div style={{ textAlign: "center", padding: "60px", color: theme.textMuted }}>
              Loading...
            </div>
          )}

          {!isLoading &&
            verses.map((v) => {
              const externalUrl = getVerseUrl(selectedBookName || "", v.chapter, v.verse);
              return (
                <div
                  key={v.verse}
                  id={`verse-${v.verse}`}
                  style={{
                    marginBottom: "4px",
                    lineHeight: 2,
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      color: theme.verseNum,
                      marginRight: "6px",
                      verticalAlign: "super",
                      cursor: externalUrl ? "pointer" : "default",
                      transition: "color 0.15s",
                    }}
                    title={externalUrl ? "Open on churchofjesuschrist.org" : undefined}
                    onClick={() => {
                      if (externalUrl) window.open(externalUrl, "_blank");
                    }}
                    onMouseEnter={(e) => { if (externalUrl) e.currentTarget.style.color = volColor; }}
                    onMouseLeave={(e) => { if (externalUrl) e.currentTarget.style.color = theme.verseNum; }}
                  >
                    {v.verse}
                  </span>
                  <span
                    onClick={() => setActiveVerse({ verse: v.verse, chapter: v.chapter, text: v.text })}
                    style={{
                      fontSize: fontSizes[fontSize].body,
                      color: theme.verseText,
                      transition: "font-size 0.2s ease",
                      cursor: "pointer",
                    }}
                  >
                    {renderVerseText(v.text)}
                  </span>
                </div>
              );
            })}

          {/* End of chapter - next/prev hint */}
          {!isLoading && verses.length > 0 && (
            <div
              style={{
                marginTop: "48px",
                paddingTop: "24px",
                borderTop: `1px solid ${theme.border}`,
                display: "flex",
                justifyContent: "center",
                gap: "24px",
                flexWrap: "wrap",
              }}
            >
              {!isFirstChapterOfVolume && (
                <button
                  onClick={goToPrevChapter}
                  style={{
                    background: "none",
                    border: `1px solid ${theme.border}`,
                    borderRadius: "8px",
                    padding: "10px 20px",
                    color: theme.textSecondary,
                    fontSize: "0.85rem",
                    fontFamily: "inherit",
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = volColor; e.currentTarget.style.color = theme.text; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.color = theme.textSecondary; }}
                >
                  ← {prevLabel}
                </button>
              )}
              {!isLastChapterOfVolume && (
                <button
                  onClick={goToNextChapter}
                  style={{
                    background: `${volColor}15`,
                    border: `1px solid ${volColor}40`,
                    borderRadius: "8px",
                    padding: "10px 20px",
                    color: volColor,
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    fontFamily: "inherit",
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = `${volColor}25`; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = `${volColor}15`; }}
                >
                  {nextLabel} →
                </button>
              )}
            </div>
          )}

          {/* Keyboard hint (desktop only) */}
          {!isMobile && !isLoading && verses.length > 0 && (
            <div style={{ textAlign: "center", marginTop: "16px", fontSize: "0.72rem", color: theme.textMuted }}>
              Use ← → arrow keys to navigate chapters
            </div>
          )}
        </div>

        {/* Bottom nav */}
        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            background: lightMode ? "rgba(250, 249, 246, 0.95)" : "rgba(15, 15, 18, 0.95)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            borderTop: `1px solid ${theme.border}`,
            padding: isMobile ? "8px 16px" : "10px 24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            zIndex: 50,
          }}
        >
          <button
            onClick={goToPrevChapter}
            disabled={isFirstChapterOfVolume}
            style={{
              background: "none",
              border: "none",
              color: theme.textSecondary,
              cursor: isFirstChapterOfVolume ? "default" : "pointer",
              fontSize: "0.85rem",
              fontWeight: 600,
              fontFamily: "inherit",
              padding: "8px 12px",
              opacity: isFirstChapterOfVolume ? 0.3 : 1,
              minWidth: "80px",
              textAlign: "left",
            }}
          >
            ← Prev
          </button>
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                fontSize: "0.75rem",
                color: theme.textMuted,
                fontWeight: 500,
              }}
            >
              {isDC ? "Section" : "Chapter"} {selectedChapter} of {chapterCount}
            </div>
          </div>
          <button
            onClick={goToNextChapter}
            disabled={isLastChapterOfVolume}
            style={{
              background: "none",
              border: "none",
              color: theme.textSecondary,
              cursor: isLastChapterOfVolume ? "default" : "pointer",
              fontSize: "0.85rem",
              fontWeight: 600,
              fontFamily: "inherit",
              padding: "8px 12px",
              opacity: isLastChapterOfVolume ? 0.3 : 1,
              minWidth: "80px",
              textAlign: "right",
            }}
          >
            Next →
          </button>
        </div>

        {/* Verse Popover */}
        {activeVerse && selectedBookId && selectedVolume && (
          <VersePopover
            bookId={selectedBookId}
            chapter={activeVerse.chapter}
            verse={activeVerse.verse}
            text={activeVerse.text}
            bookName={selectedBookName || ""}
            volumeAbbrev={selectedVolume}
            volColor={volColor}
            lightMode={lightMode}
            isMobile={isMobile}
            onClose={() => setActiveVerse(null)}
          />
        )}
      </div>
    );
  }

  // ── BOOK/CHAPTER PICKER VIEW ──
  if (selectedVolume) {
    const vol = volumes.find((v) => v.abbrev === selectedVolume);
    const volColor = VOLUME_COLORS[selectedVolume] || "#3B82F6";

    return (
      <div>
        {/* Breadcrumb */}
        <div style={{ marginBottom: "24px", display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            onClick={() => setSelectedVolume(null)}
            style={{
              background: "none",
              border: "none",
              color: "var(--accent)",
              cursor: "pointer",
              fontSize: "0.88rem",
              fontWeight: 500,
              fontFamily: "inherit",
              padding: 0,
              textDecoration: "underline",
              textUnderlineOffset: "3px",
            }}
          >
            Volumes
          </button>
          <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>›</span>
          <span style={{ color: volColor, fontSize: "0.88rem", fontWeight: 600 }}>
            {vol?.name}
          </span>
        </div>

        <h2
          style={{
            fontSize: "1.4rem",
            fontWeight: 700,
            color: "var(--text)",
            marginBottom: "6px",
          }}
        >
          <span style={{ color: volColor }}>{vol?.name}</span>
        </h2>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.92rem", marginBottom: "24px" }}>
          Select a book to start reading.
        </p>

        {/* Book list */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(260px, 1fr))",
            gap: "12px",
          }}
        >
          {vol?.books.map((book) => (
            <button
              key={book.id}
              onClick={() => {
                goToChapter(selectedVolume, book.id, book.name, 1, book.chapterCount);
              }}
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "10px",
                padding: "16px 20px",
                textAlign: "left",
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "all 0.15s",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = volColor;
                e.currentTarget.style.background = `${volColor}10`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border)";
                e.currentTarget.style.background = "var(--surface)";
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: "0.95rem",
                    fontWeight: 600,
                    color: "var(--text)",
                    marginBottom: "2px",
                  }}
                >
                  {book.name}
                </div>
                <div
                  style={{
                    fontSize: "0.78rem",
                    color: "var(--text-muted)",
                  }}
                >
                  {book.chapterCount} {selectedVolume === "D&C" ? (book.chapterCount === 1 ? "section" : "sections") : (book.chapterCount === 1 ? "chapter" : "chapters")}
                </div>
              </div>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--text-muted)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── VOLUME PICKER VIEW ──
  return (
    <div>
      <div style={{ marginBottom: "24px" }}>
        <h2
          style={{
            fontSize: "1.4rem",
            fontWeight: 700,
            color: "var(--text)",
            marginBottom: "6px",
          }}
        >
          Read the Scriptures
        </h2>
        <p style={{ color: "var(--text-secondary)", fontSize: isMobile ? "0.85rem" : "0.92rem" }}>
          Choose a volume to begin reading. Navigate through books and chapters
          with a clean, focused reading experience.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(280px, 1fr))",
          gap: "16px",
        }}
      >
        {volumes.map((vol) => {
          const color = VOLUME_COLORS[vol.abbrev] || "#3B82F6";
          return (
            <button
              key={vol.id}
              onClick={() => setSelectedVolume(vol.abbrev)}
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "12px",
                padding: "24px",
                textAlign: "left",
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "all 0.2s",
                position: "relative",
                overflow: "hidden",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = color;
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = `0 8px 24px ${color}20`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border)";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              {/* Color accent bar */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: "3px",
                  background: color,
                }}
              />
              <div
                style={{
                  fontSize: "1.1rem",
                  fontWeight: 700,
                  color: "var(--text)",
                  marginBottom: "6px",
                }}
              >
                {vol.name}
              </div>
              <div
                style={{
                  fontSize: "0.82rem",
                  color: "var(--text-muted)",
                }}
              >
                {vol.books.length} {vol.books.length === 1 ? "book" : "books"}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
