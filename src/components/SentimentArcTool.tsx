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
import { VOLUME_COLORS } from "@/lib/constants";
import { SENTIMENT_CATEGORIES } from "@/lib/sentiment-lexicon";
import Header from "./Header";
import DashboardCard from "./DashboardCard";
import ChartHints from "./ChartHints";
import ScripturePanel from "./ScripturePanel";
import MethodologyModal, { MethodSection, MethodNote, MethodLink } from "./MethodologyModal";
import type { ScripturePanelState } from "@/lib/types";

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

interface ChapterScore {
  bookId: number;
  bookName: string;
  chapter: number;
  scores: Record<string, number>;
  verseCount: number;
}

export default function SentimentArcTool() {
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
          setVolumes(data.volumes);
          setSelectedVolumes(data.volumes.map((v: Volume) => v.id));
        }
      })
      .catch(() => {});
  }, []);

  const handleAnalyze = async () => {
    if (selectedVolumes.length === 0) return;
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

      {/* Search panel */}
      <div className="search-panel" style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: isMobile ? "1.3rem" : "1.6rem", fontWeight: 700, color: "var(--text)", marginBottom: "8px" }}>
          Sentiment Arc
        </h1>
        <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "8px", lineHeight: 1.5 }}>
          See how emotional tone shifts across scripture — promises, warnings, praise, lament, and more.
        </p>
        <div style={{ marginBottom: "16px" }}>
          <MethodLink onClick={() => setShowMethodology(true)} />
        </div>

        {/* Category toggles */}
        <div style={{ marginBottom: "12px" }}>
          <div style={{ fontSize: "0.65rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: "8px" }}>
            Tone Categories
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {SENTIMENT_CATEGORIES.map((cat) => {
              const active = activeCategories.has(cat.id);
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => toggleCategory(cat.id)}
                  style={{
                    padding: "4px 12px",
                    borderRadius: "20px",
                    border: `1px solid ${active ? cat.color : "var(--border)"}`,
                    background: active ? `${cat.color}20` : "transparent",
                    color: active ? cat.color : "var(--text-muted)",
                    fontSize: "0.75rem",
                    fontWeight: active ? 600 : 400,
                    fontFamily: "inherit",
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Volume selectors + Go */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {volumes.map((v) => {
              const color = VOLUME_COLORS[v.abbrev] || "#888";
              const checked = selectedVolumes.includes(v.id);
              return (
                <label
                  key={v.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    cursor: "pointer",
                    fontSize: "0.78rem",
                    color: checked ? color : "var(--text-muted)",
                    fontWeight: checked ? 600 : 400,
                    transition: "all 0.15s",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleVolume(v.id)}
                    style={{ accentColor: color, width: "14px", height: "14px" }}
                  />
                  {isMobile ? v.abbrev : v.name}
                </label>
              );
            })}
          </div>
          <button
            onClick={handleAnalyze}
            disabled={loading || selectedVolumes.length === 0}
            style={{
              padding: "8px 24px",
              borderRadius: "8px",
              border: "none",
              background: "var(--accent)",
              color: "#fff",
              fontSize: "0.85rem",
              fontWeight: 600,
              fontFamily: "inherit",
              cursor: loading ? "wait" : "pointer",
              opacity: loading ? 0.6 : 1,
              transition: "all 0.15s",
            }}
          >
            {loading ? "Analyzing..." : "Go"}
          </button>
        </div>
      </div>

      {/* Results */}
      {hasSearched && !loading && results.size === 0 && (
        <div style={{ textAlign: "center", padding: "32px", color: "var(--text-muted)" }}>
          No results found.
        </div>
      )}

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
                  plugins={[legendMarginPlugin, ...(zoomPluginRef.current ? [zoomPluginRef.current] : [])]}
                  data={{ labels, datasets }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
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
                        },
                      },
                      datalabels: { display: false },
                      zoom: {
                        pan: { enabled: isMobile, mode: "x" as const },
                        zoom: {
                          wheel: { enabled: !isMobile, modifierKey: "alt" as const },
                          pinch: { enabled: isMobile },
                          mode: "x" as const,
                          ...(isMobile ? { drag: { enabled: false } } : {}),
                        },
                        limits: { x: { minRange: isMobile ? 5 : 10 } },
                      },
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
                        ticks: {
                          color: "rgba(255,255,255,0.5)",
                          font: { size: 10 },
                        },
                        grid: { color: "rgba(255,255,255,0.05)" },
                      },
                    },
                    onClick: (_event: any, elements: any) => {
                      if (elements.length > 0) {
                        const idx = elements[0].index;
                        const ch = chapters[idx];
                        // Get the active category from the clicked dataset
                        const dsIdx = elements[0].datasetIndex;
                        const activeCats = SENTIMENT_CATEGORIES.filter((c) => activeCategories.has(c.id));
                        const cat = activeCats[dsIdx];
                        if (cat) {
                          // Use the first word from the category as search
                          const firstWord = Array.from(cat.words)[0];
                          setPanel({
                            word: firstWord,
                            bookId: ch.bookId,
                            bookName: ch.bookName,
                            chapter: ch.chapter,
                            caseInsensitive: true,
                            wholeWord: true,
                            volumeColor: cat.color,
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
            For each chapter, every word is checked against all 7 category word lists. The score for a category
            in a given chapter is simply the <strong style={{ color: "var(--text)" }}>count of matching words</strong>.
            This raw count approach means longer chapters naturally produce higher scores — the chart reflects
            both the density and the volume of thematic language.
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
            understanding</strong>. It counts words without regard to context, negation, or figurative use.
            A verse saying &ldquo;there shall be no peace&rdquo; would still register &ldquo;peace&rdquo; in
            the Promise category. Some words appear in multiple categories where the overlap is meaningful.
            The tool is designed to surface patterns for further study — it identifies <em>where</em> to look,
            not <em>what</em> to conclude.
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
