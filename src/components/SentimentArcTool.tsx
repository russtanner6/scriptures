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
  };

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
        <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "16px", lineHeight: 1.5 }}>
          See how emotional tone shifts across scripture — promises, warnings, praise, lament, and more.
        </p>

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
        .filter((v) => results.has(v.id))
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
                        position: "top",
                        labels: {
                          color: "rgba(255,255,255,0.7)",
                          font: { size: isMobile ? 10 : 11 },
                          pointStyle: "rectRounded",
                          usePointStyle: true,
                          boxWidth: 10,
                          boxHeight: 10,
                          padding: isMobile ? 8 : 12,
                        },
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
    </div>
  );
}
