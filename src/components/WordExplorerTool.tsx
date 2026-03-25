"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { usePreferencesContext } from "@/components/PreferencesProvider";
import { useIsMobile } from "@/lib/useIsMobile";
import { VOLUME_COLORS } from "@/lib/constants";
import { VOLUME_ABBREV_TO_SLUG, bookNameToSlug } from "@/lib/scripture-slugs";
import FilterDropdown from "@/components/FilterDropdown";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Filler,
  Tooltip,
  Legend,
} from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";
import { Bar, Line } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Filler, Tooltip, Legend, ChartDataLabels);
ChartJS.defaults.color = "#9ca3af";

// Term colors for multi-term comparison
const TERM_COLORS = ["#F5A623", "#3B82F6", "#10B981", "#F43F5E", "#06B6D4", "#8B5CF6"];

interface FrequencyResult {
  bookId: number;
  bookName: string;
  volumeName: string;
  volumeAbbrev: string;
  displayOrder: number;
  count: number;
  verseCount: number;
}

interface TermData {
  term: string;
  color: string;
  totalCount: number;
  totalVerses: number;
  results: FrequencyResult[];
}

interface MatchingVerse {
  chapter: number;
  verse: number;
  text: string;
}

type DrillLevel = "volumes" | "books" | "chapters";

