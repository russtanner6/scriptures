"use client";

import { useState, useEffect } from "react";
import { getVerseUrl } from "@/lib/scripture-urls";

interface Verse {
  chapter: number;
  verse: number;
  text: string;
}

export default function VerseModal({
  word,
  bookId,
  bookName,
  caseInsensitive,
  wholeWord,
  onClose,
}: {
  word: string;
  bookId: number;
  bookName: string;
  caseInsensitive: boolean;
  wholeWord: boolean;
  onClose: () => void;
}) {
  const [verses, setVerses] = useState<Verse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams({
      word,
      bookId: String(bookId),
      caseInsensitive: String(caseInsensitive),
      wholeWord: String(wholeWord),
    });
    fetch(`/api/verses?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setVerses(data.verses || []);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, [word, bookId, caseInsensitive, wholeWord]);

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
            background: "rgba(139, 92, 246, 0.3)",
            color: "#fff",
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

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0, 0, 0, 0.7)",
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
          zIndex: 200,
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "min(90vw, 680px)",
          maxHeight: "80vh",
          background: "rgba(18, 16, 30, 0.97)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: "1px solid var(--border-accent)",
          borderRadius: "10px",
          zIndex: 201,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexShrink: 0,
          }}
        >
          <div>
            <h3
              style={{
                fontSize: "1.1rem",
                fontWeight: 700,
                color: "var(--text)",
                marginBottom: "4px",
              }}
            >
              {bookName}
            </h3>
            <p
              style={{
                fontSize: "0.82rem",
                color: "var(--text-secondary)",
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
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "10px",
              width: "36px",
              height: "36px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "var(--text-muted)",
              fontSize: "1.1rem",
              fontFamily: "inherit",
              transition: "all 0.15s",
              flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>

        {/* Verses list */}
        <div
          style={{
            overflowY: "auto",
            padding: "16px 24px 24px",
            flex: 1,
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

          {!isLoading &&
            verses.map((v, i) => (
              <div
                key={i}
                style={{
                  padding: "14px 0",
                  borderBottom:
                    i < verses.length - 1
                      ? "1px solid var(--border)"
                      : "none",
                }}
              >
                {(() => {
                  const url = getVerseUrl(bookName, v.chapter, v.verse);
                  const label = v.chapter > 0
                    ? `Chapter ${v.chapter} : Verse ${v.verse}`
                    : `Verse ${v.verse}`;
                  return url ? (
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                        color: "var(--accent)",
                        marginBottom: "6px",
                        textDecoration: "none",
                        transition: "color 0.15s",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "#a78bfa")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "var(--accent)")}
                    >
                      {label}
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                    </a>
                  ) : (
                    <div
                      style={{
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                        color: "var(--accent)",
                        marginBottom: "6px",
                      }}
                    >
                      {label}
                    </div>
                  );
                })()}
                <div
                  style={{
                    fontSize: "0.9rem",
                    color: "var(--text-secondary)",
                    lineHeight: 1.7,
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
