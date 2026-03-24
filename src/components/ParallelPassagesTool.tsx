"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { VOLUME_COLORS } from "@/lib/constants";
import MethodologyModal, { MethodSection, MethodNote, MethodLink } from "./MethodologyModal";
import { useIsMobile } from "@/lib/useIsMobile";

interface PassageGroup {
  id: string;
  label: string;
  description: string;
  pairCount: number;
}

interface VersePair {
  sourceBook: string;
  sourceChapter: number;
  sourceBookId: number;
  sourceVerses: { verse: number; text: string }[];
  targetBook: string;
  targetChapter: number;
  targetBookId: number;
  targetVerses: { verse: number; text: string }[];
}

interface PassageDetail {
  id: string;
  label: string;
  description: string;
  pairs: VersePair[];
}

/** Simple word-level diff highlighting */
function diffWords(sourceText: string, targetText: string): { source: React.ReactNode; target: React.ReactNode } {
  const sWords = sourceText.split(/\s+/);
  const tWords = targetText.split(/\s+/);
  const tSet = new Set(tWords.map((w) => w.toLowerCase().replace(/[^a-z]/g, "")));
  const sSet = new Set(sWords.map((w) => w.toLowerCase().replace(/[^a-z]/g, "")));

  const sourceNodes = sWords.map((w, i) => {
    const clean = w.toLowerCase().replace(/[^a-z]/g, "");
    const inTarget = tSet.has(clean);
    return (
      <span
        key={i}
        style={{
          background: !inTarget && clean.length > 2 ? "rgba(239, 68, 68, 0.15)" : "transparent",
          borderRadius: "2px",
          padding: !inTarget && clean.length > 2 ? "0 2px" : "0",
        }}
      >
        {w}{" "}
      </span>
    );
  });

  const targetNodes = tWords.map((w, i) => {
    const clean = w.toLowerCase().replace(/[^a-z]/g, "");
    const inSource = sSet.has(clean);
    return (
      <span
        key={i}
        style={{
          background: !inSource && clean.length > 2 ? "rgba(59, 130, 246, 0.15)" : "transparent",
          borderRadius: "2px",
          padding: !inSource && clean.length > 2 ? "0 2px" : "0",
        }}
      >
        {w}{" "}
      </span>
    );
  });

  return { source: sourceNodes, target: targetNodes };
}

