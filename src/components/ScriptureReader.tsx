"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Volume, Resource, SpeakerAttribution, SpeakerType } from "@/lib/types";
import { VOLUME_COLORS } from "@/lib/constants";
import { getVerseUrl } from "@/lib/scripture-urls";
import ChapterInsights from "./ChapterInsights";
import VersePopover from "./VersePopover";
import ResourceMarker, { ResourceOverflowBadge, getResourceTypeColor } from "./ResourceMarker";
import ResourcePanel from "./ResourcePanel";
import WordExplorerPanel from "./WordExplorerPanel";
import NavMenu from "./NavMenu";
import { markChapterRead, isChapterRead, getReadChaptersForBook, getVolumeProgress } from "@/lib/reading-progress";
import { getAnnotationsForChapter } from "@/lib/annotations";

interface ReaderVerse {
  chapter: number;
  verse: number;
  text: string;
  text_modern?: string | null;
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [exploredWord, setExploredWord] = useState<string | null>(null);

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

  // Current visible verse (for search navigator sync)
  const [currentVisibleVerse, setCurrentVisibleVerse] = useState(1);

  // Reading progress
  const [chapterMarkedRead, setChapterMarkedRead] = useState(false);
  const [showReadToast, setShowReadToast] = useState(false);
  // (streak counter removed)

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

  // Annotations — track which verses in current chapter have notes
  const [annotatedVerses, setAnnotatedVerses] = useState<Set<number>>(new Set());

  // Resource layer
  const [showResources, setShowResources] = useState(true);
  const [chapterResources, setChapterResources] = useState<Resource[]>([]);
  const [activeResourcePanel, setActiveResourcePanel] = useState<{ resources: Resource[]; index: number } | null>(null);

  // Speaker attribution layer
  const [showSpeakers, setShowSpeakers] = useState(true);
  const [chapterSpeakers, setChapterSpeakers] = useState<SpeakerAttribution[]>([]);

  // Modern language layer
  const [showModern, setShowModern] = useState(false);
  // Whether the current chapter has any modern text available
  const hasModernText = verses.some((v) => v.text_modern);

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
    const savedResources = localStorage.getItem("reader-show-resources");
    if (savedResources === "false") setShowResources(false);
    const savedSpeakers = localStorage.getItem("reader-show-speakers");
    if (savedSpeakers === "false") setShowSpeakers(false);
    const savedModern = localStorage.getItem("reader-show-modern");
    if (savedModern === "true") setShowModern(true);
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

