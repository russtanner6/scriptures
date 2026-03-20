"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Volume, Resource, SpeakerAttribution, SpeakerType, ScriptureCharacter } from "@/lib/types";
import { VOLUME_COLORS } from "@/lib/constants";
import { getVerseUrl } from "@/lib/scripture-urls";
import ChapterInsights from "./ChapterInsights";
import CharacterDetailPanel from "./CharacterDetailPanel";
import VersePopover from "./VersePopover";
import ResourceMarker, { getResourceTypeColor } from "./ResourceMarker";
import ResourcePanel from "./ResourcePanel";
import WordExplorerPanel from "./WordExplorerPanel";
import NavMenu from "./NavMenu";
import { markChapterRead, isChapterRead, getReadChaptersForBook, getVolumeProgress } from "@/lib/reading-progress";
import { modalStyles as mStyles, getModalTheme } from "@/lib/modal-styles";
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

  // Character panel
  const [allCharacters, setAllCharacters] = useState<ScriptureCharacter[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState<ScriptureCharacter | null>(null);

  // Reading mode: original (default), modern (verse-by-verse modern language), narration (chapter prose)
  type ReadingMode = "original" | "modern" | "narration";
  const [readingMode, setReadingMode] = useState<ReadingMode>("original");
  const [chapterNarration, setChapterNarration] = useState<string | null>(null);
  // Whether the current chapter has modern text or narration available
  const hasModernText = verses.some((v) => v.text_modern);
  const hasNarration = !!chapterNarration;
  // Reading mode help popup
  const [showReadingModeHelp, setShowReadingModeHelp] = useState(false);

  // Search term highlight (when arriving from ScripturePanel)
  const highlightWord = searchParams.get("highlight") || null;

  // Font size map
  const fontSizes = [
    { body: isMobile ? "0.92rem" : "0.95rem", label: "A" },
    { body: isMobile ? "1rem" : "1.05rem", label: "A" },
    { body: isMobile ? "1.1rem" : "1.18rem", label: "A" },
  ];

  // Load all characters (for detail panel navigation)
  useEffect(() => {
    fetch("/api/characters")
      .then((r) => r.json())
      .then((data) => setAllCharacters(data.characters || []))
      .catch(() => {});
  }, []);

  // Helper: open character panel by id
  const openCharacterById = useCallback((characterId: string) => {
    const char = allCharacters.find((c) => c.id === characterId);
    if (char) setSelectedCharacter(char);
  }, [allCharacters]);

  // Helper: open character panel by speaker name (fuzzy match)
  const openCharacterByName = useCallback((speakerName: string) => {
    const nameLower = speakerName.toLowerCase();
    const char = allCharacters.find(
      (c) => c.name.toLowerCase() === nameLower ||
             c.aliases.some((a) => a.toLowerCase() === nameLower)
    );
    if (char) setSelectedCharacter(char);
  }, [allCharacters]);

  // Helper: find character portrait URL by speaker name
  const getCharacterPortrait = useCallback((speakerName: string): string | null => {
    const nameLower = speakerName.toLowerCase();
    const char = allCharacters.find(
      (c) => c.name.toLowerCase() === nameLower ||
             c.aliases.some((a) => a.toLowerCase() === nameLower)
    );
    return char?.portraitUrl || null;
  }, [allCharacters]);

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
    const savedMode = localStorage.getItem("reader-reading-mode");
    if (savedMode === "modern" || savedMode === "narration") setReadingMode(savedMode);
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

        // Deep link: ?bookId=X&chapter=Y&verse=Z
        const urlBookId = searchParams.get("bookId");
        const urlChapter = searchParams.get("chapter");
        const urlVerse = searchParams.get("verse");
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
                  setChapterNarration(chData.narration || null);
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
                  // Scroll to specific verse if provided
                  if (urlVerse) {
                    setTimeout(() => {
                      const el = document.getElementById(`verse-${urlVerse}`);
                      if (el) {
                        el.scrollIntoView({ behavior: "smooth", block: "center" });
                        // Brief highlight flash
                        el.style.transition = "background 0.3s";
                        el.style.background = `rgba(59, 130, 246, 0.15)`;
                        setTimeout(() => { el.style.background = ""; }, 2500);
                      }
                    }, 400);
                  }
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
      setChapterNarration(data.narration || null);
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
        divine: "#B47E00",
        prophet: "#2563EB",
        apostle: "#059669",
        angel: "#7C3AED",
        narrator: "#0E7490",
        other: "#9333EA",
      }
    : {
        divine: "#FBBF24",
        prophet: "#60A5FA",
        apostle: "#34D399",
        angel: "#C4B5FD",
        narrator: "#22D3EE",
        other: "#A78BFA",
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

  const mt = getModalTheme(lightMode);

  // ── READING VIEW ──
  if (selectedChapter !== null && selectedBookId !== null && selectedVolume) {
    const volColor = VOLUME_COLORS[selectedVolume] || "#3B82F6";
    // Bar colors — always dark regardless of light/dark theme
    const bar = {
      bg: "rgba(17, 17, 22, 0.95)",
      border: "rgba(255, 255, 255, 0.08)",
      text: "#f0f0f0",
      textSecondary: "#b0b0b0",
      textMuted: "#666666",
      surface: "rgba(255, 255, 255, 0.06)",
      surfaceBorder: "rgba(255, 255, 255, 0.08)",
    };
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
            background: "rgba(17, 17, 22, 0.95)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
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
                <img src="/tree-logo.svg" alt="Menu" style={{ height: "22px", width: "auto" }} />
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
                color: bar.textSecondary,
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
                  color: bar.text,
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
                  color: bar.textMuted,
                }}
              >
                {chapterLabel}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: isMobile ? "6px" : "8px" }}>
            {/* Light/dark toggle — stays in top bar */}
            <button
              onClick={toggleLightMode}
              title={lightMode ? "Switch to dark mode" : "Switch to light mode"}
              style={{
                background: "none",
                border: "none",
                width: "32px",
                height: "32px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "all 0.15s",
                color: bar.textSecondary,
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
              textAlign: "center",
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
              textAlign: "center",
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
              textAlign: "center",
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
              onSelectCharacter={openCharacterById}
              speakers={chapterSpeakers}
            />
          )}

          {isLoading && (
            <div style={{ textAlign: "center", padding: "60px", color: theme.textMuted }}>
              Loading...
            </div>
          )}

          {/* Layer toggles — no section headings, centered, uniform height, standard blue accent */}
          {!isLoading && (chapterSpeakers.length > 0 || chapterResources.length > 0 || hasModernText || hasNarration) && (() => {
            const toggleAccent = lightMode ? "#4A7FD4" : "#5B8DEF";
            return (
            <div style={{ marginBottom: "36px", textAlign: "center" }}>
              <div style={{ display: "flex", alignItems: "stretch", gap: "8px", flexWrap: "wrap", justifyContent: "center" }}>
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
                      padding: "7px 12px",
                      borderRadius: "8px",
                      border: `1px solid ${showSpeakers ? `${toggleAccent}50` : theme.border}`,
                      background: showSpeakers
                        ? `${toggleAccent}18`
                        : lightMode ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.04)",
                      color: showSpeakers ? toggleAccent : theme.textMuted,
                      fontSize: "0.68rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      transition: "all 0.2s",
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                      padding: "7px 12px",
                      borderRadius: "8px",
                      border: `1px solid ${showResources ? `${toggleAccent}50` : theme.border}`,
                      background: showResources
                        ? `${toggleAccent}18`
                        : lightMode ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.04)",
                      color: showResources ? toggleAccent : theme.textMuted,
                      fontSize: "0.68rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      transition: "all 0.2s",
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                      <line x1="8" y1="21" x2="16" y2="21" />
                      <line x1="12" y1="17" x2="12" y2="21" />
                    </svg>
                    Resources
                    <span style={{ fontSize: "0.6rem", opacity: 0.7 }}>
                      ({chapterResources.length})
                    </span>
                  </button>
                )}
                {/* Three-way reading mode sliding toggle */}
                {(hasModernText || hasNarration) && (() => {
                  const modes: ReadingMode[] = ["original", "modern", "narration"].filter((mode) => {
                    if (mode === "modern") return hasModernText;
                    if (mode === "narration") return hasNarration;
                    return true;
                  }) as ReadingMode[];
                  const labels: Record<ReadingMode, string> = { original: "Original", modern: "Modern", narration: "Narration" };
                  const activeIndex = modes.indexOf(readingMode);
                  const effectiveIndex = activeIndex >= 0 ? activeIndex : 0;
                  const pillWidthPercent = 100 / modes.length;
                  return (
                    <div style={{
                      display: "inline-flex",
                      position: "relative",
                      borderRadius: "8px",
                      border: `1px solid ${theme.border}`,
                      background: lightMode ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.04)",
                      padding: "3px",
                      overflow: "hidden",
                    }}>
                      {/* Sliding indicator */}
                      <div style={{
                        position: "absolute",
                        top: "3px",
                        bottom: "3px",
                        left: `calc(${effectiveIndex * pillWidthPercent}% + 3px)`,
                        width: `calc(${pillWidthPercent}% - 6px)`,
                        borderRadius: "6px",
                        background: toggleAccent,
                        transition: "left 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                        zIndex: 0,
                      }} />
                      {modes.map((mode, i) => {
                        const isActive = readingMode === mode;
                        return (
                          <button
                            key={mode}
                            onClick={() => {
                              setReadingMode(mode);
                              localStorage.setItem("reader-reading-mode", mode);
                            }}
                            style={{
                              position: "relative",
                              zIndex: 1,
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              padding: "4px 12px",
                              borderRadius: "6px",
                              border: "none",
                              background: "transparent",
                              color: isActive ? "#ffffff" : theme.textMuted,
                              fontSize: "0.68rem",
                              fontWeight: 600,
                              cursor: "pointer",
                              fontFamily: "inherit",
                              transition: "color 0.2s",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {labels[mode]}
                          </button>
                        );
                      })}
                    </div>
                  );
                })()}
                {/* Help icon — explains reading modes */}
                {(hasModernText || hasNarration) && (
                  <button
                    onClick={() => setShowReadingModeHelp(true)}
                    title="About reading modes"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      alignSelf: "center",
                      width: "22px",
                      height: "22px",
                      borderRadius: "50%",
                      border: "none",
                      background: lightMode ? "#c0c0c0" : "rgba(255,255,255,0.18)",
                      color: lightMode ? "#ffffff" : "#1a1a1a",
                      fontSize: "0.65rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      transition: "all 0.15s",
                      flexShrink: 0,
                    }}
                  >
                    ?
                  </button>
                )}
              </div>

              {/* Reading mode help popup */}
              {showReadingModeHelp && (
                <div
                  onClick={() => setShowReadingModeHelp(false)}
                  style={mStyles.backdrop}
                >
                  <div
                    onClick={(e) => e.stopPropagation()}
                    style={{ ...mStyles.panel(isMobile), ...mt.panelColors }}
                  >
                    <button
                      onClick={() => setShowReadingModeHelp(false)}
                      style={{ ...mStyles.closeButton, color: mt.closeColor }}
                    >
                      ✕
                    </button>
                    <h3 style={{ ...mStyles.title, color: mt.title }}>
                      Reading Modes
                    </h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                      <div>
                        <div style={{ ...mStyles.sectionTitle, color: mt.title }}>
                          Original
                        </div>
                        <p style={{ ...mStyles.body, color: mt.body }}>
                          The standard scripture text as published — King James Version for the Bible, and the original 1981 edition text for the Book of Mormon.
                        </p>
                      </div>
                      {hasModernText && (
                        <div>
                          <div style={{ ...mStyles.sectionTitle, color: mt.title }}>
                            Modern
                          </div>
                          <p style={{ ...mStyles.body, color: mt.body }}>
                            A verse-by-verse modern English translation designed to be clear and accessible while preserving the original meaning, names, and structure. Old Testament and New Testament use the World English Bible (WEB), a public-domain modern translation. Book of Mormon modern text was carefully generated using AI with strict 1:1 verse alignment and proper-noun preservation, then audited for accuracy.
                          </p>
                        </div>
                      )}
                      {hasNarration && (
                        <div>
                          <div style={{ ...mStyles.sectionTitle, color: mt.title }}>
                            Narration
                          </div>
                          <p style={{ ...mStyles.body, color: mt.body }}>
                            A chapter-level prose summary that retells the events, teachings, and themes of the chapter in a flowing narrative style. Useful for getting an overview before diving into the verses, or for reviewing what a chapter covers.
                          </p>
                        </div>
                      )}
                    </div>
                    <p style={{ ...mStyles.footnote, color: mt.muted, borderTop: `1px solid ${mt.divider}` }}>
                      Modern and Narration modes are supplementary tools to aid understanding. They are not official scripture and should not be used as doctrinal sources. Always refer to the Original text for study and teaching.
                    </p>
                  </div>
                </div>
              )}

            </div>
          );
          })()}

          {/* Narration mode — chapter prose */}
          {!isLoading && readingMode === "narration" && chapterNarration && (
            <div
              style={{
                fontSize: fontSizes[fontSize].body,
                color: theme.verseText,
                lineHeight: 1.9,
                padding: isMobile ? "0 8px" : "0",
                whiteSpace: "pre-wrap",
                transition: "font-size 0.2s ease",
              }}
            >
              {chapterNarration.split("\n\n").map((paragraph, i) => (
                <p key={i} style={{ marginBottom: "1.2em", textIndent: i > 0 ? "1.5em" : "0" }}>
                  {paragraph}
                </p>
              ))}
            </div>
          )}

          {/* Verse-by-verse mode (original or modern) */}
          {!isLoading && readingMode !== "narration" &&
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
                    marginBottom: "28px",
                    lineHeight: 2,
                    position: "relative",
                    display: "flex",
                    alignItems: "stretch",
                  }}
                >
                  {/* Speaker label — horizontal on desktop, circle-only on mobile */}
                  {verseSpeaker && showSpeakers ? (
                    <div
                      style={{
                        width: isMobile ? "24px" : "30px",
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "center",
                        paddingTop: isFirstOfSpeakerSpan ? "4px" : "0",
                        paddingRight: isMobile ? "4px" : "6px",
                        position: "relative",
                      }}
                    >
                      {isFirstOfSpeakerSpan && verseSpeaker && (() => {
                        const portrait = getCharacterPortrait(verseSpeaker.speaker);
                        const avatarSize = isMobile ? 20 : 22;
                        return (
                          <div style={{
                            display: "flex",
                            flexDirection: isMobile ? "column" : "row-reverse",
                            alignItems: "center",
                            gap: isMobile ? "0" : "5px",
                            position: isMobile ? "relative" : "absolute",
                            right: isMobile ? undefined : "6px",
                            top: "2px",
                            whiteSpace: "nowrap",
                          }}>
                            {/* Portrait / avatar circle — closest to scripture (right side on desktop via row-reverse) */}
                            <button
                              onClick={() => openCharacterByName(verseSpeaker.speaker)}
                              title={verseSpeaker.speaker}
                              style={{
                                background: portrait ? "none" : `${speakerColor || "#888"}25`,
                                border: portrait ? `2px solid ${speakerColor || "#888"}` : "none",
                                borderRadius: "50%",
                                width: `${avatarSize}px`,
                                height: `${avatarSize}px`,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: "pointer",
                                padding: 0,
                                flexShrink: 0,
                                overflow: "hidden",
                                transition: "all 0.15s",
                              }}
                            >
                              {portrait ? (
                                <img
                                  src={portrait}
                                  alt=""
                                  style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                    objectPosition: "center 20%",
                                  }}
                                />
                              ) : (
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={speakerColor || "#888"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                  <circle cx="12" cy="7" r="4" />
                                </svg>
                              )}
                            </button>
                            {/* Desktop: horizontal name label extending left */}
                            {!isMobile && (
                              <span
                                style={{
                                  fontSize: "0.58rem",
                                  fontWeight: 700,
                                  letterSpacing: "0.06em",
                                  textTransform: "uppercase",
                                  color: speakerColor || undefined,
                                  lineHeight: 1,
                                  opacity: 0.9,
                                }}
                              >
                                {verseSpeaker.speaker}
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  ) : (
                    <div style={{ width: showSpeakers ? (isMobile ? "24px" : "30px") : "0px", flexShrink: 0 }} />
                  )}
                  {/* Verse content with left border bar */}
                  <div
                    style={{
                      flex: 1,
                      minWidth: 0,
                      borderLeft: leftBorderColor ? `3px solid ${leftBorderColor}${speakerColor ? "50" : "25"}` : "3px solid transparent",
                      paddingLeft: "10px",
                      paddingTop: speakerColor ? "4px" : undefined,
                      paddingBottom: speakerColor ? "4px" : undefined,
                      paddingRight: speakerColor ? "8px" : undefined,
                      background: speakerColor ? `${speakerColor}08` : undefined,
                      borderRadius: speakerColor ? "4px" : undefined,
                      transition: "border-color 0.3s ease, background 0.3s ease",
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
                      setActiveVerse({ verse: v.verse, chapter: v.chapter, text: readingMode === "modern" && v.text_modern ? v.text_modern : v.text });
                      setActiveResourcePanel(null); // close resource panel when opening verse popover
                    }}
                    style={{
                      fontSize: fontSizes[fontSize].body,
                      color: theme.verseText,
                      transition: "font-size 0.2s ease",
                      cursor: "pointer",
                    }}
                  >
                    {renderVerseText(readingMode === "modern" && v.text_modern ? v.text_modern : v.text)}
                  </span>
                  {/* Resource markers — one pill per resource type */}
                  {verseStartResources.length > 0 && (() => {
                    const byType = verseStartResources.reduce((acc, r) => {
                      acc[r.type] = acc[r.type] || [];
                      acc[r.type].push(r);
                      return acc;
                    }, {} as Record<string, typeof verseStartResources>);
                    return Object.entries(byType).map(([, resources]) => (
                      <ResourceMarker
                        key={resources[0].type + "-" + v.verse}
                        resource={resources[0]}
                        lightMode={lightMode}
                        count={resources.length}
                        onClick={() => {
                          setActiveVerse(null);
                          setActiveResourcePanel({
                            resources: chapterResources,
                            index: chapterResources.indexOf(resources[0]),
                          });
                        }}
                      />
                    ));
                  })()}
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

        {/* Bottom bar — nav + controls */}
        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            background: bar.bg,
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            borderTop: `1px solid ${bar.border}`,
            zIndex: 50,
          }}
        >
          {/* Search input row — expands above controls when open */}
          {searchOpen && (
            <div style={{
              padding: "8px 16px",
              borderBottom: `1px solid ${bar.border}`,
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={bar.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
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
                placeholder="Find in chapter..."
                autoFocus
                style={{
                  flex: 1,
                  padding: "6px 10px",
                  borderRadius: "6px",
                  border: "none",
                  background: bar.surface,
                  color: bar.text,
                  fontSize: "0.82rem",
                  fontFamily: "inherit",
                  outline: "none",
                }}
              />
              {searchTerm.length >= 2 && (
                <span style={{ fontSize: "0.7rem", color: bar.textMuted, whiteSpace: "nowrap" }}>
                  {searchMatchCount} found
                </span>
              )}
              <button
                onClick={() => { setSearchOpen(false); setSearchTerm(""); }}
                style={{
                  background: "none",
                  border: "none",
                  color: bar.textMuted,
                  fontSize: "0.82rem",
                  cursor: "pointer",
                  padding: "4px",
                  fontFamily: "inherit",
                }}
              >
                ✕
              </button>
            </div>
          )}
          {/* Main controls row */}
          <div style={{
            padding: isMobile ? "6px 12px" : "8px 20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}>
            {/* Prev */}
            <button
              onClick={goToPrevChapter}
              disabled={isFirstChapterOfVolume}
              title="Previous chapter"
              style={{
                background: "none",
                border: "none",
                color: bar.textSecondary,
                cursor: isFirstChapterOfVolume ? "default" : "pointer",
                padding: "8px",
                opacity: isFirstChapterOfVolume ? 0.3 : 1,
                display: "flex",
                alignItems: "center",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" strokeLinejoin="miter"><polyline points="15 18 9 12 15 6" /></svg>
            </button>

            {/* Center controls */}
            <div style={{ display: "flex", alignItems: "center", gap: isMobile ? "12px" : "16px" }}>
              {/* Search */}
              <button
                onClick={() => {
                  if (searchOpen) {
                    setSearchOpen(false);
                    setSearchTerm("");
                  } else {
                    setSearchOpen(true);
                    setTimeout(() => searchInputRef.current?.focus(), 100);
                  }
                }}
                title="Search in chapter"
                style={{
                  background: "none",
                  border: "none",
                  color: searchOpen ? bar.text : bar.textSecondary,
                  cursor: "pointer",
                  padding: "6px",
                  display: "flex",
                  alignItems: "center",
                  transition: "color 0.15s",
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </button>

              {/* Font size */}
              <button
                onClick={cycleFontSize}
                title="Change font size"
                style={{
                  background: "none",
                  border: "none",
                  color: bar.textSecondary,
                  cursor: "pointer",
                  padding: "6px",
                  display: "flex",
                  alignItems: "center",
                  fontSize: fontSize === 0 ? "0.75rem" : fontSize === 1 ? "0.9rem" : "1.05rem",
                  fontWeight: 700,
                  fontFamily: "inherit",
                  transition: "all 0.15s",
                }}
              >
                {fontSizes[fontSize].label}
              </button>

              {/* Chapter selector */}
              <select
                value={selectedChapter}
                onChange={(e) => {
                  const ch = Number(e.target.value);
                  goToChapter(selectedVolume, selectedBookId, selectedBookName || "", ch, chapterCount);
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: bar.textSecondary,
                  padding: "4px 2px",
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  fontFamily: "inherit",
                  cursor: "pointer",
                  outline: "none",
                  WebkitAppearance: "none",
                  appearance: "none",
                }}
              >
                {Array.from({ length: chapterCount }, (_, i) => i + 1).map((ch) => (
                  <option key={ch} value={ch} style={{ background: "#1a1a22", color: "#f0f0f0" }}>
                    {isDC ? `Sec ${ch}` : `Ch ${ch}`}
                  </option>
                ))}
              </select>

              {/* Menu (mobile only) */}
              {isMobile && (
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
                  }}
                >
                  <img src="/tree-logo.svg" alt="Menu" style={{ height: "20px", width: "auto" }} />
                </button>
              )}
            </div>

            {/* Next */}
            <button
              onClick={goToNextChapter}
              disabled={isLastChapterOfVolume}
              title="Next chapter"
              style={{
                background: "none",
                border: "none",
                color: bar.textSecondary,
                cursor: isLastChapterOfVolume ? "default" : "pointer",
                padding: "8px",
                opacity: isLastChapterOfVolume ? 0.3 : 1,
                display: "flex",
                alignItems: "center",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" strokeLinejoin="miter"><polyline points="9 18 15 12 9 6" /></svg>
            </button>
          </div>
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

        {/* Character Detail Panel */}
        {selectedCharacter && (
          <CharacterDetailPanel
            character={selectedCharacter}
            allCharacters={allCharacters}
            onClose={() => setSelectedCharacter(null)}
            onSelectCharacter={(c) => setSelectedCharacter(c)}
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