export default function WordExplorerTool() {
  const { isVolumeVisible } = usePreferencesContext();
  const isMobile = useIsMobile();
  const searchParams = useSearchParams();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const initialSearchDone = useRef(false);

  // Search state
  const [currentInput, setCurrentInput] = useState("");
  const [terms, setTerms] = useState<string[]>([]);
  const [caseInsensitive, setCaseInsensitive] = useState(true);
  const [wholeWord, setWholeWord] = useState(true);
  const [isSearching, setIsSearching] = useState(false);

  // Results state
  const [termData, setTermData] = useState<TermData[]>([]);

  // Drill-down state
  const [drillLevel, setDrillLevel] = useState<DrillLevel>("volumes");
  const [selectedVolume, setSelectedVolume] = useState<string | null>(null);
  const [selectedBookId, setSelectedBookId] = useState<number | null>(null);
  const [selectedBookName, setSelectedBookName] = useState<string | null>(null);

  // Chapter-level data (fetched on drill to book)
  const [chapterData, setChapterData] = useState<Map<string, { chapter: number; count: number }[]>>(new Map());

  // Verse results
  const [verseResults, setVerseResults] = useState<MatchingVerse[]>([]);
  const [versesLoading, setVersesLoading] = useState(false);
  const [versesShown, setVersesShown] = useState(20);

  // Deep link on mount
  useEffect(() => {
    if (initialSearchDone.current) return;
    const urlTerms = searchParams.get("terms");
    const urlWord = searchParams.get("word");
    const urlCi = searchParams.get("ci");
    const urlWw = searchParams.get("ww");

    if (urlCi === "false") setCaseInsensitive(false);
    if (urlWw === "false") setWholeWord(false);

    if (urlTerms) {
      const parsed = urlTerms.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 6);
      if (parsed.length > 0) {
        setTerms(parsed);
        initialSearchDone.current = true;
      }
    } else if (urlWord) {
      setTerms([urlWord.trim()]);
      initialSearchDone.current = true;
    }
  }, [searchParams]);

  // Aggregate volume totals from per-book results
  const getVolumeTotals = useCallback((results: FrequencyResult[]) => {
    const volMap = new Map<string, { abbrev: string; name: string; count: number }>();
    for (const r of results) {
      if (!isVolumeVisible(r.volumeAbbrev)) continue;
      const existing = volMap.get(r.volumeAbbrev);
      if (existing) {
        existing.count += r.count;
      } else {
        volMap.set(r.volumeAbbrev, { abbrev: r.volumeAbbrev, name: r.volumeName, count: r.count });
      }
    }
    return Array.from(volMap.values()).sort((a, b) => {
      const order = ["OT", "NT", "BoM", "D&C", "PoGP", "Apoc"];
      return order.indexOf(a.abbrev) - order.indexOf(b.abbrev);
    });
  }, [isVolumeVisible]);

  // Search for all terms
  const doSearch = useCallback(async (searchTerms: string[]) => {
    if (searchTerms.length === 0) return;
    setIsSearching(true);
    setDrillLevel("volumes");
    setSelectedVolume(null);
    setSelectedBookId(null);
    setSelectedBookName(null);
    setVerseResults([]);
    setChapterData(new Map());

    const results: TermData[] = [];
    for (let i = 0; i < searchTerms.length; i++) {
      const term = searchTerms[i];
      const params = new URLSearchParams({
        word: term,
        caseInsensitive: String(caseInsensitive),
        wholeWord: String(wholeWord),
      });
      try {
        const res = await fetch(`/api/word-frequency?${params}`);
        const data = await res.json();
        results.push({
          term,
          color: TERM_COLORS[i % TERM_COLORS.length],
          totalCount: data.totalCount || 0,
          totalVerses: data.totalVerses || 0,
          results: data.results || [],
        });
      } catch {
        results.push({ term, color: TERM_COLORS[i % TERM_COLORS.length], totalCount: 0, totalVerses: 0, results: [] });
      }
    }
    setTermData(results);
    setIsSearching(false);

    // Update URL
    const urlParams = new URLSearchParams();
    if (searchTerms.length === 1) urlParams.set("word", searchTerms[0]);
    else urlParams.set("terms", searchTerms.join(","));
    if (!caseInsensitive) urlParams.set("ci", "false");
    if (!wholeWord) urlParams.set("ww", "false");
    window.history.replaceState({}, "", `?${urlParams}`);
  }, [caseInsensitive, wholeWord]);

  // Auto-search when terms change (from deep link or adding terms)
  useEffect(() => {
    if (terms.length > 0) doSearch(terms);
  }, [terms, doSearch]);

  // Add a term
  const addTerm = () => {
    const val = currentInput.trim().toLowerCase();
    if (!val || terms.includes(val) || terms.length >= 6) return;
    setTerms([...terms, val]);
    setCurrentInput("");
    searchInputRef.current?.focus();
  };

  // Remove a term
  const removeTerm = (term: string) => {
    const next = terms.filter((t) => t !== term);
    setTerms(next);
    if (next.length === 0) {
      setTermData([]);
      setDrillLevel("volumes");
    }
  };

  // Drill into a volume
  const drillToVolume = (abbrev: string) => {
    setSelectedVolume(abbrev);
    setSelectedBookId(null);
    setSelectedBookName(null);
    setDrillLevel("books");
    setVersesShown(20);
    // Fetch verse results for this volume
    fetchVersesForVolume(abbrev);
  };

  // Fetch verses matching the first term for a volume
  const fetchVersesForVolume = async (volAbbrev: string) => {
    if (termData.length === 0) return;
    const firstTerm = termData[0];
    const booksInVol = firstTerm.results.filter((r) => r.volumeAbbrev === volAbbrev);
    if (booksInVol.length === 0) return;

    setVersesLoading(true);
    const allVerses: MatchingVerse[] = [];
    // Fetch from first few books with matches (limit to avoid too many requests)
    const booksWithMatches = booksInVol.filter((b) => b.count > 0).slice(0, 10);
    for (const book of booksWithMatches) {
      try {
        const params = new URLSearchParams({
          word: firstTerm.term,
          bookId: String(book.bookId),
          caseInsensitive: String(caseInsensitive),
          wholeWord: String(wholeWord),
        });
        const res = await fetch(`/api/verses?${params}`);
        const data = await res.json();
        if (data.verses) allVerses.push(...data.verses);
      } catch { /* skip */ }
    }
    setVerseResults(allVerses);
    setVersesLoading(false);
  };

  // Drill into a book
  const drillToBook = async (bookId: number, bookName: string) => {
    setSelectedBookId(bookId);
    setSelectedBookName(bookName);
    setDrillLevel("chapters");
    setVersesShown(20);

    // Fetch chapter-level data for each term
    const newChapterData = new Map<string, { chapter: number; count: number }[]>();
    for (const td of termData) {
      const book = td.results.find((r) => r.bookId === bookId);
      if (!book) continue;
      try {
        const params = new URLSearchParams({
          word: td.term,
          bookId: String(bookId),
          chapterCount: "200", // will be capped by API
          caseInsensitive: String(caseInsensitive),
          wholeWord: String(wholeWord),
        });
        const res = await fetch(`/api/word-frequency-by-chapter?${params}`);
        const data = await res.json();
        newChapterData.set(td.term, data.results || []);
      } catch { /* skip */ }
    }
    setChapterData(newChapterData);

    // Fetch verses for this book
    if (termData.length > 0) {
      setVersesLoading(true);
      try {
        const params = new URLSearchParams({
          word: termData[0].term,
          bookId: String(bookId),
          caseInsensitive: String(caseInsensitive),
          wholeWord: String(wholeWord),
        });
        const res = await fetch(`/api/verses?${params}`);
        const data = await res.json();
        setVerseResults(data.verses || []);
      } catch { setVerseResults([]); }
      setVersesLoading(false);
    }
  };

  // Go back up a level
  const goBack = () => {
    if (drillLevel === "chapters") {
      setDrillLevel("books");
      setSelectedBookId(null);
      setSelectedBookName(null);
      setVerseResults([]);
      if (selectedVolume) fetchVersesForVolume(selectedVolume);
    } else if (drillLevel === "books") {
      setDrillLevel("volumes");
      setSelectedVolume(null);
      setVerseResults([]);
    }
  };

  // Get books for selected volume
  const booksInSelectedVolume = useMemo(() => {
    if (!selectedVolume || termData.length === 0) return [];
    return termData[0].results
      .filter((r) => r.volumeAbbrev === selectedVolume)
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }, [selectedVolume, termData]);

  // Highlight search term in verse text
  const highlightTerm = (text: string, term: string) => {
    if (!term) return text;
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(${escaped})`, "gi");
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? <mark key={i} style={{ background: "#F5A62340", color: "inherit", borderRadius: "2px", padding: "0 1px" }}>{part}</mark> : part
    );
  };

  // Build verse URL
  const getVerseUrl = (verse: MatchingVerse) => {
    if (!selectedVolume) return "#";
    const volSlug = VOLUME_ABBREV_TO_SLUG[selectedVolume];
    const bookSlug = selectedBookName ? bookNameToSlug(selectedBookName) : "";
    return `/scriptures/${volSlug}/${bookSlug}/${verse.chapter}?verse=${verse.verse}`;
  };

  // ── RENDER ──

  const hasResults = termData.length > 0 && termData.some((t) => t.totalCount > 0);

  return (
    <div style={{ paddingBottom: "60px" }}>
      {/* Search Panel */}
      <div style={{ maxWidth: "700px", margin: "0 auto", textAlign: "center", marginBottom: "32px" }}>
        <h1 style={{ fontSize: isMobile ? "1.4rem" : "1.8rem", fontWeight: 800, color: "var(--text)", marginBottom: "8px", letterSpacing: "0.02em" }}>
          Word Explorer
        </h1>
        <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", marginBottom: "24px", lineHeight: 1.5 }}>
          Search for words across all scripture volumes. Add multiple terms to compare. Drill down from volumes to books to chapters.
        </p>

        {/* Search bar */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "12px", maxWidth: "500px", margin: "0 auto 12px" }}>
          <div style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "10px",
            padding: "0 12px",
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4, flexShrink: 0 }}>
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              ref={searchInputRef}
              type="text"
              value={currentInput}
              onChange={(e) => setCurrentInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") addTerm(); }}
              placeholder={terms.length > 0 ? "Add another term..." : "Search for a word..."}
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                outline: "none",
                padding: "10px 8px",
                fontSize: "0.92rem",
                color: "var(--text)",
                fontFamily: "inherit",
              }}
            />
          </div>
          <button
            onClick={addTerm}
            disabled={!currentInput.trim()}
            style={{
              padding: "10px 20px",
              borderRadius: "10px",
              border: "none",
              background: currentInput.trim() ? "linear-gradient(135deg, #3B82F6, #2563EB)" : "rgba(255,255,255,0.06)",
              color: currentInput.trim() ? "#fff" : "var(--text-muted)",
              fontSize: "0.85rem",
              fontWeight: 600,
              cursor: currentInput.trim() ? "pointer" : "default",
              fontFamily: "inherit",
              transition: "all 0.15s",
            }}
          >
            {terms.length > 0 ? "Add" : "Go"}
          </button>
        </div>

        {/* Options */}
        <div style={{ display: "flex", justifyContent: "center", gap: "16px", marginBottom: "16px" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.78rem", color: "var(--text-muted)", cursor: "pointer" }}>
            <input type="checkbox" checked={!caseInsensitive} onChange={() => setCaseInsensitive(!caseInsensitive)} style={{ accentColor: "#3B82F6" }} />
            Case sensitive
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.78rem", color: "var(--text-muted)", cursor: "pointer" }}>
            <input type="checkbox" checked={wholeWord} onChange={() => setWholeWord(!wholeWord)} style={{ accentColor: "#3B82F6" }} />
            Exact match
          </label>
        </div>

        {/* Term chips */}
        {terms.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "center", marginBottom: "16px" }}>
            {terms.map((term, i) => (
              <div
                key={term}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "5px 10px 5px 12px",
                  borderRadius: "20px",
                  background: `${TERM_COLORS[i % TERM_COLORS.length]}20`,
                  border: `1px solid ${TERM_COLORS[i % TERM_COLORS.length]}40`,
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  color: TERM_COLORS[i % TERM_COLORS.length],
                }}
              >
                {term}
                <button
                  onClick={() => removeTerm(term)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: TERM_COLORS[i % TERM_COLORS.length],
                    fontSize: "0.9rem",
                    padding: "0 2px",
                    lineHeight: 1,
                    fontFamily: "inherit",
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Loading */}
      {isSearching && (
        <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
          Searching...
        </div>
      )}

      {/* Drill-down breadcrumb + back button */}
      {hasResults && drillLevel !== "volumes" && (
        <div style={{ maxWidth: "900px", margin: "0 auto 16px", display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            onClick={goBack}
            style={{
              background: "none",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              padding: "6px 12px",
              color: "var(--text-secondary)",
              fontSize: "0.78rem",
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            ← Back
          </button>
          <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
            {drillLevel === "books" && selectedVolume}
            {drillLevel === "chapters" && `${selectedVolume} → ${selectedBookName}`}
          </span>
        </div>
      )}

      {/* ── LEVEL 1: Volume Chart ── */}
      {hasResults && drillLevel === "volumes" && (
        <div style={{ maxWidth: "900px", margin: "0 auto", marginBottom: "32px" }}>
          {/* Volume pills — click to drill down */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "center", marginBottom: "20px" }}>
            <span style={{ fontSize: "0.72rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", alignSelf: "center", marginRight: "4px" }}>
              Drill into:
            </span>
            {getVolumeTotals(termData[0].results).map((vol) => (
              <button
                key={vol.abbrev}
                onClick={() => drillToVolume(vol.abbrev)}
                style={{
                  padding: "6px 14px",
                  borderRadius: "8px",
                  border: `1px solid ${VOLUME_COLORS[vol.abbrev]}50`,
                  background: `${VOLUME_COLORS[vol.abbrev]}15`,
                  color: VOLUME_COLORS[vol.abbrev],
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  transition: "all 0.15s",
                }}
              >
                {vol.name} ({vol.count.toLocaleString()})
              </button>
            ))}
          </div>

          <div style={{ height: isMobile ? "280px" : "360px", marginBottom: "24px" }}>
            <Line
              data={{
                labels: (() => {
                  const vols = getVolumeTotals(termData[0].results);
                  return vols.map((v) => v.abbrev);
                })(),
                datasets: termData.map((td) => {
                  const vols = getVolumeTotals(td.results);
                  return {
                    label: td.term,
                    data: vols.map((v) => {
                      const termVols = getVolumeTotals(td.results);
                      const match = termVols.find((tv) => tv.abbrev === v.abbrev);
                      return match?.count || 0;
                    }),
                    borderColor: td.color,
                    backgroundColor: `${td.color}20`,
                    fill: termData.length === 1,
                    tension: 0.4,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    borderWidth: 2,
                  };
                }),
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: termData.length > 1 },
                  datalabels: {
                    display: true,
                    anchor: "end" as const,
                    align: "top" as const,
                    color: "#fff",
                    font: { weight: "bold" as const, size: 12 },
                    formatter: (val: number) => val > 0 ? val.toLocaleString() : "",
                  },
                },
                scales: {
                  y: { beginAtZero: true, grid: { color: "rgba(255,255,255,0.06)" } },
                  x: { grid: { display: false } },
                },
                layout: { padding: { top: 30 } },
              }}
            />
          </div>

          {/* Total stats */}
          {termData.length === 1 && (
            <div style={{ textAlign: "center", marginTop: "20px", fontSize: "0.82rem", color: "var(--text-muted)" }}>
              &ldquo;{termData[0].term}&rdquo; appears <strong style={{ color: "var(--text)" }}>{termData[0].totalCount.toLocaleString()}</strong> times in <strong style={{ color: "var(--text)" }}>{termData[0].totalVerses.toLocaleString()}</strong> verses
            </div>
          )}
        </div>
      )}

      {/* ── LEVEL 2: Book Chart ── */}
      {hasResults && drillLevel === "books" && selectedVolume && (
        <div style={{ maxWidth: "900px", margin: "0 auto", marginBottom: "32px" }}>
          <div style={{ height: isMobile ? "300px" : "400px", marginBottom: "24px" }}>
            <Line
              data={{
                labels: booksInSelectedVolume.map((b) => b.bookName),
                datasets: termData.map((td) => {
                  const books = td.results
                    .filter((r) => r.volumeAbbrev === selectedVolume)
                    .sort((a, b) => a.displayOrder - b.displayOrder);
                  return {
                    label: td.term,
                    data: booksInSelectedVolume.map((b) => {
                      const match = books.find((bb) => bb.bookId === b.bookId);
                      return match?.count || 0;
                    }),
                    borderColor: td.color,
                    backgroundColor: `${td.color}20`,
                    fill: termData.length === 1,
                    tension: 0.3,
                    pointRadius: 3,
                    pointHoverRadius: 5,
                  };
                }),
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: termData.length > 1 },
                  datalabels: { display: false },
                },
                scales: {
                  y: { beginAtZero: true, grid: { color: "rgba(255,255,255,0.06)" } },
                  x: {
                    grid: { display: false },
                    ticks: {
                      maxRotation: 90,
                      minRotation: 45,
                      font: { size: isMobile ? 9 : 11 },
                    },
                  },
                },
              }}
            />
          </div>

          {/* Book pills — click to drill deeper */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", justifyContent: "center", marginBottom: "24px" }}>
            {booksInSelectedVolume.filter((b) => b.count > 0).map((book) => (
              <button
                key={book.bookId}
                onClick={() => drillToBook(book.bookId, book.bookName)}
                style={{
                  padding: "5px 10px",
                  borderRadius: "6px",
                  border: `1px solid ${VOLUME_COLORS[selectedVolume]}30`,
                  background: "transparent",
                  color: "var(--text-secondary)",
                  fontSize: "0.75rem",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  transition: "all 0.15s",
                }}
              >
                {book.bookName} ({book.count})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── LEVEL 3: Chapter Chart ── */}
      {hasResults && drillLevel === "chapters" && selectedBookId && (
        <div style={{ maxWidth: "900px", margin: "0 auto", marginBottom: "32px" }}>
          {chapterData.size > 0 && (
            <div style={{ height: isMobile ? "260px" : "340px", marginBottom: "24px" }}>
              <Line
                data={{
                  labels: (() => {
                    const firstTermChapters = chapterData.values().next().value as { chapter: number; count: number }[] | undefined;
                    if (!firstTermChapters) return [];
                    return firstTermChapters.map((c) => `${c.chapter}`);
                  })(),
                  datasets: termData.map((td) => {
                    const chapters = chapterData.get(td.term) || [];
                    return {
                      label: td.term,
                      data: chapters.map((c) => c.count),
                      borderColor: td.color,
                      backgroundColor: `${td.color}20`,
                      fill: termData.length === 1,
                      tension: 0.3,
                      pointRadius: 2,
                      pointHoverRadius: 4,
                    };
                  }),
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: termData.length > 1 },
                    datalabels: { display: false },
                  },
                  scales: {
                    y: { beginAtZero: true, grid: { color: "rgba(255,255,255,0.06)" } },
                    x: {
                      grid: { display: false },
                      title: { display: true, text: selectedVolume === "D&C" ? "Section" : "Chapter", color: "var(--text-muted)" },
                      ticks: {
                        callback: function (val: string | number, index: number, ticks: unknown[]) {
                          const total = (ticks as unknown[]).length;
                          if (total <= 20) return val;
                          if (index === 0 || index === total - 1 || index === Math.floor(total / 2)) return val;
                          if (total > 50 && index % 10 === 0) return val;
                          if (total <= 50 && index % 5 === 0) return val;
                          return "";
                        },
                        font: { size: 10 },
                      },
                    },
                  },
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* ── Verse References (Level 2 and 3) ── */}
      {hasResults && drillLevel !== "volumes" && (
        <div style={{ maxWidth: "700px", margin: "0 auto" }}>
          <div style={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", marginBottom: "12px" }}>
            {versesLoading ? "Searching verses..." : `${verseResults.length} matching verse${verseResults.length !== 1 ? "s" : ""}`}
          </div>

          {verseResults.slice(0, versesShown).map((v, i) => (
            <a
              key={`${v.chapter}-${v.verse}-${i}`}
              href={getVerseUrl(v)}
              style={{
                display: "block",
                padding: "12px 14px",
                marginBottom: "8px",
                borderRadius: "8px",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                textDecoration: "none",
                transition: "all 0.15s",
              }}
            >
              <div style={{ fontSize: "0.75rem", fontWeight: 700, color: selectedVolume ? VOLUME_COLORS[selectedVolume] : "var(--text)", marginBottom: "4px" }}>
                {selectedBookName} {v.chapter}:{v.verse}
              </div>
              <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                {highlightTerm(v.text.length > 200 ? v.text.slice(0, 200) + "..." : v.text, termData[0]?.term || "")}
              </div>
            </a>
          ))}

          {verseResults.length > versesShown && (
            <button
              onClick={() => setVersesShown((prev) => prev + 20)}
              style={{
                display: "block",
                width: "100%",
                padding: "10px",
                borderRadius: "8px",
                border: "1px solid var(--border)",
                background: "transparent",
                color: "var(--text-secondary)",
                fontSize: "0.82rem",
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
                marginTop: "8px",
              }}
            >
              Load more ({verseResults.length - versesShown} remaining)
            </button>
          )}
        </div>
      )}

      {/* Empty state with presets */}
      {!isSearching && termData.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px 20px" }}>
          <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", marginBottom: "20px" }}>
            Try searching for a word to explore its frequency across all scriptures.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "center" }}>
            {["faith", "repent", "covenant", "grace", "pray", "love"].map((word) => (
              <button
                key={word}
                onClick={() => { setTerms([word]); setCurrentInput(""); }}
                style={{
                  padding: "8px 16px",
                  borderRadius: "20px",
                  border: "1px solid var(--border)",
                  background: "rgba(255,255,255,0.04)",
                  color: "var(--text-secondary)",
                  fontSize: "0.82rem",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  transition: "all 0.15s",
                }}
              >
                {word}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
