"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getVerseUrl } from "@/lib/scripture-urls";
import type { Verse, ScripturePanelState } from "@/lib/types";

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
  const isMobile = useIsMobile();
  const panelRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  const touchDeltaX = useRef(0);
  const [swipeOffset, setSwipeOffset] = useState(0);

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

  // Swipe-to-close (right swipe dismisses panel)
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchDeltaX.current = 0;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const delta = e.touches[0].clientX - touchStartX.current;
    touchDeltaX.current = delta;
    if (delta > 0) {
      setSwipeOffset(delta);
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (touchDeltaX.current > 80) {
      onClose();
    } else {
      setSwipeOffset(0);
    }
    touchDeltaX.current = 0;
  }, [onClose]);

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
              : "rgba(139, 92, 246, 0.2)",
            color: "#222",
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

  const headerSubtitle = chapter != null
    ? `${bookName} ${chapter}`
    : bookName;

  // Mobile: leave a sliver (48px) to show the page behind
  const panelWidth = isMobile ? "calc(100vw - 48px)" : "min(100vw, 480px)";

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
          background: "#ffffff",
          borderLeft: "1px solid #e5e7eb",
          zIndex: 201,
          display: "flex",
          flexDirection: "column",
          transform: isVisible
            ? `translateX(${swipeOffset}px)`
            : "translateX(100%)",
          transition: swipeOffset > 0 ? "none" : "transform 0.3s ease",
          boxShadow: "-8px 0 32px rgba(0, 0, 0, 0.15)",
          borderRadius: isMobile ? "12px 0 0 12px" : undefined,
        }}
      >
        {/* Swipe handle (mobile) */}
        {isMobile && (
          <div style={{
            display: "flex",
            justifyContent: "center",
            padding: "8px 0 0",
          }}>
            <div style={{
              width: "36px",
              height: "4px",
              borderRadius: "2px",
              background: "rgba(0,0,0,0.15)",
            }} />
          </div>
        )}

        {/* Header */}
        <div
          style={{
            padding: isMobile ? "12px 16px 12px" : "20px 24px 16px",
            flexShrink: 0,
            background: "#f8f8f8",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
            zIndex: 1,
            position: "relative",
            borderRadius: isMobile ? "12px 0 0 0" : undefined,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <h3
                style={{
                  fontSize: "1.15rem",
                  fontWeight: 700,
                  color: "#222",
                  marginBottom: "4px",
                }}
              >
                {headerSubtitle}
              </h3>
              <p
                style={{
                  fontSize: "0.82rem",
                  color: "#888",
                }}
              >
                {isLoading
                  ? "Loading verses..."
                  : `${verses.length} verse${verses.length !== 1 ? "s" : ""} containing "${word}"`}
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                background: "rgba(0, 0, 0, 0.04)",
                border: "1px solid #e0e0e0",
                borderRadius: "8px",
                width: "36px",
                height: "36px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "#999",
                fontSize: "1.1rem",
                fontFamily: "inherit",
                transition: "all 0.15s",
                flexShrink: 0,
                marginLeft: "12px",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(0, 0, 0, 0.08)";
                e.currentTarget.style.color = "#333";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(0, 0, 0, 0.04)";
                e.currentTarget.style.color = "#999";
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Verses list */}
        <div
          style={{
            overflowY: "auto",
            WebkitOverflowScrolling: "touch",
            padding: isMobile ? "12px 16px 24px" : "12px 24px 24px",
            flex: 1,
            minHeight: 0,
            background: "#ffffff",
          }}
        >
          {isLoading && (
            <div
              style={{
                textAlign: "center",
                padding: "40px",
                color: "#999",
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
                color: "#999",
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
                      ? "1px solid #eee"
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
                        color: "#222",
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
                        color: "#222",
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
                    color: "#222",
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
