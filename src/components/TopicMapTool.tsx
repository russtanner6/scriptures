"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import type { Volume } from "@/lib/types";
import { VOLUME_COLORS } from "@/lib/constants";
import Header from "./Header";
import MethodologyModal, { MethodSection, MethodNote, MethodLink } from "./MethodologyModal";

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

interface SimilarChapter {
  bookId: number;
  bookName: string;
  chapter: number;
  volumeAbbrev: string;
  similarity: number;
  sharedTerms: string[];
}

interface TopicResult {
  seed: { bookId: number; bookName: string; chapter: number };
  similar: SimilarChapter[];
}

export default function TopicMapTool() {
  const isMobile = useIsMobile();
  const searchParams = useSearchParams();
  const [volumes, setVolumes] = useState<Volume[]>([]);
  const [selectedVolume, setSelectedVolume] = useState<number | null>(null);
  const [selectedBook, setSelectedBook] = useState<number | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [result, setResult] = useState<TopicResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [showMethodology, setShowMethodology] = useState(false);

  useEffect(() => {
    fetch("/api/books")
      .then((r) => r.json())
      .then((data) => {
        if (data.volumes) {
          setVolumes(data.volumes);
          const urlBook = searchParams.get("bookId");
          const urlChapter = searchParams.get("chapter");
          if (urlBook && urlChapter) {
            findSimilar(Number(urlBook), Number(urlChapter));
          }
        }
      })
      .catch(() => {});
  }, []);

  const findSimilar = async (bookId: number, chapter: number) => {
    setLoading(true);
    setSelectedBook(bookId);
    setSelectedChapter(chapter);
    try {
      const resp = await fetch(`/api/topic-similarity?bookId=${bookId}&chapter=${chapter}`);
      const data = await resp.json();
      setResult(data);
    } catch {}
    setLoading(false);
  };

  const selectedVol = volumes.find((v) => v.id === selectedVolume);

  return (
    <div className="page-container">
      <Header />

      <h1 style={{ fontSize: isMobile ? "1.3rem" : "1.6rem", fontWeight: 700, color: "var(--text)", marginBottom: "8px" }}>
        Topic Map
      </h1>
      <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "8px", lineHeight: 1.5, maxWidth: "640px" }}>
        Pick any chapter and find thematically similar chapters across all of scripture. Discover unexpected connections.
      </p>
      <div style={{ marginBottom: "20px" }}>
        <MethodLink onClick={() => setShowMethodology(true)} />
      </div>

      {/* Selection */}
      <div className="search-panel" style={{ marginBottom: "24px" }}>
        {/* Volume */}
        <div style={{ marginBottom: "12px" }}>
          <div style={{ fontSize: "0.65rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: "6px" }}>
            Volume
          </div>
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
                    if (isSingleBook) {
                      setSelectedBook(v.books[0].id);
                    } else {
                      setSelectedBook(null);
                    }
                  }}
                  style={{
                    padding: "5px 12px", borderRadius: "8px",
                    border: `1px solid ${active ? color : "var(--border)"}`,
                    background: active ? `${color}20` : "transparent",
                    color: active ? color : "var(--text-muted)",
                    fontSize: "0.78rem", fontWeight: active ? 600 : 400,
                    fontFamily: "inherit", cursor: "pointer", transition: "all 0.15s",
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
          <div style={{ marginBottom: "12px" }}>
            <div style={{ fontSize: "0.65rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: "6px" }}>
              Book
            </div>
            <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
              {selectedVol.books.map((b) => (
                <button
                  key={b.id}
                  onClick={() => { setSelectedBook(b.id); setSelectedChapter(null); setResult(null); }}
                  style={{
                    padding: "4px 10px", borderRadius: "6px",
                    border: `1px solid ${selectedBook === b.id ? "var(--accent)" : "var(--border)"}`,
                    background: selectedBook === b.id ? "rgba(59,130,246,0.15)" : "transparent",
                    color: selectedBook === b.id ? "var(--accent)" : "var(--text-muted)",
                    fontSize: "0.72rem", fontFamily: "inherit", cursor: "pointer", transition: "all 0.15s",
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
              <div style={{ fontSize: "0.65rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: "6px" }}>
                {label}
              </div>
              <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                {Array.from({ length: book.chapterCount }, (_, i) => i + 1).map((ch) => (
                  <button
                    key={ch}
                    onClick={() => findSimilar(selectedBook, ch)}
                    style={{
                      padding: "4px 8px", borderRadius: "6px", minWidth: "32px",
                      border: `1px solid ${selectedChapter === ch ? "var(--accent)" : "var(--border)"}`,
                      background: selectedChapter === ch ? "rgba(59,130,246,0.15)" : "transparent",
                      color: selectedChapter === ch ? "var(--accent)" : "var(--text-muted)",
                      fontSize: "0.72rem", fontFamily: "inherit", cursor: "pointer", transition: "all 0.15s",
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

      {loading && (
        <div style={{ textAlign: "center", padding: "48px", color: "var(--text-muted)" }}>
          Finding similar chapters across all scripture...
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", padding: isMobile ? "16px" : "24px" }}>
          <div style={{ fontSize: "0.92rem", fontWeight: 700, color: "var(--text)", marginBottom: "4px" }}>
            Chapters similar to {result.seed.bookName} {result.seed.chapter}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "20px" }}>
            {result.similar.length} related chapter{result.similar.length !== 1 ? "s" : ""} found across all volumes
          </div>

          {result.similar.length === 0 && (
            <div style={{ padding: "24px", textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem" }}>
              No significantly similar chapters found. This chapter may have unique content.
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {result.similar.map((ch, i) => {
              const color = VOLUME_COLORS[ch.volumeAbbrev] || "#888";
              const simPercent = Math.round(ch.similarity * 100);
              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    border: "1px solid var(--border)",
                    cursor: "pointer",
                    transition: "all 0.15s",
                    flexWrap: isMobile ? "wrap" : "nowrap",
                  }}
                  onClick={() => findSimilar(ch.bookId, ch.chapter)}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = color; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
                >
                  {/* Rank */}
                  <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", minWidth: "20px" }}>
                    {i + 1}.
                  </span>

                  {/* Chapter name */}
                  <span style={{ fontSize: "0.88rem", fontWeight: 600, color, minWidth: isMobile ? "auto" : "180px" }}>
                    {ch.bookName} {ch.chapter}
                  </span>

                  {/* Similarity bar */}
                  <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "8px", minWidth: "80px" }}>
                    <div style={{ flex: 1, height: "6px", borderRadius: "3px", background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                      <div
                        style={{
                          width: `${simPercent}%`,
                          height: "100%",
                          background: color,
                          borderRadius: "3px",
                          transition: "width 0.3s ease",
                        }}
                      />
                    </div>
                    <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", minWidth: "30px" }}>
                      {simPercent}%
                    </span>
                  </div>

                  {/* Shared terms */}
                  <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                    {ch.sharedTerms.slice(0, isMobile ? 2 : 4).map((term) => (
                      <span
                        key={term}
                        style={{
                          padding: "2px 8px",
                          borderRadius: "10px",
                          background: `${color}15`,
                          color,
                          fontSize: "0.65rem",
                          fontWeight: 600,
                        }}
                      >
                        {term}
                      </span>
                    ))}
                  </div>

                  {/* Read link */}
                  <a
                    href={`/read?bookId=${ch.bookId}&chapter=${ch.chapter}`}
                    onClick={(e) => e.stopPropagation()}
                    style={{ fontSize: "0.72rem", color: "var(--accent)", textDecoration: "none", whiteSpace: "nowrap" }}
                  >
                    Read →
                  </a>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Methodology modal */}
      <MethodologyModal
        title="How Topic Similarity Works"
        isOpen={showMethodology}
        onClose={() => setShowMethodology(false)}
        isMobile={isMobile}
      >
        <MethodSection title="Overview">
          <p style={{ margin: "0 0 8px" }}>
            This tool finds <strong style={{ color: "var(--text)" }}>thematically related chapters</strong> across
            all of scripture by comparing the vocabulary of a selected chapter against every other chapter
            using a standard information retrieval technique called cosine similarity.
          </p>
        </MethodSection>

        <MethodSection title="How It Works">
          <p style={{ margin: "0 0 8px" }}>
            Each chapter is converted into a <strong style={{ color: "var(--text)" }}>word frequency vector</strong> —
            a list of how often each distinct word appears. Common English stopwords are removed, leaving only
            substantive content words. The tool then computes the <strong style={{ color: "var(--text)" }}>cosine
            similarity</strong> between the selected chapter&rsquo;s vector and every other chapter&rsquo;s vector.
            Cosine similarity measures the angle between two vectors: chapters that use similar vocabulary in similar
            proportions will have a high score (close to 100%), regardless of chapter length.
          </p>
        </MethodSection>

        <MethodSection title="Shared Terms">
          <p style={{ margin: "0 0 8px" }}>
            The colored term pills shown for each result highlight the <strong style={{ color: "var(--text)" }}>most
            significant shared words</strong> — content words that appear frequently in both the source chapter
            and the matching chapter. These give an at-a-glance indication of <em>why</em> the chapters are
            related.
          </p>
        </MethodSection>

        <MethodSection title="What It Shows Well">
          <p style={{ margin: "0" }}>
            Topic Map excels at finding chapters with <strong style={{ color: "var(--text)" }}>overlapping
            subject matter</strong> across different books and volumes — for example, connecting prophecies
            of Christ in Isaiah with their fulfillment narratives in 3 Nephi, or linking covenant language
            in Deuteronomy with similar themes in Mosiah. Click any result to pivot and explore further
            connections.
          </p>
        </MethodSection>

        <MethodSection title="Known Limitations">
          <p style={{ margin: "0" }}>
            This is <strong style={{ color: "var(--text)" }}>vocabulary overlap, not semantic
            understanding</strong>. Two chapters about the same topic using different vocabulary (e.g.,
            synonyms or paraphrases) may score low. Conversely, chapters sharing common but thematically
            unrelated words may score higher than expected. Short chapters with limited vocabulary produce
            less reliable results. The tool is a discovery aid for finding connections to investigate,
            not a definitive measure of thematic relatedness.
          </p>
        </MethodSection>

        <MethodNote>
          <strong style={{ color: "var(--text)" }}>For researchers:</strong> This implements standard
          TF-based cosine similarity, a foundational technique in information retrieval and computational
          text analysis. More sophisticated approaches (TF-IDF weighting, latent semantic analysis,
          or embedding-based similarity) would improve accuracy but require significantly more computation.
          The current approach provides a practical balance of speed and usefulness for exploratory study.
        </MethodNote>
      </MethodologyModal>
    </div>
  );
}
