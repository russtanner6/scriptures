"use client";

import { useState, useEffect, useCallback } from "react";
import { getVerseUrl } from "@/lib/scripture-urls";
import type { Verse, ScripturePanelState } from "@/lib/types";

export default function ScripturePanel({
  word,
  bookId,
  bookName,
  chapter,
  caseInsensitive,
  wholeWord,
  volumeColor,
  onClose,
}: ScripturePanelState & { onClose: () => void }) {
  const [verses, setVerses] = useState<Verse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(false);

  // Slide-in animation
  useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true));
  }, []);

  // Fetch verses
  useEffect(() => {
    const params = new URLSearchParams({
      word,
      bookId: String(bookId),
      caseInsensitive: String(caseInsensitive),
      wholeWord: String(wholeWord),
    });
    if (chapter != null) params.set("chapter", String(chapter));

    fetch(`/api/verses?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setVerses(data.verses || []);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, [word, bookId, chapter, caseInsensitive, wholeWord]);

  // Escape key
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

  // Highlight the search word in verse text
  const highlightWord = (text: string) => {
    const isPhrase = /^".*"$/.test(word) || /^'.*'$/.test(word);
    const searchTerm = isPhrase ? word.slice(1, -1) : word;
    const escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = wholeWord && !isPhrase ? `\\b${escaped}\\b` : escaped;
    const regex = new RegExp(`(${pattern})`, caseInsensitive ? "gi" : "g");
    const parts = text.split(regex);

    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark
          key={i}
          style={{
            background: volumeColor
              ? `${volumeColor}30`
              : "rgba(139, 92, 246, 0.25)",
            color: "var(--text)",
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

  const accentColor = volumeColor || "var(--accent)";
  const headerSubtitle = chapter != null
    ? `${bookName} ${chapter}`
    : bookName;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0, 0, 0, 0.5)",
          backdropFilter: "blur(2px)",
          WebkitBackdropFilter: "blur(2px)",
          zIndex: 200,
          opacity: isVisible ? 1 : 0,
          transition: "opacity 0.3s ease",
        }}
      />

      {/* Panel */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "min(100vw, 480px)",
          background: "#1a1a22",
          borderLeft: `1px solid rgba(255, 255, 255, 0.08)`,
          zIndex: 201,
          display: "flex",
          flexDirection: "column",
          transform: isVisible ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.3s ease",
          boxShadow: "-8px 0 32px rgba(0, 0, 0, 0.4)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px 16px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: "8px",
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <h3
                style={{
                  fontSize: "1.15rem",
                  fontWeight: 700,
                  color: "var(--text)",
                  marginBottom: "4px",
                }}
              >
                {headerSubtitle}
              </h3>
              <p
                style={{
                  fontSize: "0.82rem",
                  color: "var(--text-muted)",
                }}
              >
                {isLoading
                  ? "Loading verses..."
                  : `${verses.length} verse${verses.length !== 1 ? "s" : ""} containing "${word}"`}
              </p>
              {!isLoading && verses.length > 0 && (
                <a
                  href={`/read?bookId=${bookId}&chapter=${chapter || (verses[0]?.chapter ?? 1)}&highlight=${encodeURIComponent(word)}`}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    fontSize: "0.78rem",
                    fontWeight: 500,
                    color: accentColor,
                    textDecoration: "none",
                    marginTop: "4px",
                    opacity: 0.85,
                    transition: "opacity 0.15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.85")}
                >
                  Read in context →
                </a>
              )}
            </div>
            <button
              onClick={onClose}
              style={{
                background: "rgba(255, 255, 255, 0.06)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "8px",
                width: "36px",
                height: "36px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "var(--text-secondary)",
                fontSize: "1.1rem",
                fontFamily: "inherit",
                transition: "all 0.15s",
                flexShrink: 0,
                marginLeft: "12px",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
                e.currentTarget.style.color = "var(--text)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.06)";
                e.currentTarget.style.color = "var(--text-secondary)";
              }}
            >
              ✕
            </button>
          </div>

          {/* Volume color accent bar */}
          {volumeColor && (
            <div
              style={{
                height: "3px",
                background: `linear-gradient(90deg, ${volumeColor}, ${volumeColor}00)`,
                borderRadius: "2px",
                marginTop: "4px",
              }}
            />
          )}
        </div>

        {/* Verses list */}
        <div
          style={{
            overflowY: "auto",
            WebkitOverflowScrolling: "touch",
            padding: "12px 24px 24px",
            flex: 1,
            minHeight: 0,
          }}
        >
          {isLoading && (
            <div
              style={{
                textAlign: "center",
                padding: "40px",
                color: "var(--text-muted)",
              }}
            >
              Loading...
            </div>
          )}

          {!isLoading && verses.length === 0 && (
            <div
              style={{
                textAlign: "center",
                padding: "40px",
                color: "var(--text-muted)",
              }}
            >
              No matching verses found.
            </div>
          )}

          {!isLoading &&
            verses.map((v, i) => (
              <div
                key={i}
                style={{
                  padding: "14px 0",
                  borderBottom:
                    i < verses.length - 1
                      ? "1px solid rgba(255, 255, 255, 0.04)"
                      : "none",
                }}
              >
                {(() => {
                  const url = getVerseUrl(bookName, v.chapter, v.verse);
                  const label =
                    v.chapter > 0
                      ? `${bookName} ${v.chapter}:${v.verse}`
                      : `${bookName} ${v.verse}`;
                  return url ? (
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        fontSize: "0.82rem",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        color: accentColor,
                        marginBottom: "8px",
                        textDecoration: "none",
                        transition: "opacity 0.15s",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.opacity = "0.7")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.opacity = "1")
                      }
                    >
                      {label}
                      <svg
                        width="11"
                        height="11"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                    </a>
                  ) : (
                    <div
                      style={{
                        fontSize: "0.82rem",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        color: accentColor,
                        marginBottom: "8px",
                      }}
                    >
                      {label}
                    </div>
                  );
                })()}
                <div
                  style={{
                    fontSize: "0.95rem",
                    color: "var(--text-secondary)",
                    lineHeight: 1.8,
                  }}
                >
                  {highlightWord(v.text)}
                </div>
              </div>
            ))}
        </div>
      </div>
    </>
  );
}
