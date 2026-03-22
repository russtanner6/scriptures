"use client";

import { useState, useEffect, useRef } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Filler,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";
import type { Volume } from "@/lib/types";
import { VOLUME_COLORS, getContrastText } from "@/lib/constants";
import { SENTIMENT_CATEGORIES } from "@/lib/sentiment-lexicon";
import Header from "./Header";
import DashboardCard from "./DashboardCard";
import ChartHints from "./ChartHints";
import ScripturePanel from "./ScripturePanel";
import FilterDropdown from "./FilterDropdown";
import MethodologyModal, { MethodSection, MethodNote, MethodLink } from "./MethodologyModal";
import type { ScripturePanelState } from "@/lib/types";
import { chartScrollbarPlugin } from "@/lib/chart-scrollbar-plugin";
import { usePreferencesContext } from "@/components/PreferencesProvider";
import { useIsMobile } from "@/lib/useIsMobile";
import { analytics } from "@/lib/analytics";

ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, Filler, Tooltip, Legend);

const legendMarginPlugin = {
  id: "legendMarginSentiment",
  beforeInit(chart: any) {
    const origFit = chart.legend.fit;
    chart.legend.fit = function fit() {
      origFit.call(this);
      this.height += 20;
    };
  },
};

interface ChapterScore {
  bookId: number;
  bookName: string;
  chapter: number;
  scores: Record<string, number>;
  wordCount: number;
  lowConfidence: boolean;
  verseCount: number;
}