export default function ParallelPassagesTool() {
  const isMobile = useIsMobile();
  const searchParams = useSearchParams();
  const [groups, setGroups] = useState<PassageGroup[]>([]);
  const [detail, setDetail] = useState<PassageDetail | null>(null);
  const [activePairIdx, setActivePairIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showDiff, setShowDiff] = useState(true);
  const [showMethodology, setShowMethodology] = useState(false);

  // Load groups
  useEffect(() => {
    fetch("/api/parallel-passages")
      .then((r) => r.json())
      .then((data) => {
        if (data.groups) setGroups(data.groups);
        // Check URL for pre-selected group
        const urlId = searchParams.get("id");
        if (urlId) loadGroup(urlId);
      })
      .catch(() => {});
  }, []);

  const loadGroup = async (id: string) => {
    setLoading(true);
    setActivePairIdx(0);
    try {
      const resp = await fetch(`/api/parallel-passages?id=${id}`);
      const data = await resp.json();
      if (data.pairs) setDetail(data);
    } catch {}
    setLoading(false);
  };

  const activePair = detail?.pairs[activePairIdx];

  return (
    <div>
      {/* Selection panel */}
      <div className="search-panel" style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: isMobile ? "1.2rem" : "1.4rem", fontWeight: 700, color: "var(--text)", marginBottom: "6px", lineHeight: 1.2 }}>
          Parallel Passages
        </h1>
        <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "6px", lineHeight: 1.4 }}>
          Compare side-by-side texts that appear in multiple books of scripture. Differences are highlighted to reveal how passages were adapted across volumes.
        </p>
        <div style={{ marginBottom: "0" }}>
          <MethodLink onClick={() => setShowMethodology(true)} />
        </div>
      </div>

      {/* Group selector */}
      {!detail && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)",
            gap: "12px",
            marginBottom: "24px",
          }}
        >
          {groups.map((g) => (
            <button
              key={g.id}
              onClick={() => loadGroup(g.id)}
              style={{
                textAlign: "left",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "12px",
                padding: "18px",
                cursor: "pointer",
                transition: "all 0.15s",
                fontFamily: "inherit",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--accent)";
                e.currentTarget.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <div style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--text)", marginBottom: "4px" }}>
                {g.label}
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", lineHeight: 1.4 }}>
                {g.description}
              </div>
              <div style={{ fontSize: "0.72rem", color: "var(--accent)", marginTop: "8px" }}>
                {g.pairCount} chapter{g.pairCount === 1 ? "" : "s"} to compare
              </div>
            </button>
          ))}
        </div>
      )}

      {loading && (
        <div style={{ textAlign: "center", padding: "48px", color: "var(--text-muted)" }}>
          Loading passages...
        </div>
      )}

      {/* Detail view */}
      {detail && !loading && (
        <div>
          {/* Back + title */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px", flexWrap: "wrap" }}>
            <button
              onClick={() => setDetail(null)}
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                padding: "6px 14px",
                color: "var(--text-secondary)",
                fontSize: "0.82rem",
                fontFamily: "inherit",
                cursor: "pointer",
              }}
            >
              ← All passages
            </button>
            <div style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--text)" }}>
              {detail.label}
            </div>
          </div>

          {/* Chapter selector pills */}
          {detail.pairs.length > 1 && (
            <div style={{ display: "flex", gap: "6px", marginBottom: "16px", flexWrap: "wrap" }}>
              {detail.pairs.map((pair, idx) => (
                <button
                  key={idx}
                  onClick={() => setActivePairIdx(idx)}
                  style={{
                    padding: "5px 12px",
                    borderRadius: "20px",
                    border: `1px solid ${idx === activePairIdx ? "var(--accent)" : "var(--border)"}`,
                    background: idx === activePairIdx ? "rgba(59,130,246,0.15)" : "transparent",
                    color: idx === activePairIdx ? "var(--accent)" : "var(--text-muted)",
                    fontSize: "0.75rem",
                    fontWeight: idx === activePairIdx ? 600 : 400,
                    fontFamily: "inherit",
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  {pair.sourceBook} {pair.sourceChapter}
                </button>
              ))}
            </div>
          )}

          {/* Diff toggle */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "0.78rem", color: "var(--text-secondary)" }}>
              <input
                type="checkbox"
                checked={showDiff}
                onChange={() => setShowDiff(!showDiff)}
                style={{ accentColor: "var(--accent)", width: "14px", height: "14px" }}
              />
              Highlight differences
            </label>
          </div>

          {/* Side by side comparison */}
          {activePair && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                gap: isMobile ? "16px" : "24px",
              }}
            >
              {/* Source */}
              <div
                style={{
                  background: "var(--surface)",
                  borderRadius: "12px",
                  padding: isMobile ? "16px" : "24px",
                  border: "1px solid var(--border)",
                }}
              >
                <div style={{ fontSize: "0.92rem", fontWeight: 700, color: "var(--text)", marginBottom: "4px" }}>
                  {activePair.sourceBook} {activePair.sourceChapter}
                </div>
                <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: "16px" }}>
                  Source text
                </div>
                <div style={{ fontSize: "0.88rem", color: "rgba(255,255,255,0.75)", lineHeight: 1.9 }}>
                  {activePair.sourceVerses.map((sv) => {
                    // Find matching target verse
                    const tv = activePair.targetVerses.find((t) => t.verse === sv.verse);
                    const diff = showDiff && tv ? diffWords(sv.text, tv.text) : null;
                    return (
                      <div key={sv.verse} style={{ marginBottom: "8px" }}>
                        <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)", marginRight: "6px" }}>
                          {sv.verse}
                        </span>
                        {diff ? diff.source : sv.text}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Target */}
              <div
                style={{
                  background: "var(--surface)",
                  borderRadius: "12px",
                  padding: isMobile ? "16px" : "24px",
                  border: "1px solid var(--border)",
                }}
              >
                <div style={{ fontSize: "0.92rem", fontWeight: 700, color: "var(--text)", marginBottom: "4px" }}>
                  {activePair.targetBook} {activePair.targetChapter}
                </div>
                <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: "16px" }}>
                  Parallel text
                </div>
                <div style={{ fontSize: "0.88rem", color: "rgba(255,255,255,0.75)", lineHeight: 1.9 }}>
                  {activePair.targetVerses.map((tv) => {
                    const sv = activePair.sourceVerses.find((s) => s.verse === tv.verse);
                    const diff = showDiff && sv ? diffWords(sv.text, tv.text) : null;
                    return (
                      <div key={tv.verse} style={{ marginBottom: "8px" }}>
                        <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)", marginRight: "6px" }}>
                          {tv.verse}
                        </span>
                        {diff ? diff.target : tv.text}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Methodology modal */}
      <MethodologyModal
        title="How Parallel Passages Work"
        isOpen={showMethodology}
        onClose={() => setShowMethodology(false)}
        isMobile={isMobile}
      >
        <MethodSection title="Overview">
          <p style={{ margin: "0 0 8px" }}>
            Many passages in scripture appear in <strong style={{ color: "var(--text)" }}>multiple books</strong> —
            sometimes quoted verbatim, sometimes adapted or expanded. This tool places these parallel texts
            side by side so you can see exactly what changed and what was preserved.
          </p>
        </MethodSection>

        <MethodSection title="The Passage Groups">
          <p style={{ margin: "0 0 8px" }}>
            The curated passage groups include well-known textual parallels: Isaiah chapters quoted in the
            Book of Mormon, the Sermon on the Mount compared with Christ&rsquo;s sermon in 3 Nephi,
            Malachi as quoted in 3 Nephi, and other significant shared texts. Each group maps specific
            chapter-to-chapter correspondences between the source and parallel texts.
          </p>
        </MethodSection>

        <MethodSection title="Difference Highlighting">
          <p style={{ margin: "0 0 8px" }}>
            When "Highlight differences" is enabled, the tool performs a <strong style={{ color: "var(--text)" }}>word-level
            comparison</strong> between each verse pair. Words that appear in one version but not the other are
            highlighted — <span style={{ background: "rgba(239, 68, 68, 0.15)", padding: "0 3px", borderRadius: "2px" }}>red
            in the source</span> and <span style={{ background: "rgba(59, 130, 246, 0.15)", padding: "0 3px", borderRadius: "2px" }}>blue
            in the parallel</span>. This makes additions, omissions, and substitutions immediately visible.
          </p>
        </MethodSection>

        <MethodSection title="What It Shows Well">
          <p style={{ margin: "0" }}>
            This tool is ideal for studying <strong style={{ color: "var(--text)" }}>textual transmission</strong> —
            how passages were preserved, adapted, or expanded as they moved between texts. For example, comparing
            Isaiah in the KJV Bible with its quotation in the Book of Mormon reveals systematic differences
            that scholars have studied extensively. The visual diff makes these differences immediately apparent
            without requiring verse-by-verse manual comparison.
          </p>
        </MethodSection>

        <MethodNote>
          <strong style={{ color: "var(--text)" }}>For researchers:</strong> The diff algorithm compares
          word sets between corresponding verses (bag-of-words approach, ignoring word order). This highlights
          vocabulary differences effectively but does not capture word-order changes or grammatical restructuring
          within a verse. For detailed textual criticism, the highlighted passages serve as a starting point —
          use the &ldquo;Read&rdquo; links to examine full context in the scripture reader.
        </MethodNote>
      </MethodologyModal>
    </div>
  );
}
