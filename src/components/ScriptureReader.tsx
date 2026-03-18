"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Volume } from "@/lib/types";
import { VOLUME_COLORS } from "@/lib/constants";
import { getVerseUrl } from "@/lib/scripture-urls";

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

// Slugify book name for URLs
function toSlug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-").replace(/[—]/g, "-");
}

// Volume abbreviation to URL slug
const VOL_SLUGS: Record<string, string> = {
  OT: "ot",
  NT: "nt",
  BoM: "bom",
  "D&C": "dc",
  PoGP: "pogp",
};

const VOL_SLUG_REVERSE: Record<string, string> = {
  ot: "OT",
  nt: "NT",
  bom: "BoM",
  dc: "D&C",
  pogp: "PoGP",
};

export default function ScriptureReader() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isMobile = useIsMobile();

  const [volumes, setVolumes] = useState<Volume[]>([]);
  const [lightMode, setLightMode] = useState(false);

  // Navigation state
  const [selectedVolume, setSelectedVolume] = useState<string | null>(null); // volume abbrev
  const [selectedBookId, setSelectedBookId] = useState<number | null>(null);
  const [selectedBookName, setSelectedBookName] = useState<string | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [chapterCount, setChapterCount] = useState<number>(0);

  // Verses
  const [verses, setVerses] = useState<ReaderVerse[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Search term highlight (when arriving from ScripturePanel)
  const highlightWord = searchParams.get("highlight") || null;

  // Load light mode preference
  useEffect(() => {
    const saved = localStorage.getItem("reader-light-mode");
    if (saved === "true") setLightMode(true);
  }, []);

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
          // Find the book in volumes to get volume abbrev
          for (const vol of vols) {
            const book = vol.books.find((b) => b.id === bid);
            if (book) {
              // Clamp chapter to valid range
              ch = Math.max(1, Math.min(ch, book.chapterCount));
              setSelectedVolume(vol.abbrev);
              setSelectedBookId(bid);
              setSelectedBookName(book.name);
              setSelectedChapter(ch);
              setChapterCount(book.chapterCount);
              // Fetch the chapter
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

  // Navigate to a chapter
  const goToChapter = useCallback(
    (volAbbrev: string, bookId: number, bookName: string, chapter: number, bookChapterCount: number) => {
      setSelectedVolume(volAbbrev);
      setSelectedBookId(bookId);
      setSelectedBookName(bookName);
      setSelectedChapter(chapter);
      setChapterCount(bookChapterCount);
      loadChapter(bookId, chapter);
      window.scrollTo(0, 0);
    },
    [loadChapter]
  );

  const toggleLightMode = () => {
    setLightMode((prev) => {
      const next = !prev;
      localStorage.setItem("reader-light-mode", String(next));
      return next;
    });
  };

  // Navigate to prev/next chapter
  const goToPrevChapter = () => {
    if (!selectedBookId || !selectedChapter || !selectedVolume) return;
    if (selectedChapter > 1) {
      goToChapter(selectedVolume, selectedBookId, selectedBookName || "", selectedChapter - 1, chapterCount);
    } else {
      // Go to previous book's last chapter
      const vol = volumes.find((v) => v.abbrev === selectedVolume);
      if (!vol) return;
      const bookIdx = vol.books.findIndex((b) => b.id === selectedBookId);
      if (bookIdx > 0) {
        const prevBook = vol.books[bookIdx - 1];
        goToChapter(selectedVolume, prevBook.id, prevBook.name, prevBook.chapterCount, prevBook.chapterCount);
      }
    }
  };

  const goToNextChapter = () => {
    if (!selectedBookId || !selectedChapter || !selectedVolume) return;
    if (selectedChapter < chapterCount) {
      goToChapter(selectedVolume, selectedBookId, selectedBookName || "", selectedChapter + 1, chapterCount);
    } else {
      // Go to next book's first chapter
      const vol = volumes.find((v) => v.abbrev === selectedVolume);
      if (!vol) return;
      const bookIdx = vol.books.findIndex((b) => b.id === selectedBookId);
      if (bookIdx < vol.books.length - 1) {
        const nextBook = vol.books[bookIdx + 1];
        goToChapter(selectedVolume, nextBook.id, nextBook.name, 1, nextBook.chapterCount);
      }
    }
  };

  // Highlight search term in verse text
  const renderVerseText = (text: string) => {
    if (!highlightWord) return text;
    const escaped = highlightWord.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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

  // Color theme styles
  const theme = lightMode
    ? {
        bg: "#faf9f6",
        text: "#1a1a1a",
        textSecondary: "#555",
        textMuted: "#888",
        surface: "rgba(0, 0, 0, 0.03)",
        border: "rgba(0, 0, 0, 0.08)",
        verseNum: "#999",
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

    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: theme.bg,
          zIndex: 60,
          overflowY: "auto",
          transition: "background 0.3s ease, color 0.3s ease",
        }}
      >
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
            {/* Back button */}
            <button
              onClick={() => {
                setSelectedChapter(null);
                setVerses([]);
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
                  fontSize: "0.72rem",
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

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
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
            padding: isMobile ? "24px 20px 80px" : "40px 32px 100px",
          }}
        >
          {/* Chapter heading */}
          <h2
            style={{
              fontSize: isMobile ? "1.5rem" : "1.8rem",
              fontWeight: 700,
              color: theme.text,
              marginBottom: "8px",
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
                    }}
                    title={externalUrl ? "Open on churchofjesuschrist.org" : undefined}
                    onClick={() => {
                      if (externalUrl) window.open(externalUrl, "_blank");
                    }}
                  >
                    {v.verse}
                  </span>
                  <span
                    style={{
                      fontSize: isMobile ? "1rem" : "1.05rem",
                      color: theme.verseText,
                    }}
                  >
                    {renderVerseText(v.text)}
                  </span>
                </div>
              );
            })}
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
            padding: "10px 24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            zIndex: 50,
          }}
        >
          <button
            onClick={goToPrevChapter}
            disabled={!vol || (selectedChapter === 1 && vol.books[0]?.id === selectedBookId)}
            style={{
              background: "none",
              border: "none",
              color: theme.textSecondary,
              cursor: "pointer",
              fontSize: "0.88rem",
              fontWeight: 600,
              fontFamily: "inherit",
              padding: "8px 16px",
              opacity: !vol || (selectedChapter === 1 && vol.books[0]?.id === selectedBookId) ? 0.3 : 1,
            }}
          >
            ← Prev
          </button>
          <span
            style={{
              fontSize: "0.78rem",
              color: theme.textMuted,
              fontWeight: 500,
            }}
          >
            {selectedChapter} / {chapterCount}
          </span>
          <button
            onClick={goToNextChapter}
            disabled={
              !vol ||
              (selectedChapter === chapterCount &&
                vol.books[vol.books.length - 1]?.id === selectedBookId)
            }
            style={{
              background: "none",
              border: "none",
              color: theme.textSecondary,
              cursor: "pointer",
              fontSize: "0.88rem",
              fontWeight: 600,
              fontFamily: "inherit",
              padding: "8px 16px",
              opacity:
                !vol ||
                (selectedChapter === chapterCount &&
                  vol.books[vol.books.length - 1]?.id === selectedBookId)
                  ? 0.3
                  : 1,
            }}
          >
            Next →
          </button>
        </div>
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
