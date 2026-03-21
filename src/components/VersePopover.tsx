"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { addBookmark, removeBookmark, isBookmarked } from "@/lib/bookmarks";
import { getAnnotation, saveAnnotation, deleteAnnotation } from "@/lib/annotations";

interface VersePopoverProps {
  bookId: number;
  chapter: number;
  verse: number;
  text: string;
  bookName: string;
  volumeAbbrev: string;
  volColor: string;
  lightMode: boolean;
  isMobile: boolean;
  onClose: () => void;
}

// Simple stopwords for verse word analysis
const VERSE_STOPS = new Set([
  "the", "and", "of", "to", "in", "a", "that", "it", "is", "was", "for",
  "i", "he", "his", "with", "they", "be", "not", "them", "their", "shall",
  "him", "but", "all", "which", "had", "were", "upon", "my", "this", "have",
  "from", "or", "by", "as", "ye", "me", "do", "did", "are", "we", "she",
  "her", "an", "who", "so", "if", "will", "no", "on", "thee", "thy", "thou",
  "at", "out", "up", "said", "when", "what", "into", "am", "us", "our",
]);

function getTopVerseWords(text: string, limit = 4): string[] {
  const counts = new Map<string, number>();
  const words = text.toLowerCase().replace(/--/g, " ").replace(/[^a-z'-]/g, " ").split(/\s+/);
  for (const w of words) {
    const clean = w.replace(/^['-]+|['-]+$/g, "");
    if (clean.length < 3 || VERSE_STOPS.has(clean)) continue;
    counts.set(clean, (counts.get(clean) || 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([w]) => w);
}

export default function VersePopover({
  bookId,
  chapter,
  verse,
  text,
  bookName,
  volumeAbbrev,
  volColor,
  lightMode,
  isMobile,
  onClose,
}: VersePopoverProps) {
  const [bookmarked, setBookmarked] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [noteSaved, setNoteSaved] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setBookmarked(isBookmarked(bookId, chapter, verse));
    const existing = getAnnotation(bookId, chapter, verse);
    if (existing) {
      setNoteText(existing.note);
      setShowNotes(true);
    } else {
      setNoteText("");
      setShowNotes(false);
    }
    setNoteSaved(false);
  }, [bookId, chapter, verse]);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: Event) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // Delay to prevent immediate close from the tap that opened it
    const timer = setTimeout(() => {
      window.addEventListener("pointerdown", handleClick);
    }, 250);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("pointerdown", handleClick);
    };
  }, [onClose]);

  const handleCopy = useCallback(() => {
    const isDC = volumeAbbrev === "D&C";
    const ref = isDC
      ? `D&C ${chapter}:${verse}`
      : `${bookName} ${chapter}:${verse}`;
    navigator.clipboard.writeText(`${text} (${ref})`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [text, bookName, volumeAbbrev, chapter, verse]);

  const handleBookmark = useCallback(() => {
    if (bookmarked) {
      removeBookmark(bookId, chapter, verse);
      setBookmarked(false);
    } else {
      addBookmark({ bookId, chapter, verse, bookName, volumeAbbrev, text });
      setBookmarked(true);
    }
  }, [bookmarked, bookId, chapter, verse, bookName, volumeAbbrev, text]);

  const topWords = getTopVerseWords(text);
  const wordCount = text.split(/\s+/).length;
  const isDC = volumeAbbrev === "D&C";
  const reference = isDC ? `D&C ${chapter}:${verse}` : `${bookName} ${chapter}:${verse}`;

  const theme = lightMode
    ? {
        bg: "#ffffff",
        text: "#1a1a1a",
        textSecondary: "#555",
        textMuted: "#888",
        border: "rgba(0, 0, 0, 0.12)",
        shadow: "0 8px 32px rgba(0,0,0,0.15)",
      }
    : {
        bg: "#1e1e26",
        text: "#f0f0f0",
        textSecondary: "#9ca3af",
        textMuted: "#6b7280",
        border: "rgba(255, 255, 255, 0.1)",
        shadow: "0 8px 32px rgba(0,0,0,0.5)",
      };

  // Mobile: bottom sheet. Desktop: floating card
  const containerStyle: React.CSSProperties = isMobile
    ? {
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 201,
        background: theme.bg,
        borderTop: `1px solid ${theme.border}`,
        borderRadius: "16px 16px 0 0",
        padding: "20px 20px calc(28px + env(safe-area-inset-bottom, 0px))",
        boxShadow: theme.shadow,
        animation: "slideUp 0.25s ease",
      }
    : {
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 201,
        background: theme.bg,
        border: `1px solid ${theme.border}`,
        borderRadius: "12px",
        padding: "20px",
        boxShadow: theme.shadow,
        maxWidth: "380px",
        width: "90%",
        animation: "fadeIn 0.2s ease",
      };

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.3)",
          zIndex: 200,
        }}
      />

      <div ref={popoverRef} style={containerStyle}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "12px",
          }}
        >
          <div>
            <div style={{ fontSize: "0.95rem", fontWeight: 700, color: theme.text }}>
              {reference}
            </div>
            <div style={{ fontSize: "0.72rem", color: theme.textMuted, marginTop: "2px" }}>
              {wordCount} words
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
              padding: "10px 12px",
              minWidth: "44px",
              minHeight: "44px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "inherit",
              margin: "-6px -8px -6px 0",
            }}
          >
            ✕
          </button>
        </div>

        {/* Verse snippet */}
        <div
          style={{
            fontSize: "0.85rem",
            color: theme.textSecondary,
            lineHeight: 1.6,
            marginBottom: "14px",
            maxHeight: "80px",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {text.length > 200 ? text.substring(0, 200) + "..." : text}
        </div>

        {/* Top words */}
        {topWords.length > 0 && (
          <div style={{ marginBottom: "14px" }}>
            <div
              style={{
                fontSize: "0.62rem",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                color: theme.textMuted,
                marginBottom: "6px",
              }}
            >
              Key Words
            </div>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {topWords.map((w) => (
                <a
                  key={w}
                  href={`/heatmap?word=${encodeURIComponent(w)}`}
                  style={{
                    display: "inline-block",
                    padding: "3px 10px",
                    borderRadius: "20px",
                    background: `${volColor}15`,
                    border: `1px solid ${volColor}30`,
                    color: volColor,
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    textDecoration: "none",
                    transition: "all 0.15s",
                  }}
                >
                  {w}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Notes section */}
        {showNotes && (
          <div style={{ marginBottom: "12px" }}>
            <textarea
              value={noteText}
              onChange={(e) => { setNoteText(e.target.value); setNoteSaved(false); }}
              placeholder="Add your notes about this verse..."
              rows={3}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "8px",
                border: `1px solid ${theme.border}`,
                background: lightMode ? "#f8f8f8" : "rgba(255,255,255,0.04)",
                color: theme.text,
                fontSize: "0.82rem",
                fontFamily: "inherit",
                lineHeight: 1.5,
                resize: "vertical",
                outline: "none",
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = volColor; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = theme.border; }}
            />
            <div style={{ display: "flex", gap: "8px", marginTop: "6px", justifyContent: "flex-end" }}>
              {noteText.trim() !== "" && (
                <button
                  onClick={() => {
                    deleteAnnotation(bookId, chapter, verse);
                    setNoteText("");
                    setShowNotes(false);
                    setNoteSaved(false);
                  }}
                  style={{
                    padding: "4px 12px",
                    borderRadius: "6px",
                    border: `1px solid ${theme.border}`,
                    background: "transparent",
                    color: theme.textMuted,
                    fontSize: "0.72rem",
                    fontFamily: "inherit",
                    cursor: "pointer",
                  }}
                >
                  Delete note
                </button>
              )}
              <button
                onClick={() => {
                  if (noteText.trim()) {
                    saveAnnotation(bookId, chapter, verse, noteText.trim());
                    setNoteSaved(true);
                    setTimeout(() => setNoteSaved(false), 1500);
                  }
                }}
                disabled={!noteText.trim() || noteSaved}
                style={{
                  padding: "4px 14px",
                  borderRadius: "6px",
                  border: "none",
                  background: noteSaved ? `${volColor}30` : volColor,
                  color: noteSaved ? volColor : "#fff",
                  fontSize: "0.72rem",
                  fontWeight: 600,
                  fontFamily: "inherit",
                  cursor: noteSaved ? "default" : "pointer",
                  transition: "all 0.15s",
                }}
              >
                {noteSaved ? "✓ Saved" : "Save note"}
              </button>
            </div>
          </div>
        )}

        {/* Actions */}
        <div
          style={{
            display: "flex",
            gap: "8px",
            borderTop: `1px solid ${theme.border}`,
            paddingTop: "12px",
          }}
        >
          <button
            onClick={handleCopy}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              padding: "8px",
              borderRadius: "8px",
              border: `1px solid ${theme.border}`,
              background: "transparent",
              color: copied ? volColor : theme.textSecondary,
              fontSize: "0.78rem",
              fontWeight: 500,
              fontFamily: "inherit",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            {copied ? "✓ Copied!" : "📋 Copy"}
          </button>
          <button
            onClick={handleBookmark}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              padding: "8px",
              borderRadius: "8px",
              border: `1px solid ${bookmarked ? volColor + "50" : theme.border}`,
              background: bookmarked ? `${volColor}15` : "transparent",
              color: bookmarked ? volColor : theme.textSecondary,
              fontSize: "0.78rem",
              fontWeight: 500,
              fontFamily: "inherit",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            {bookmarked ? "★ Saved" : "☆ Bookmark"}
          </button>
          <button
            onClick={() => setShowNotes(!showNotes)}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              padding: "8px",
              borderRadius: "8px",
              border: `1px solid ${showNotes ? volColor + "50" : theme.border}`,
              background: showNotes ? `${volColor}15` : "transparent",
              color: showNotes ? volColor : theme.textSecondary,
              fontSize: "0.78rem",
              fontWeight: 500,
              fontFamily: "inherit",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            {noteText ? "✎ Notes" : "✎ Note"}
          </button>
        </div>
      </div>
    </>
  );
}
