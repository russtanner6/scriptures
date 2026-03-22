"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import type { Volume } from "@/lib/types";
import { VOLUME_COLORS, getContrastText } from "@/lib/constants";
import Header from "./Header";
import { SectionLabel } from "./VolumeCheckboxes";
import MethodologyModal, { MethodSection, MethodNote, MethodLink } from "./MethodologyModal";
import type { ChiasmPattern } from "@/lib/chiasmus-detector";
import { usePreferencesContext } from "@/components/PreferencesProvider";
import { useIsMobile } from "@/lib/useIsMobile";

interface ChiasmResult {
  bookId: number;
  bookName: string;
  volumeAbbrev: string;
  chapter: number;
  verseCount: number;
  patterns: ChiasmPattern[];
}

export default function ChiasmusTool() {
  const { isVolumeVisible } = usePreferencesContext();
  const isMobile = useIsMobile();
  const searchParams = useSearchParams();
  const [volumes, setVolumes] = useState<Volume[]>([]);
  const [selectedVolume, setSelectedVolume] = useState<number | null>(null);
  const [selectedBook, setSelectedBook] = useState<number | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [result, setResult] = useState<ChiasmResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanResults, setScanResults] = useState<{ bookId: number; bookName: string; chapter: number; volumeAbbrev: string; patternCount: number; topConfidence: number }[]>([]);
  const [showMethodology, setShowMethodology] = useState(false);

  useEffect(() => {
    fetch("/api/books")
      .then((r) => r.json())
      .then((data) => {
        if (data.volumes) {
          setVolumes(data.volumes.filter((v: Volume) => isVolumeVisible(v.abbrev)));
          // Check URL params
          const urlBook = searchParams.get("bookId");
          const urlChapter = searchParams.get("chapter");
          if (urlBook && urlChapter) {
            analyzeChapter(Number(urlBook), Number(urlChapter));
          }
        }
      })
      .catch(() => {});
  }, []);

  const analyzeChapter = async (bookId: number, chapter: number) => {
    setLoading(true);
    try {
      const resp = await fetch(`/api/chiasmus?bookId=${bookId}&chapter=${chapter}`);
      const data = await resp.json();
      setResult(data);
      setSelectedBook(bookId);
      setSelectedChapter(chapter);
    } catch {}
    setLoading(false);
  };

  const scanVolume = async (volumeId: number) => {
    const vol = volumes.find((v) => v.id === volumeId);
    if (!vol) return;
    setScanning(true);
    setScanResults([]);

    const results: typeof scanResults = [];
    for (const book of vol.books) {
      for (let ch = 1; ch <= book.chapterCount; ch++) {
        try {
          const resp = await fetch(`/api/chiasmus?bookId=${book.id}&chapter=${ch}`);
          const data = await resp.json();
          if (data.patterns && data.patterns.length > 0) {
            results.push({
              bookId: book.id,
              bookName: book.name,
              chapter: ch,
              volumeAbbrev: vol.abbrev,
              patternCount: data.patterns.length,
              topConfidence: data.patterns[0].confidence,
            });
          }
        } catch {}
      }
    }

    results.sort((a, b) => b.topConfidence - a.topConfidence);
    setScanResults(results);
    setScanning(false);
  };

  const selectedVol = volumes.find((v) => v.id === selectedVolume);

  return (
    <div className="page-container">
      <Header />

      {/* Selection panel */}
      <div className="search-panel" style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: isMobile ? "1.2rem" : "1.4rem", fontWeight: 700, color: "var(--text)", marginBottom: "6px", lineHeight: 1.2 }}>
          Chiasmus Detector
        </h1>
        <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "6px", lineHeight: 1.4 }}>
          Discover chiastic (ABBA mirror) patterns in scripture.
        </p>
        <div style={{ marginBottom: "16px" }}>
          <MethodLink onClick={() => setShowMethodology(true)} />
        </div>

        {/* Selectors — horizontal flow */}
        <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "flex-end" }}>
            {/* Volume - always visible */}
            <div>
              <SectionLabel>Volume</SectionLabel>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {volumes.map((v) => {
                  const color = VOLUME_COLORS[v.abbrev] || "#888";
                  const active = selectedVolume === v.id;
                  const isSingleBook = v.books.length === 1;
                  return (
                    <button
                      key={v.id}
                      onClick={() => {
                        setSelectedVolume(v.id);
                        setSelectedChapter(null);
                        setResult(null);
                        setScanResults([]);
                        if (isSingleBook) {
                          setSelectedBook(v.books[0].id);
                        } else {
                          setSelectedBook(null);
                        }
                      }}
                      style={{
                        padding: "5px 12px",
                        borderRadius: "8px",
                        border: `1px solid ${active ? color : "var(--border)"}`,
                        background: active ? `${color}20` : "transparent",
                        color: active ? color : "var(--text-muted)",
                        fontSize: "0.78rem",
                        fontWeight: active ? 600 : 400,
                        fontFamily: "inherit",
                        cursor: "pointer",
                        transition: "all 0.15s",
                      }}
                    >
                      {isMobile ? v.abbrev : v.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Book — skip for single-book volumes like D&C */}
            {selectedVol && selectedVol.books.length > 1 && (
              <div>
                <SectionLabel>Book</SectionLabel>
                <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", maxHeight: "120px", overflowY: "auto" }}>
                  {selectedVol.books.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => { setSelectedBook(b.id); setSelectedChapter(null); setResult(null); }}
                      style={{
                        padding: "4px 10px",
                        borderRadius: "6px",
                        border: `1px solid ${selectedBook === b.id ? "var(--accent)" : "var(--border)"}`,
                        background: selectedBook === b.id ? "rgba(59,130,246,0.15)" : "transparent",
                        color: selectedBook === b.id ? "var(--accent)" : "var(--text-muted)",
                        fontSize: "0.72rem",
                        fontWeight: selectedBook === b.id ? 600 : 400,
                        fontFamily: "inherit",
                        cursor: "pointer",
                        transition: "all 0.15s",
                      }}
                    >
                      {b.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Chapter/Section picker */}
            {selectedBook && selectedVol && (() => {
              const book = selectedVol.books.find((b) => b.id === selectedBook);
              if (!book) return null;
              const isSingleBook = selectedVol.books.length === 1;
              const label = isSingleBook ? "Section" : "Chapter";
              return (
                <div>
                  <SectionLabel>{label}</SectionLabel>
                  <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", maxHeight: "120px", overflowY: "auto" }}>
                    {Array.from({ length: book.chapterCount }, (_, i) => i + 1).map((ch) => (
                      <button
                        key={ch}
                        onClick={() => analyzeChapter(selectedBook, ch)}
                        style={{
                          padding: "4px 8px",
                          borderRadius: "6px",
                          border: `1px solid ${selectedChapter === ch ? "var(--accent)" : "var(--border)"}`,
                          background: selectedChapter === ch ? "rgba(59,130,246,0.15)" : "transparent",
                          color: selectedChapter === ch ? "var(--accent)" : "var(--text-muted)",
                          fontSize: "0.72rem",
                          fontFamily: "inherit",
                          cursor: "pointer",
                          minWidth: "32px",
                          transition: "all 0.15s",
                        }}
                      >
                        {ch}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}
        </div>

        {/* Scan entire volume button */}
        {selectedVol && (
          <div style={{ marginTop: "14px" }}>
            <button
              onClick={() => scanVolume(selectedVol.id)}
              disabled={scanning}
              style={{
                padding: "8px 20px",
                borderRadius: "8px",
                border: "none",
                background: "rgba(139,92,246,0.2)",
                color: "#8b5cf6",
                fontSize: "0.82rem",
                fontWeight: 600,
                fontFamily: "inherit",
                cursor: scanning ? "wait" : "pointer",
                opacity: scanning ? 0.6 : 1,
              }}
            >
              {scanning ? "Scanning..." : `Scan entire ${isMobile ? selectedVol.abbrev : selectedVol.name}`}
            </button>
          </div>
        )}
      </div>

      {/* Scan results */}
      {scanResults.length > 0 && (
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", padding: isMobile ? "16px" : "20px", marginBottom: "24px" }}>
          <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text)", marginBottom: "12px" }}>
            Found {scanResults.length} chapters with chiastic patterns
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {scanResults.slice(0, 20).map((sr, i) => (
              <button
                key={i}
                onClick={() => analyzeChapter(sr.bookId, sr.chapter)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "8px 14px",
                  borderRadius: "8px",
                  border: "1px solid var(--border)",
                  background: "transparent",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  textAlign: "left",
                  transition: "all 0.15s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
              >
                <span style={{ fontSize: "0.85rem", fontWeight: 600, color: VOLUME_COLORS[sr.volumeAbbrev] || "var(--text)" }}>
                  {sr.bookName} {sr.chapter}
                </span>
                <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                  {sr.patternCount} pattern{sr.patternCount > 1 ? "s" : ""}
                </span>
                {/* Confidence bar */}
                <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "6px", justifyContent: "flex-end" }}>
                  <div style={{ width: "60px", height: "4px", borderRadius: "2px", background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                    <div style={{ width: `${Math.round(sr.topConfidence * 100)}%`, height: "100%", background: "#8b5cf6", borderRadius: "2px" }} />
                  </div>
                  <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>
                    {Math.round(sr.topConfidence * 100)}%
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {loading && (
        <div style={{ textAlign: "center", padding: "32px", color: "var(--text-muted)" }}>
          Analyzing structure...
        </div>
      )}

      {/* Chiasm result display */}
      {result && !loading && (
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", padding: isMobile ? "16px" : "24px" }}>
          <div style={{ fontSize: "1rem", fontWeight: 700, color: VOLUME_COLORS[result.volumeAbbrev] || "var(--text)", marginBottom: "4px" }}>
            {result.bookName} {result.chapter}
          </div>
          <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "20px" }}>
            {result.verseCount} verses · {result.patterns.length} chiastic pattern{result.patterns.length !== 1 ? "s" : ""} detected
          </div>

          {result.patterns.length === 0 && (
            <div style={{ padding: "24px", textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem" }}>
              No chiastic patterns detected in this chapter. Try a different chapter — chiasms are more common in poetic and prophetic passages.
            </div>
          )}

          {result.patterns.map((pattern, pi) => {
            const volColor = VOLUME_COLORS[result.volumeAbbrev] || "#8b5cf6";
            const depth = Math.floor(pattern.elements.length / 2);
            return (
              <div key={pi} style={{ marginBottom: pi < result.patterns.length - 1 ? "24px" : 0 }}>
                <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "12px" }}>
                  {pattern.description}
                  <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginLeft: "8px" }}>
                    confidence: {Math.round(pattern.confidence * 100)}%
                  </span>
                </div>

                {/* Chiasm visual */}
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  {pattern.elements.map((el, ei) => {
                    // Indent level: increases to center, then decreases
                    const distFromCenter = Math.abs(ei - depth);
                    const indent = (depth - distFromCenter) * (isMobile ? 16 : 28);
                    const isPivot = el.isPivot;
                    return (
                      <div
                        key={ei}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          marginLeft: `${indent}px`,
                          padding: "6px 12px",
                          borderRadius: "6px",
                          background: isPivot ? `${volColor}20` : "rgba(255,255,255,0.03)",
                          border: isPivot ? `1px solid ${volColor}40` : "1px solid transparent",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "0.78rem",
                            fontWeight: 700,
                            color: volColor,
                            minWidth: "24px",
                          }}
                        >
                          {el.label}
                        </span>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                          v{el.verseStart}{el.verseEnd !== el.verseStart ? `–${el.verseEnd}` : ""}
                        </span>
                        <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)", fontStyle: "italic" }}>
                          {el.keywords.join(", ")}
                        </span>
                        {isPivot && (
                          <span style={{ fontSize: "0.6rem", fontWeight: 600, color: volColor, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                            center
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Read in context link */}
                <a
                  href={`/scriptures?bookId=${result.bookId}&chapter=${result.chapter}`}
                  style={{
                    display: "inline-block",
                    marginTop: "12px",
                    fontSize: "0.78rem",
                    color: "var(--accent)",
                    textDecoration: "underline",
                    textUnderlineOffset: "3px",
                  }}
                >
                  Read this chapter →
                </a>
              </div>
            );
          })}
        </div>
      )}

      {/* Methodology modal */}
      <MethodologyModal
        title="How Chiasmus Detection Works"
        isOpen={showMethodology}
        onClose={() => setShowMethodology(false)}
        isMobile={isMobile}
      >
        <MethodSection title="Overview">
          <p style={{ margin: "0 0 8px" }}>
            Chiasmus is a <strong style={{ color: "var(--text)" }}>literary structure</strong> in which ideas are
            presented in an A–B–C…C′–B′–A′ mirror pattern around a central pivot point. This tool algorithmically
            scans chapter text for chiastic patterns by analyzing shared vocabulary between verse groups arranged
            in mirror positions.
          </p>
        </MethodSection>

        <MethodSection title="How Patterns Are Found">
          <p style={{ margin: "0 0 8px" }}>
            For each chapter, the detector: (1) extracts <strong style={{ color: "var(--text)" }}>content keywords</strong> from
            every verse by filtering out common English stopwords and short words, retaining only substantive terms;
            (2) tries every possible center point in the chapter; (3) pairs verse groups that mirror each other
            around that center (e.g., verses 1–2 paired with verses 10–11, verses 3–4 with 8–9); (4) measures the
            vocabulary overlap of each mirror pair using <strong style={{ color: "var(--text)" }}>Jaccard similarity</strong> —
            the number of shared keywords divided by the total unique keywords across both groups.
          </p>
          <p style={{ margin: "0 0 8px" }}>
            A pattern is reported only when <strong style={{ color: "var(--text)" }}>two or more mirror pairs</strong> show
            meaningful keyword overlap, suggesting deliberate structural repetition rather than coincidence.
          </p>
        </MethodSection>

        <MethodSection title="Confidence Scoring">
          <p style={{ margin: "0 0 8px" }}>
            The confidence score reflects: the <strong style={{ color: "var(--text)" }}>average Jaccard similarity</strong> across
            all mirror pairs, weighted by the number of pairs (deeper patterns with more layers score higher).
            A score of 80–100% indicates strong lexical mirroring across multiple layers; 40–60% suggests partial
            or thematic chiasmus; below 40% indicates possible but uncertain patterns.
          </p>
        </MethodSection>

        <MethodSection title="What It Shows Well">
          <p style={{ margin: "0" }}>
            This tool is best at identifying <strong style={{ color: "var(--text)" }}>lexical chiasmus</strong> — patterns
            where the same or similar words recur in mirror positions. It can surface well-known chiastic structures
            (such as those in Alma 36 or many Psalms) and reveal less obvious patterns for further study. The
            "Scan entire volume" feature lets you quickly identify which chapters have the strongest chiastic
            structures.
          </p>
        </MethodSection>

        <MethodSection title="Known Limitations">
          <p style={{ margin: "0" }}>
            This is <strong style={{ color: "var(--text)" }}>keyword-based structural analysis, not semantic
            analysis</strong>. It detects word-level repetition in mirror positions but cannot identify thematic
            or conceptual chiasmus where the same idea is expressed using different vocabulary. It also cannot
            detect chiasmus that spans multiple chapters. Some detected patterns may be coincidental, especially
            in longer chapters with repeated vocabulary. The tool is designed to <em>suggest</em> where chiastic
            structures may exist — confirming true literary chiasmus requires close reading and scholarly judgment.
          </p>
        </MethodSection>

        <MethodNote>
          <strong style={{ color: "var(--text)" }}>For researchers:</strong> This approach uses a simplified version
          of the methods described in chiasmus detection literature (e.g., Boyd &amp; Maddox, 2004; Welch, 1969).
          Full scholarly analysis considers additional factors like semantic parallelism, grammatical inversion,
          and thematic centrality of the pivot — none of which are captured by keyword overlap alone. Use this
          tool as a discovery aid to identify candidates for deeper structural analysis, not as a definitive
          classifier of chiastic form.
        </MethodNote>
      </MethodologyModal>
    </div>
  );
}