export default function SentimentArcTool() {
  const { isVolumeVisible } = usePreferencesContext();
  const isMobile = useIsMobile();
  const [volumes, setVolumes] = useState<Volume[]>([]);
  const [selectedVolumes, setSelectedVolumes] = useState<number[]>([]);
  const [activeCategories, setActiveCategories] = useState<Set<string>>(
    new Set(SENTIMENT_CATEGORIES.map((c) => c.id))
  );
  const [results, setResults] = useState<Map<number, ChapterScore[]>>(new Map());
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [panel, setPanel] = useState<ScripturePanelState | null>(null);
  const [showMethodology, setShowMethodology] = useState(false);
  const chartRefs = useRef<Map<number, React.RefObject<any>>>(new Map());

  // Zoom plugin
  const zoomPluginRef = useRef<any>(null);
  const [zoomReady, setZoomReady] = useState(false);
  useEffect(() => {
    import("chartjs-plugin-zoom").then((mod) => {
      zoomPluginRef.current = mod.default;
      setZoomReady(true);
    });
  }, []);

  // Load volumes
  useEffect(() => {
    fetch("/api/books")
      .then((r) => r.json())
      .then((data) => {
        if (data.volumes) {
          const filtered = data.volumes.filter((v: Volume) => isVolumeVisible(v.abbrev));
          setVolumes(filtered);
          setSelectedVolumes(filtered.map((v: Volume) => v.id));
        }
      })
      .catch(() => {});
  }, []);

  const handleAnalyze = async () => {
    if (selectedVolumes.length === 0) return;
    const volNames = volumes.filter((v) => selectedVolumes.includes(v.id)).map((v) => v.abbrev).join(",");
    analytics.search(volNames, "sentiment");
    setLoading(true);
    setHasSearched(true);

    const newResults = new Map<number, ChapterScore[]>();
    for (const volId of selectedVolumes) {
      try {
        const resp = await fetch(`/api/sentiment?volumeId=${volId}`);
        const data = await resp.json();
        if (data.chapters) {
          newResults.set(volId, data.chapters);
        }
      } catch {}
    }
    setResults(newResults);
    setLoading(false);
  };

  const toggleVolume = (id: number) => {
    setSelectedVolumes((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
    );
    // Don't clear results — let toggles filter display reactively
  };

  // Auto-fetch data for newly toggled-on volumes that don't have data yet
  useEffect(() => {
    if (!hasSearched || results.size === 0) return;
    const missingVolIds = selectedVolumes.filter((volId) => !results.has(volId));
    if (missingVolIds.length === 0) return;

    (async () => {
      const newResults = new Map(results);
      for (const volId of missingVolIds) {
        try {
          const resp = await fetch(`/api/sentiment?volumeId=${volId}`);
          const data = await resp.json();
          if (data.chapters) {
            newResults.set(volId, data.chapters);
          }
        } catch {}
      }
      setResults(newResults);
    })();
  }, [selectedVolumes]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleCategory = (catId: string) => {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) {
        if (next.size > 1) next.delete(catId);
      } else {
        next.add(catId);
      }
      return next;
    });
  };

  return (
    <div className="page-container">
      <Header />

      {/* Search panel — two-column layout */}
      <div className="search-panel" style={{ marginBottom: "24px" }}>
        <div style={{ display: "flex", gap: isMobile ? "16px" : "24px", flexDirection: isMobile ? "column" : "row", alignItems: "flex-start" }}>
          {/* LEFT COLUMN — Title, description, method link, Go button */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontSize: isMobile ? "1.2rem" : "1.4rem", fontWeight: 700, color: "var(--text)", marginBottom: "6px", lineHeight: 1.2 }}>
              Sentiment Arc
            </h1>
            <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "10px", lineHeight: 1.4 }}>
              See how emotional tone shifts across scripture — promises, warnings, praise, and more.
            </p>
            <MethodLink onClick={() => setShowMethodology(true)} />
            <div style={{ marginTop: "14px" }}>
              <button
                onClick={handleAnalyze}
                disabled={loading || selectedVolumes.length === 0}
                style={{
                  padding: "10px 28px",
                  borderRadius: "10px",
                  border: "none",
                  background: loading || selectedVolumes.length === 0 ? "var(--zinc-800)" : "var(--accent)",
                  color: loading || selectedVolumes.length === 0 ? "var(--text-muted)" : "#fff",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  fontFamily: "inherit",
                  cursor: loading ? "wait" : "pointer",
                  transition: "all 0.15s",
                }}
              >
                {loading ? "Searching..." : "Go"}
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN — Filter dropdowns */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", flexShrink: 0, paddingTop: isMobile ? "0" : "36px" }}>
            <FilterDropdown
              label="Volumes"
              activeCount={selectedVolumes.length}
              totalCount={volumes.length}
              colorDots={volumes.filter(v => selectedVolumes.includes(v.id)).map(v => VOLUME_COLORS[v.abbrev])}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {volumes.map((v) => {
                  const isActive = selectedVolumes.includes(v.id);
                  const color = VOLUME_COLORS[v.abbrev];
                  return (
                    <label key={v.id} style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "0.82rem", fontWeight: isActive ? 600 : 400, color: isActive ? "var(--text)" : "var(--text-secondary)", transition: "color 0.15s", whiteSpace: "nowrap" }}>
                      <span onClick={(e) => { e.preventDefault(); toggleVolume(v.id); }} style={{ width: "14px", height: "14px", borderRadius: "3px", border: isActive ? `2px solid ${color}` : "2px solid rgba(255,255,255,0.2)", background: isActive ? color : "transparent", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s", flexShrink: 0 }}>
                        {isActive && <svg width="8" height="8" viewBox="0 0 10 10" fill="none"><path d="M2 5L4 7L8 3" stroke={getContrastText(color)} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                      </span>
                      {v.name}
                    </label>
                  );
                })}
              </div>
            </FilterDropdown>

            <FilterDropdown
              label="Tone Categories"
              activeCount={activeCategories.size}
              totalCount={SENTIMENT_CATEGORIES.length}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {SENTIMENT_CATEGORIES.map((cat) => {
                  const active = activeCategories.has(cat.id);
                  return (
                    <button key={cat.id} onClick={() => toggleCategory(cat.id)} style={{
                      display: "flex", alignItems: "center", gap: "8px",
                      background: "none", border: "none", cursor: "pointer",
                      fontSize: "0.82rem", fontFamily: "inherit",
                      color: active ? cat.color : "var(--text-muted)",
                      fontWeight: active ? 600 : 400,
                      padding: "2px 0", transition: "all 0.15s",
                    }}>
                      <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: active ? cat.color : "rgba(255,255,255,0.15)", flexShrink: 0, transition: "all 0.15s" }} />
                      {cat.label}
                    </button>
                  );
                })}
              </div>
            </FilterDropdown>
          </div>
        </div>
      </div>

      {/* Results */}
      {hasSearched && !loading && results.size === 0 && (
        <div style={{ textAlign: "center", padding: "32px", color: "var(--text-muted)" }}>
          No results found.
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {volumes
        .filter((v) => results.has(v.id) && selectedVolumes.includes(v.id))
        .map((vol) => {
          const chapters = results.get(vol.id)!;
          const color = VOLUME_COLORS[vol.abbrev] || "#888";
          const isSingleBook = vol.books.length === 1;

          // Build labels
          const labels = chapters.map((ch) =>
            isSingleBook
              ? `${ch.chapter}`
              : `${ch.bookName} ${ch.chapter}`
          );

          // Build datasets for active categories
          const datasets = SENTIMENT_CATEGORIES
            .filter((cat) => activeCategories.has(cat.id))
            .map((cat) => ({
              label: cat.label,
              data: chapters.map((ch) => ch.scores[cat.id] || 0),
              borderColor: cat.color,
              backgroundColor: cat.color + "30",
              fill: false,
              tension: 0.4,
              borderWidth: 2,
              pointRadius: isMobile ? 1 : 2,
              pointHoverRadius: 5,
              pointHitRadius: isMobile ? 20 : 10,
              pointBackgroundColor: cat.color,
            }));

          if (!chartRefs.current.has(vol.id)) {
            const ref = { current: null };
            chartRefs.current.set(vol.id, ref as React.RefObject<any>);
          }
          const chartRef = chartRefs.current.get(vol.id)!;

          return (
            <DashboardCard
              key={vol.id}
              title={vol.name}
              description={`Tone distribution across ${chapters.length} chapters`}
            >
              <ChartHints isMobile={isMobile} />
              <div
                style={{ height: isMobile ? "300px" : "420px", position: "relative" }}
                onDoubleClick={() => {
                  const chart = (chartRef as any)?.current;
                  if (chart?.resetZoom) chart.resetZoom();
                }}
              >
                <Line
                  ref={chartRef}
                  key={`sentiment-${vol.id}-${zoomReady}`}
                  plugins={[legendMarginPlugin, ...(zoomPluginRef.current ? [zoomPluginRef.current] : []), chartScrollbarPlugin]}
                  data={{ labels, datasets }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    layout: { padding: { bottom: 20 } },
                    interaction: { mode: "index", intersect: false },
                    plugins: {
                      legend: {
                        display: false, // Hidden — we use our own category toggles above
                      },
                      tooltip: {
                        backgroundColor: "rgba(20,20,30,0.95)",
                        titleFont: { size: 12 },
                        bodyFont: { size: 11 },
                        callbacks: {
                          title: (items: any) => {
                            const idx = items[0]?.dataIndex;
                            if (idx == null) return "";
                            const ch = chapters[idx];
                            return isSingleBook
                              ? `Section ${ch.chapter}`
                              : `${ch.bookName} ${ch.chapter}`;
                          },
                          label: (context: any) => {
                            const val = context.parsed?.y;
                            const label = context.dataset?.label || "";
                            return `${label}: ${val?.toFixed(1)} per 1k words`;
                          },
                          afterBody: (items: any) => {
                            const idx = items[0]?.dataIndex;
                            if (idx == null) return "";
                            const ch = chapters[idx];
                            const lines: string[] = [];
                            if (ch.lowConfidence) {
                              lines.push("⚠ Short chapter — data may be skewed");
                            }
                            return lines;
                          },
                        },
                      },
                      datalabels: { display: false },
                      zoom: {
                        pan: { enabled: isMobile, mode: "x", threshold: 10 },
                        zoom: {
                          wheel: { enabled: !isMobile, modifierKey: "alt" },
                          pinch: { enabled: isMobile, threshold: 10 },
                          mode: "x",
                          ...(isMobile ? { drag: { enabled: false } } : {}),
                        },
                        limits: { x: { minRange: isMobile ? 8 : 10 } },
                      } as any,
                    },
                    scales: {
                      x: {
                        ticks: {
                          color: "rgba(255,255,255,0.5)",
                          font: { size: isMobile ? 8 : 10 },
                          maxRotation: 90,
                          autoSkip: true,
                          maxTicksLimit: isMobile ? 15 : 40,
                        },
                        grid: { color: "rgba(255,255,255,0.05)" },
                      },
                      y: {
                        beginAtZero: true,
                        title: {
                          display: !isMobile,
                          text: "Frequency per 1,000 words",
                          color: "rgba(255,255,255,0.5)",
                          font: { size: 11 },
                        },
                        ticks: {
                          color: "rgba(255,255,255,0.5)",
                          font: { size: 10 },
                        },
                        grid: { color: "rgba(255,255,255,0.05)" },
                      },
                    },
                    onClick: (_event: any, elements: any, chart: any) => {
                      if (elements.length > 0) {
                        // elements contains all datasets at this x-index (mode: "index").
                        // Find the one whose rendered y-position is closest to the click.
                        const clickY = _event.y as number;
                        let closestEl = elements[0];
                        let minDist = Infinity;
                        for (const el of elements) {
                          const meta = chart.getDatasetMeta(el.datasetIndex);
                          const point = meta.data[el.index];
                          if (point) {
                            const dist = Math.abs(point.y - clickY);
                            if (dist < minDist) {
                              minDist = dist;
                              closestEl = el;
                            }
                          }
                        }
                        const idx = closestEl.index;
                        const ch = chapters[idx];
                        // Get the active category from the clicked dataset
                        const dsIdx = closestEl.datasetIndex;
                        const activeCats = SENTIMENT_CATEGORIES.filter((c) => activeCategories.has(c.id));
                        const cat = activeCats[dsIdx];
                        if (cat) {
                          // Pass ALL category words so panel shows every matching verse
                          const allWords = Array.from(cat.words).join("|");
                          setPanel({
                            word: allWords,
                            bookId: ch.bookId,
                            bookName: ch.bookName,
                            chapter: ch.chapter,
                            caseInsensitive: true,
                            wholeWord: true,
                            volumeColor: cat.color,
                            displayLabel: cat.label,
                          });
                        }
                      }
                    },
                  }}
                />
              </div>
            </DashboardCard>
          );
        })}
      </div>

      {panel && (
        <ScripturePanel
          {...panel}
          onClose={() => setPanel(null)}
        />
      )}

      {/* Methodology modal */}
      <MethodologyModal
        title="How Sentiment Analysis Works"
        isOpen={showMethodology}
        onClose={() => setShowMethodology(false)}
        isMobile={isMobile}
      >
        <MethodSection title="Overview">
          <p style={{ margin: "0 0 8px" }}>
            This tool measures the <strong style={{ color: "var(--text)" }}>emotional and thematic tone</strong> of
            scripture by counting how frequently words associated with specific categories appear in each chapter.
            It reveals macro-level patterns — how the tone of an entire book shifts from chapter to chapter.
          </p>
        </MethodSection>

        <MethodSection title="The Lexicon">
          <p style={{ margin: "0 0 8px" }}>
            Each of the 7 categories contains a curated list of 30–50 English words strongly associated with that tone.
            For example, the <strong style={{ color: "#10b981" }}>Promise &amp; Blessing</strong> category includes words
            like <em>bless, salvation, mercy, grace, peace, redeem, forgive, heal</em>, while
            the <strong style={{ color: "#ef4444" }}>Warning &amp; Judgment</strong> category includes <em>woe, destroy,
            wrath, curse, damnation, affliction</em>.
          </p>
          <p style={{ margin: "0 0 8px" }}>
            The full list of {SENTIMENT_CATEGORIES.reduce((sum, c) => sum + c.words.size, 0)} words across
            all categories was curated specifically for scriptural language patterns, drawing on the vocabulary
            of the King James tradition used across all five standard works.
          </p>
        </MethodSection>

        <MethodSection title="Scoring Method">
          <p style={{ margin: "0 0 8px" }}>
            For each chapter, every word is checked against all 7 category word lists. Scores
            are <strong style={{ color: "var(--text)" }}>normalized to frequency per 1,000 words</strong>,
            so short and long chapters are directly comparable. A 2-word negation look-back skips
            keywords preceded by words like &ldquo;not,&rdquo; &ldquo;no,&rdquo; &ldquo;never,&rdquo;
            or &ldquo;without&rdquo; — so &ldquo;shall not destroy&rdquo; no longer inflates
            the Warning score. Chapters under 50 words receive a dampening factor to reduce noise.
          </p>
        </MethodSection>

        <MethodSection title="What It Shows Well">
          <p style={{ margin: "0" }}>
            The Sentiment Arc is best used for identifying <strong style={{ color: "var(--text)" }}>broad tonal
            shifts</strong> across a book or volume — where does the text shift from warning to promise?
            Where does praise concentrate? It can surface structural patterns like the shift from prophetic
            warning to covenant language in Isaiah, or the dramatic tonal change in 3 Nephi when Christ appears.
          </p>
        </MethodSection>

        <MethodSection title="Known Limitations">
          <p style={{ margin: "0" }}>
            This is <strong style={{ color: "var(--text)" }}>keyword frequency analysis, not natural language
            understanding</strong>. While basic negation is handled (2-word look-back), it cannot detect
            figurative use, sarcasm, or complex grammatical structures. Some words appear in multiple
            categories where the overlap is meaningful. The tool is designed to surface patterns for
            further study — it identifies <em>where</em> to look, not <em>what</em> to conclude.
          </p>
        </MethodSection>

        <MethodNote>
          <strong style={{ color: "var(--text)" }}>For researchers:</strong> This approach is analogous to
          dictionary-based sentiment analysis methods used in computational linguistics (e.g., LIWC, NRC
          Emotion Lexicon), adapted for the specific vocabulary of KJV-tradition scriptural texts. The
          categories were designed to reflect theological themes rather than general emotional valence.
          Results should be treated as exploratory — a starting point for close reading, not a substitute for it.
        </MethodNote>
      </MethodologyModal>
    </div>
  );
}