  // Track which verse is currently visible (for search navigator)
  useEffect(() => {
    if (!verses.length || selectedChapter === null) return;
    const container = scrollContainerRef.current;
    if (!container) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const id = entry.target.id;
            const verseNum = parseInt(id.replace("verse-", ""), 10);
            if (!isNaN(verseNum)) setCurrentVisibleVerse(verseNum);
          }
        }
      },
      { root: container, rootMargin: "-40% 0px -40% 0px", threshold: 0 }
    );
    // Observe all verse elements
    for (const v of verses) {
      const el = document.getElementById(`verse-${v.verse}`);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [verses, selectedChapter]);

  // Auto-mark chapter read when scrolled to bottom
  useEffect(() => {
    if (scrollProgress >= 0.95 && !chapterMarkedRead && selectedBookId && selectedChapter && verses.length > 0) {
      markChapterRead(selectedBookId, selectedChapter);
      setChapterMarkedRead(true);
      setShowReadToast(true);
      setTimeout(() => setShowReadToast(false), 2500);
    }
  }, [scrollProgress, chapterMarkedRead, selectedBookId, selectedChapter, verses]);

  // Reset chapter-read state on chapter change
  useEffect(() => {
    if (selectedBookId && selectedChapter) {
      setChapterMarkedRead(isChapterRead(selectedBookId, selectedChapter));
    }
  }, [selectedBookId, selectedChapter]);

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
                .then((chData) => {
                  setVerses(chData.verses || []);
                  // Load annotations
                  const annotations = getAnnotationsForChapter(bid, ch);
                  setAnnotatedVerses(new Set(annotations.map((a: { verse: number }) => a.verse)));
                  // Load resources + speakers
                  const bookNameForApi = chData.bookName || book.name;
                  fetch(`/api/resources?book=${encodeURIComponent(bookNameForApi)}&chapter=${ch}`)
                    .then((r) => r.json())
                    .then((resData) => setChapterResources(resData.resources || []))
                    .catch(() => {});
                  fetch(`/api/speakers?book=${encodeURIComponent(bookNameForApi)}&chapter=${ch}`)
                    .then((r) => r.json())
                    .then((spkData) => setChapterSpeakers(spkData.speakers || []))
                    .catch(() => {});
                });
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
      // Load annotations for this chapter
      const annotations = getAnnotationsForChapter(bookId, chapter);
      setAnnotatedVerses(new Set(annotations.map((a) => a.verse)));
      // Load resources for this chapter
      setChapterResources([]);
      setActiveResourcePanel(null);
      // Load speakers for this chapter
      setChapterSpeakers([]);
      const bookNameForApi = data.bookName || "";
      try {
        const resResp = await fetch(`/api/resources?book=${encodeURIComponent(bookNameForApi)}&chapter=${chapter}`);
        const resData = await resResp.json();
        setChapterResources(resData.resources || []);
      } catch {
        // Resources are non-critical, don't block reading
      }
      try {
        const spkResp = await fetch(`/api/speakers?book=${encodeURIComponent(bookNameForApi)}&chapter=${chapter}`);
        const spkData = await spkResp.json();
        setChapterSpeakers(spkData.speakers || []);
      } catch {
        // Speakers are non-critical
      }
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

  // Per-verse match data for search navigator
  const verseMatches = activeHighlight
    ? verses.map((v) => {
        const escaped = activeHighlight.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(`\\b${escaped}\\b`, "gi");
        const matches = v.text.match(regex);
        return { verse: v.verse, count: matches ? matches.length : 0 };
      })
    : [];

  const searchMatchCount = verseMatches.reduce((sum, v) => sum + v.count, 0);
  const maxVerseMatches = Math.max(...verseMatches.map((v) => v.count), 1);

  const renderVerseText = (text: string) => {
    if (!activeHighlight) return text;
    const escaped = activeHighlight.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(\\b${escaped}\\b)`, "gi");
    const parts = text.split(regex);
    // Use volume color for highlights
    const volHighlightColor = selectedVolume ? VOLUME_COLORS[selectedVolume] || "#3B82F6" : "#3B82F6";
    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark
          key={i}
          style={{
            background: lightMode ? `${volHighlightColor}30` : `${volHighlightColor}40`,
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
  // Speaker type colors — darker in light mode for readability
  const SPEAKER_COLORS: Record<SpeakerType, string> = lightMode
    ? {
        divine: "#9A6B00",
        prophet: "#1D4ED8",
        apostle: "#047857",
        angel: "#6D28D9",
        narrator: "#374151",
        other: "#4B5563",
      }
    : {
        divine: "#F5A623",
        prophet: "#3B82F6",
        apostle: "#10B981",
        angel: "#A78BFA",
        narrator: "#6B7280",
        other: "#9CA3AF",
      };

  const theme = lightMode
    ? {
        bg: "#f8f6f1",
        text: "#222222",
        textSecondary: "#555555",
        textMuted: "#999999",
        surface: "rgba(0, 0, 0, 0.04)",
        border: "rgba(0, 0, 0, 0.10)",
        verseNum: "#bbbbbb",
        verseText: "#333333",
      }
    : {
        bg: "#1a1a21",
        text: "#f0f0f0",
        textSecondary: "#b0b0b0",
        textMuted: "#666666",
        surface: "rgba(255, 255, 255, 0.05)",
        border: "rgba(255, 255, 255, 0.08)",
        verseNum: "#555555",
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
        {/* Reading progress bar — volume color gradient */}
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            height: "3px",
            width: `${scrollProgress * 100}%`,
            background: "linear-gradient(90deg, #DC2F4B 0%, #E8532C 25%, #F57B20 50%, #F5A623 75%, #F5C829 100%)",
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
            background: lightMode ? "rgba(248, 246, 241, 0.95)" : "rgba(17, 17, 22, 0.95)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            borderBottom: `1px solid ${theme.border}`,
            padding: isMobile ? "10px 16px" : "12px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {/* Tree logo — centered on desktop, opens nav menu */}
          {!isMobile && (
            <div style={{
              position: "absolute",
              left: 0,
              right: 0,
              display: "flex",
              justifyContent: "center",
              pointerEvents: "none",
            }}>
              <button
                onClick={() => setMenuOpen(true)}
                title="Menu"
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "4px",
                  opacity: 0.6,
                  transition: "opacity 0.15s",
                  display: "flex",
                  alignItems: "center",
                  pointerEvents: "auto",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = "0.6"; }}
              >
                <img src="/tree-logo.svg" alt="Menu" style={{ height: "22px", width: "auto", filter: lightMode ? "invert(1)" : "none" }} />
              </button>
            </div>
          )}
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
                  color: theme.textMuted,
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
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
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
                transition: "all 0.15s",
                color: theme.textSecondary,
              }}
            >
              {lightMode ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              )}
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

        {/* Nav Menu */}
        <NavMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />

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
              color: theme.textMuted,
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
              onExploreWord={(word) => setExploredWord(word)}
              speakers={chapterSpeakers}
            />
          )}

          {isLoading && (
            <div style={{ textAlign: "center", padding: "60px", color: theme.textMuted }}>
              Loading...
            </div>
          )}

          {/* Layers section — toggle pills for Speakers and Resources */}
          {!isLoading && (chapterSpeakers.length > 0 || chapterResources.length > 0 || hasModernText) && (
            <div style={{ marginBottom: "20px" }}>
              <div
                style={{
                  fontSize: "0.62rem",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: theme.textMuted,
                  marginBottom: "8px",
                }}
              >
                Layers
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                {chapterSpeakers.length > 0 && (
                  <button
                    onClick={() => {
                      const next = !showSpeakers;
                      setShowSpeakers(next);
                      localStorage.setItem("reader-show-speakers", String(next));
                    }}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      padding: "3px 9px",
                      borderRadius: "6px",
                      border: `1px solid ${showSpeakers ? (lightMode ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.15)") : theme.border}`,
                      background: showSpeakers
                        ? (lightMode ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.08)")
                        : "transparent",
                      color: showSpeakers ? theme.text : theme.textMuted,
                      fontSize: "0.65rem",
                      fontWeight: 500,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      transition: "all 0.15s",
                    }}
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    Speakers
                  </button>
                )}
                {chapterResources.length > 0 && (
                  <button
                    onClick={() => {
                      const next = !showResources;
                      setShowResources(next);
                      localStorage.setItem("reader-show-resources", String(next));
                    }}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      padding: "3px 9px",
                      borderRadius: "6px",
                      border: `1px solid ${showResources ? (lightMode ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.15)") : theme.border}`,
                      background: showResources
                        ? (lightMode ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.08)")
                        : "transparent",
                      color: showResources ? theme.text : theme.textMuted,
                      fontSize: "0.65rem",
                      fontWeight: 500,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      transition: "all 0.15s",
                    }}
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                      <line x1="8" y1="21" x2="16" y2="21" />
                      <line x1="12" y1="17" x2="12" y2="21" />
                    </svg>
                    Resources
                    <span style={{ fontSize: "0.58rem", color: theme.textMuted }}>
                      ({chapterResources.length})
                    </span>
                  </button>
                )}
                {hasModernText && (
                  <button
                    onClick={() => {
                      const next = !showModern;
                      setShowModern(next);
                      localStorage.setItem("reader-show-modern", String(next));
                    }}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      padding: "3px 9px",
                      borderRadius: "6px",
                      border: `1px solid ${showModern ? (lightMode ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.15)") : theme.border}`,
                      background: showModern
                        ? (lightMode ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.08)")
                        : "transparent",
                      color: showModern ? theme.text : theme.textMuted,
                      fontSize: "0.65rem",
                      fontWeight: 500,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      transition: "all 0.15s",
                    }}
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 21V14" /><path d="M4 10V3" /><path d="M12 21V12" /><path d="M12 8V3" /><path d="M20 21V16" /><path d="M20 12V3" />
                      <line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" />
                    </svg>
                    Modern
                  </button>
                )}
              </div>

              {/* Speaker legend — shown below toggle when Speakers is on */}
              {showSpeakers && chapterSpeakers.length > 0 && (() => {
                const uniqueSpeakers = Array.from(
                  new Map(chapterSpeakers.map((s) => [s.speaker, s])).values()
                );
                return (
                  <div
                    style={{
                      marginTop: "10px",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      flexWrap: "wrap",
                    }}
                  >
                    <span style={{
                      fontSize: "0.58rem",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      color: theme.textMuted,
                      marginRight: "2px",
                    }}>
                      Speakers:
                    </span>
                    {uniqueSpeakers.slice(0, 8).map((s) => (
                      <span
                        key={s.speaker}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "3px",
                          padding: "1px 7px",
                          borderRadius: "4px",
                          background: lightMode
                            ? `${SPEAKER_COLORS[s.speakerType]}18`
                            : `${SPEAKER_COLORS[s.speakerType]}20`,
                          border: `1px solid ${SPEAKER_COLORS[s.speakerType]}${lightMode ? "30" : "40"}`,
                          color: SPEAKER_COLORS[s.speakerType],
                          fontWeight: 600,
                          fontSize: "0.58rem",
                          textTransform: "uppercase",
                          letterSpacing: "0.03em",
                        }}
                      >
                        <span style={{
                          width: "5px",
                          height: "5px",
                          borderRadius: "50%",
                          background: SPEAKER_COLORS[s.speakerType],
                          flexShrink: 0,
                        }} />
                        {s.speaker}
                      </span>
                    ))}
                    {uniqueSpeakers.length > 8 && (
                      <span style={{ fontSize: "0.58rem", color: theme.textMuted }}>
                        +{uniqueSpeakers.length - 8} more
                      </span>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {!isLoading &&
            verses.map((v) => {
              // External URL available if needed: getVerseUrl(selectedBookName || "", v.chapter, v.verse)
              // Resource layer: find resources that START at this verse, and resources that COVER this verse
              const verseStartResources = showResources
                ? chapterResources.filter((r) => r.verseStart === v.verse)
                : [];
              const verseCoveredBy = showResources
                ? chapterResources.filter((r) => v.verse >= r.verseStart && v.verse <= r.verseEnd)
                : [];
              // Speaker attribution for this verse
              const verseSpeaker = showSpeakers
                ? chapterSpeakers.find((s) => v.verse >= s.verseStart && v.verse <= s.verseEnd)
                : null;
              const isFirstOfSpeakerSpan = verseSpeaker && v.verse === verseSpeaker.verseStart;
              const speakerColor = verseSpeaker ? SPEAKER_COLORS[verseSpeaker.speakerType] : null;
              // Left border: speaker takes priority, then resource
              const resourceBorderColor = verseCoveredBy.length > 0
                ? getResourceTypeColor(verseCoveredBy[0].type)
                : null;
              const leftBorderColor = speakerColor || resourceBorderColor;
              // Calculate speaker span height (number of verses in this span)
              const speakerSpanLength = verseSpeaker
                ? verseSpeaker.verseEnd - verseSpeaker.verseStart + 1
                : 0;
              return (
                <div
                  key={v.verse}
                  id={`verse-${v.verse}`}
                  style={{
                    marginBottom: "4px",
                    lineHeight: 2,
                    position: "relative",
                    display: "flex",
                    alignItems: "stretch",
                  }}
                >
                  {/* Vertical speaker name — left of bar, only on first verse of span */}
                  {verseSpeaker && showSpeakers ? (
                    <div
                      style={{
                        width: isFirstOfSpeakerSpan ? "22px" : "22px",
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "center",
                        paddingTop: isFirstOfSpeakerSpan ? "4px" : "0",
                        position: "relative",
                      }}
                    >
                      {isFirstOfSpeakerSpan && verseSpeaker && (
                        <span
                          style={{
                            writingMode: "vertical-rl",
                            textOrientation: "mixed",
                            transform: "rotate(180deg)",
                            fontSize: "0.52rem",
                            fontWeight: 700,
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            color: speakerColor || undefined,
                            opacity: 0.7,
                            whiteSpace: "nowrap",
                            lineHeight: 1,
                            maxHeight: `${speakerSpanLength * 3.2}em`,
                            overflow: "hidden",
                          }}
                        >
                          {verseSpeaker.speaker}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div style={{ width: showSpeakers ? "22px" : "0px", flexShrink: 0 }} />
                  )}
                  {/* Verse content with left border bar */}
                  <div
                    style={{
                      flex: 1,
                      minWidth: 0,
                      borderLeft: leftBorderColor ? `3px solid ${leftBorderColor}${speakerColor ? "50" : "25"}` : "3px solid transparent",
                      paddingLeft: "10px",
                      transition: "border-color 0.3s ease",
                    }}
                  >
                  <span
                    style={{
                      fontSize: "0.82rem",
                      fontWeight: 700,
                      color: theme.verseNum,
                      marginRight: "6px",
                    }}
                  >
                    {v.verse}
                  </span>
                  {annotatedVerses.has(v.verse) && (
                    <span
                      title="You have a note on this verse"
                      style={{
                        fontSize: "0.6rem",
                        color: volColor,
                        marginRight: "4px",
                        verticalAlign: "super",
                        opacity: 0.7,
                      }}
                    >
                      ✎
                    </span>
                  )}
                  <span
                    onClick={() => {
                      setActiveVerse({ verse: v.verse, chapter: v.chapter, text: showModern && v.text_modern ? v.text_modern : v.text });
                      setActiveResourcePanel(null); // close resource panel when opening verse popover
                    }}
                    style={{
                      fontSize: fontSizes[fontSize].body,
                      color: theme.verseText,
                      transition: "font-size 0.2s ease",
                      cursor: "pointer",
                    }}
                  >
                    {renderVerseText(showModern && v.text_modern ? v.text_modern : v.text)}
                  </span>
                  {/* Resource markers */}
                  {verseStartResources.length > 0 && (
                    <>
                      {verseStartResources.slice(0, 3).map((r, ri) => (
                        <ResourceMarker
                          key={r.id}
                          resource={r}
                          lightMode={lightMode}
                          onClick={() => {
                            setActiveVerse(null); // close verse popover
                            setActiveResourcePanel({
                              resources: chapterResources,
                              index: chapterResources.indexOf(r),
                            });
                          }}
                        />
                      ))}
                      {verseStartResources.length > 3 && (
                        <ResourceOverflowBadge
                          count={verseStartResources.length - 3}
                          lightMode={lightMode}
                          onClick={() => {
                            setActiveVerse(null);
                            setActiveResourcePanel({
                              resources: chapterResources,
                              index: chapterResources.indexOf(verseStartResources[0]),
                            });
                          }}
                        />
                      )}
                    </>
                  )}
                  </div>
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
                    background: lightMode ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.08)",
                    border: `1px solid ${lightMode ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.12)"}`,
                    borderRadius: "8px",
                    padding: "10px 20px",
                    color: theme.text,
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    fontFamily: "inherit",
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = lightMode ? "rgba(0,0,0,0.10)" : "rgba(255,255,255,0.12)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = lightMode ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.08)"; }}
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

        {/* Search occurrence navigator — visual minimap of matches */}
        {activeHighlight && searchMatchCount > 0 && (
          <div
            style={{
              position: "fixed",
              bottom: isMobile ? "40px" : "44px",
              left: 0,
              right: 0,
              zIndex: 51,
              padding: isMobile ? "4px 12px" : "6px 24px",
              background: lightMode ? "rgba(248, 246, 241, 0.92)" : "rgba(17, 17, 22, 0.92)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              borderTop: `1px solid ${theme.border}`,
              display: "flex",
              alignItems: "center",
              gap: isMobile ? "8px" : "12px",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: isMobile ? "40px" : "50px" }}>
              <span style={{ fontSize: "0.68rem", color: volColor, fontWeight: 700 }}>
                {searchMatchCount}
              </span>
              <span style={{ fontSize: "0.55rem", color: theme.textMuted, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {searchMatchCount !== 1 ? "matches" : "match"}
              </span>
            </div>
            <div
              style={{
                flex: 1,
                display: "flex",
                gap: "1px",
                height: isMobile ? "16px" : "22px",
                borderRadius: "3px",
                overflow: "hidden",
              }}
            >
              {verseMatches.map((vm) => {
                const hasMatch = vm.count > 0;
                const intensity = hasMatch ? 0.3 + (vm.count / maxVerseMatches) * 0.7 : 0;
                const isCurrent = vm.verse === currentVisibleVerse;
                return (
                  <div
                    key={vm.verse}
                    onClick={() => {
                      const el = document.getElementById(`verse-${vm.verse}`);
                      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
                    }}
                    style={{
                      flex: 1,
                      background: hasMatch ? volColor : (lightMode ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.03)"),
                      opacity: hasMatch ? intensity : 1,
                      cursor: "pointer",
                      transition: "all 0.25s ease",
                      borderRadius: "1px",
                      transform: isCurrent ? "scaleY(1.5)" : "scaleY(1)",
                      transformOrigin: "bottom",
                      boxShadow: isCurrent ? `0 -2px 8px ${volColor}50` : "none",
                      outline: isCurrent ? `1.5px solid ${volColor}` : "none",
                      outlineOffset: "-1px",
                    }}
                    title={hasMatch ? `Verse ${vm.verse}: ${vm.count} match${vm.count !== 1 ? "es" : ""}` : `Verse ${vm.verse}`}
                  />
                );
              })}
            </div>
            {/* Current verse indicator */}
            {!isMobile && (
              <span style={{ fontSize: "0.62rem", color: theme.textMuted, whiteSpace: "nowrap", minWidth: "36px", textAlign: "right" }}>
                v.{currentVisibleVerse}
              </span>
            )}
          </div>
        )}

        {/* Bottom nav */}
        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            background: lightMode ? "#222222" : "#faf9f6",
            backdropFilter: "none",
            WebkitBackdropFilter: "none",
            borderTop: lightMode ? "none" : "none",
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
              color: lightMode ? "#ffffff" : "#222222",
              cursor: isFirstChapterOfVolume ? "default" : "pointer",
              fontSize: "0.82rem",
              fontWeight: 600,
              fontFamily: "inherit",
              padding: "8px 12px",
              opacity: isFirstChapterOfVolume ? 0.3 : 1,
              minWidth: "80px",
              textAlign: "left",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" strokeLinejoin="miter"><polyline points="15 18 9 12 15 6" /></svg> Prev
          </button>
          <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
            {isMobile && (
              <button
                onClick={() => setMenuOpen(true)}
                title="Menu"
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "2px",
                  opacity: 0.6,
                  transition: "opacity 0.15s",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = "0.6"; }}
              >
                <img src="/tree-logo.svg" alt="Menu" style={{ height: "22px", width: "auto", filter: lightMode ? "none" : "invert(1)" }} />
              </button>
            )}
          </div>
          <button
            onClick={goToNextChapter}
            disabled={isLastChapterOfVolume}
            style={{
              background: "none",
              border: "none",
              color: lightMode ? "#ffffff" : "#222222",
              cursor: isLastChapterOfVolume ? "default" : "pointer",
              fontSize: "0.82rem",
              fontWeight: 600,
              fontFamily: "inherit",
              padding: "8px 12px",
              opacity: isLastChapterOfVolume ? 0.3 : 1,
              minWidth: "80px",
              textAlign: "right",
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: "6px",
            }}
          >
            Next <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" strokeLinejoin="miter"><polyline points="9 18 15 12 9 6" /></svg>
          </button>
        </div>

        {/* Chapter Complete Toast */}
        {showReadToast && (
          <div
            style={{
              position: "fixed",
              top: "80px",
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 150,
              background: lightMode ? "#222" : "#f0f0f0",
              color: lightMode ? "#fff" : "#111",
              padding: "10px 24px",
              borderRadius: "24px",
              fontSize: "0.85rem",
              fontWeight: 600,
              boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
              animation: "fadeIn 0.3s ease",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            ✓ Chapter complete!
          </div>
        )}

        {/* Word Explorer Panel */}
        {exploredWord && selectedBookId && selectedVolume && (
          <WordExplorerPanel
            word={exploredWord}
            bookId={selectedBookId}
            bookName={selectedBookName || ""}
            chapter={selectedChapter!}
            chapterCount={chapterCount}
            volumeAbbrev={selectedVolume}
            volColor={volColor}
            lightMode={lightMode}
            isMobile={isMobile}
            onClose={() => setExploredWord(null)}
            onNavigateToChapter={(ch) => {
              goToChapter(selectedVolume, selectedBookId, selectedBookName || "", ch, chapterCount);
            }}
          />
        )}

        {/* Resource Panel */}
        {activeResourcePanel && selectedBookId && selectedVolume && (
          <ResourcePanel
            resources={activeResourcePanel.resources}
            initialIndex={activeResourcePanel.index}
            bookName={selectedBookName || ""}
            volColor={volColor}
            lightMode={lightMode}
            isMobile={isMobile}
            onClose={() => setActiveResourcePanel(null)}
          />
        )}

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
            onClose={() => {
              setActiveVerse(null);
              // Refresh annotation indicators
              if (selectedBookId && selectedChapter) {
                const annotations = getAnnotationsForChapter(selectedBookId, selectedChapter);
                setAnnotatedVerses(new Set(annotations.map((a) => a.verse)));
              }
            }}
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
                  {(() => {
                    const readCount = getReadChaptersForBook(book.id, book.chapterCount);
                    const label = selectedVolume === "D&C" ? (book.chapterCount === 1 ? "section" : "sections") : (book.chapterCount === 1 ? "chapter" : "chapters");
                    return (
                      <>
                        {book.chapterCount} {label}
                        {readCount > 0 && (
                          <span style={{ color: volColor, marginLeft: "6px" }}>
                            · {readCount === book.chapterCount ? "✓ Complete" : `${readCount} read`}
                          </span>
                        )}
                      </>
                    );
                  })()}
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
                {(() => {
                  const progress = getVolumeProgress(vol.books.map(b => ({ id: b.id, chapterCount: b.chapterCount })));
                  return (
                    <>
                      {vol.books.length} {vol.books.length === 1 ? "book" : "books"}
                      {progress.read > 0 && (
                        <span style={{ marginLeft: "8px", color }}>
                          · {progress.percentage}% read
                        </span>
                      )}
                    </>
                  );
                })()}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
