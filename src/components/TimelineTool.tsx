"use client";

import { useState, useEffect, useRef } from "react";
import { VOLUME_COLORS } from "@/lib/constants";
import Header from "./Header";
import MethodologyModal, { MethodSection, MethodNote, MethodLink } from "./MethodologyModal";
import timelineData from "../../data/timeline.json";

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

type Era = { label: string; startYear: number; endYear: number; color: string };
type EventCategory = { id: string; label: string; color: string; icon: string };
type TimelineBook = { name: string; volumeAbbrev: string; startYear: number; endYear: number; era: string };
type TimelineEvent = { year: number; label: string; volumes: string[]; category: string; description: string };

const PERIODS = [
  { id: "all", label: "All Time", start: -4000, end: 1850 },
  { id: "ot-early", label: "Patriarchs & Exodus", start: -4000, end: -1000 },
  { id: "ot-late", label: "Kingdoms & Exile", start: -1050, end: -400 },
  { id: "nt", label: "New Testament", start: -10, end: 100 },
  { id: "bom", label: "Book of Mormon", start: -2300, end: 425 },
  { id: "restoration", label: "Restoration", start: 1815, end: 1850 },
];

const EVENT_CATEGORIES = timelineData.eventCategories as EventCategory[];

const volumeOrder = ["OT", "NT", "BoM", "D&C", "PoGP"];
const volumeNames: Record<string, string> = {
  OT: "Old Testament",
  NT: "New Testament",
  BoM: "Book of Mormon",
  "D&C": "D&C",
  PoGP: "Pearl of Great Price",
};

export default function TimelineTool() {
  const isMobile = useIsMobile();
  const [activePeriod, setActivePeriod] = useState("all");
  const [activeVolumes, setActiveVolumes] = useState<Set<string>>(
    new Set(["OT", "NT", "BoM", "D&C", "PoGP"])
  );
  const [activeCategories, setActiveCategories] = useState<Set<string>>(
    new Set(EVENT_CATEGORIES.map((c) => c.id))
  );
  const [hoveredBook, setHoveredBook] = useState<string | null>(null);
  const [showMethodology, setShowMethodology] = useState(false);
  const [viewMode, setViewMode] = useState<"events" | "books">("events");
  const [expandedEvent, setExpandedEvent] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const period = PERIODS.find((p) => p.id === activePeriod) || PERIODS[0];

  const events = (timelineData.events as TimelineEvent[]).filter(
    (e) =>
      e.year >= period.start &&
      e.year <= period.end &&
      e.volumes.some((v) => activeVolumes.has(v)) &&
      activeCategories.has(e.category)
  );

  const books = (timelineData.books as TimelineBook[]).filter(
    (b) => activeVolumes.has(b.volumeAbbrev) && b.endYear >= period.start && b.startYear <= period.end
  );

  const eras = (timelineData.eras as Era[]).filter(
    (e) => e.endYear >= period.start && e.startYear <= period.end
  );

  const range = period.end - period.start;
  const toPercent = (year: number) => ((year - period.start) / range) * 100;

  const volumeBooks = new Map<string, TimelineBook[]>();
  for (const abbrev of volumeOrder) {
    const vBooks = books.filter((b) => b.volumeAbbrev === abbrev);
    if (vBooks.length > 0) volumeBooks.set(abbrev, vBooks);
  }

  const toggleVolume = (abbrev: string) => {
    setActiveVolumes((prev) => {
      const next = new Set(prev);
      if (next.has(abbrev)) {
        if (next.size > 1) next.delete(abbrev);
      } else {
        next.add(abbrev);
      }
      return next;
    });
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

  const getCategoryInfo = (catId: string) => EVENT_CATEGORIES.find((c) => c.id === catId);

  const fmtYear = (y: number) => (y < 0 ? `${Math.abs(y)} BC` : y === 0 ? "1 BC" : `${y} AD`);

  // Group events by era for the vertical timeline
  const getEraForYear = (year: number): Era | undefined => {
    return eras.find((e) => year >= e.startYear && year <= e.endYear);
  };

  return (
    <div className="page-container">
      <Header />

      <h1 style={{ fontSize: isMobile ? "1.3rem" : "1.6rem", fontWeight: 700, color: "var(--text)", marginBottom: "8px" }}>
        Scripture Timeline
      </h1>
      <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "8px", lineHeight: 1.5, maxWidth: "640px" }}>
        Explore key events and the historical span of scripture books across all five volumes.
      </p>
      <div style={{ marginBottom: "20px" }}>
        <MethodLink onClick={() => setShowMethodology(true)} />
      </div>

      {/* Controls panel */}
      <div className="search-panel" style={{ marginBottom: "24px" }}>
        {/* View mode toggle */}
        <div style={{ display: "flex", gap: "4px", marginBottom: "16px" }}>
          {(["events", "books"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              style={{
                padding: "6px 18px",
                borderRadius: "8px",
                border: "none",
                background: viewMode === mode ? "rgba(139,92,246,0.2)" : "rgba(255,255,255,0.04)",
                color: viewMode === mode ? "#8b5cf6" : "var(--text-muted)",
                fontSize: "0.82rem",
                fontWeight: viewMode === mode ? 600 : 400,
                fontFamily: "inherit",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {mode === "events" ? "Events" : "Book Spans"}
            </button>
          ))}
        </div>

        {/* Period filters */}
        <div style={{ marginBottom: "12px" }}>
          <div style={{ fontSize: "0.65rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: "6px" }}>
            Time Period
          </div>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {PERIODS.map((p) => (
              <button
                key={p.id}
                onClick={() => setActivePeriod(p.id)}
                style={{
                  padding: "5px 14px",
                  borderRadius: "20px",
                  border: `1px solid ${activePeriod === p.id ? "var(--accent)" : "var(--border)"}`,
                  background: activePeriod === p.id ? "rgba(59,130,246,0.15)" : "transparent",
                  color: activePeriod === p.id ? "var(--accent)" : "var(--text-muted)",
                  fontSize: "0.75rem",
                  fontWeight: activePeriod === p.id ? 600 : 400,
                  fontFamily: "inherit",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Volume toggles */}
        <div style={{ marginBottom: viewMode === "events" ? "12px" : "0" }}>
          <div style={{ fontSize: "0.65rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: "6px" }}>
            Volumes
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {volumeOrder.map((abbrev) => {
              const color = VOLUME_COLORS[abbrev] || "#888";
              const active = activeVolumes.has(abbrev);
              return (
                <label
                  key={abbrev}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    cursor: "pointer",
                    fontSize: "0.78rem",
                    color: active ? color : "var(--text-muted)",
                    fontWeight: active ? 600 : 400,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={() => toggleVolume(abbrev)}
                    style={{ accentColor: color, width: "14px", height: "14px" }}
                  />
                  {isMobile ? abbrev : volumeNames[abbrev]}
                </label>
              );
            })}
          </div>
        </div>

        {/* Event category filters — only in events view */}
        {viewMode === "events" && (
          <div>
            <div style={{ fontSize: "0.65rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: "6px" }}>
              Event Categories
            </div>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {EVENT_CATEGORIES.map((cat) => {
                const active = activeCategories.has(cat.id);
                return (
                  <button
                    key={cat.id}
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
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <span style={{ fontSize: "0.7rem" }}>{cat.icon}</span>
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* EVENT TIMELINE VIEW */}
      {viewMode === "events" && (
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", padding: isMobile ? "16px" : "24px" }}>
          <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "16px" }}>
            {events.length} event{events.length !== 1 ? "s" : ""} in this period
          </div>

          {events.length === 0 && (
            <div style={{ padding: "32px", textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem" }}>
              No events match the current filters. Try adjusting the time period, volumes, or categories.
            </div>
          )}

          {/* Vertical timeline */}
          <div style={{ position: "relative", paddingLeft: isMobile ? "20px" : "32px" }}>
            {/* Vertical line */}
            <div
              style={{
                position: "absolute",
                left: isMobile ? "6px" : "10px",
                top: 0,
                bottom: 0,
                width: "2px",
                background: "rgba(255,255,255,0.08)",
              }}
            />

            {events.map((evt, i) => {
              const cat = getCategoryInfo(evt.category);
              const catColor = cat?.color || "#888";
              const isExpanded = expandedEvent === i;
              const prevEvt = events[i - 1];
              const showYearBreak = !prevEvt || Math.abs(evt.year - prevEvt.year) > (range > 1000 ? 200 : range > 100 ? 20 : 5);
              const era = getEraForYear(evt.year);

              return (
                <div key={i}>
                  {/* Year break marker */}
                  {showYearBreak && (
                    <div
                      style={{
                        position: "relative",
                        marginBottom: "4px",
                        marginTop: i > 0 ? "8px" : 0,
                        paddingLeft: isMobile ? "20px" : "28px",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "0.68rem",
                          fontWeight: 700,
                          color: era?.color || "var(--text-muted)",
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                        }}
                      >
                        {fmtYear(evt.year)}
                        {era && (
                          <span style={{ fontWeight: 400, opacity: 0.6, marginLeft: "8px", textTransform: "none", letterSpacing: "normal" }}>
                            {era.label}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Event item */}
                  <div
                    onClick={() => setExpandedEvent(isExpanded ? null : i)}
                    style={{
                      position: "relative",
                      paddingLeft: isMobile ? "20px" : "28px",
                      paddingBottom: "12px",
                      cursor: "pointer",
                    }}
                  >
                    {/* Dot on the line */}
                    <div
                      style={{
                        position: "absolute",
                        left: isMobile ? "1px" : "5px",
                        top: "5px",
                        width: "12px",
                        height: "12px",
                        borderRadius: "50%",
                        background: catColor,
                        border: "2px solid var(--surface)",
                        boxShadow: isExpanded ? `0 0 8px ${catColor}60` : "none",
                        transition: "all 0.2s",
                        zIndex: 1,
                      }}
                    />

                    {/* Event content */}
                    <div
                      style={{
                        padding: "8px 14px",
                        borderRadius: "8px",
                        border: `1px solid ${isExpanded ? `${catColor}40` : "transparent"}`,
                        background: isExpanded ? `${catColor}08` : "transparent",
                        transition: "all 0.2s",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                        {/* Event label */}
                        <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text)" }}>
                          {evt.label}
                        </span>

                        {/* Category pill */}
                        <span
                          style={{
                            padding: "1px 8px",
                            borderRadius: "10px",
                            background: `${catColor}18`,
                            color: catColor,
                            fontSize: "0.62rem",
                            fontWeight: 600,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {cat?.icon} {cat?.label}
                        </span>

                        {/* Volume indicators */}
                        <div style={{ display: "flex", gap: "3px", marginLeft: "auto" }}>
                          {evt.volumes.map((v) => (
                            <span
                              key={v}
                              style={{
                                fontSize: "0.6rem",
                                fontWeight: 700,
                                color: VOLUME_COLORS[v] || "#888",
                                padding: "1px 5px",
                                borderRadius: "4px",
                                background: `${VOLUME_COLORS[v] || "#888"}15`,
                              }}
                            >
                              {v}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Year (if not shown in break) */}
                      {!showYearBreak && (
                        <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "2px" }}>
                          {fmtYear(evt.year)}
                        </div>
                      )}

                      {/* Expanded description */}
                      {isExpanded && (
                        <div
                          style={{
                            marginTop: "8px",
                            fontSize: "0.82rem",
                            color: "var(--text-secondary)",
                            lineHeight: 1.6,
                            paddingTop: "8px",
                            borderTop: "1px solid rgba(255,255,255,0.06)",
                          }}
                        >
                          {evt.description}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* BOOK SPANS VIEW */}
      {viewMode === "books" && (
        <div
          ref={scrollRef}
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "12px",
            padding: isMobile ? "16px" : "24px",
            overflowX: "auto",
            position: "relative",
          }}
        >
          {/* Era bands */}
          <div style={{ position: "relative", height: "32px", marginBottom: "8px", minWidth: isMobile ? "600px" : "auto" }}>
            {eras.map((era, i) => {
              const left = Math.max(toPercent(era.startYear), 0);
              const right = Math.min(toPercent(era.endYear), 100);
              const width = right - left;
              if (width <= 0) return null;
              return (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    left: `${left}%`,
                    width: `${width}%`,
                    top: 0,
                    height: "100%",
                    background: `${era.color}15`,
                    borderRadius: "4px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                  }}
                >
                  {width > 8 && (
                    <span style={{ fontSize: "0.62rem", color: era.color, fontWeight: 600, whiteSpace: "nowrap", opacity: 0.8 }}>
                      {era.label}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Axis line */}
          <div style={{ position: "relative", height: "24px", borderBottom: "2px solid rgba(255,255,255,0.15)", marginBottom: "16px", minWidth: isMobile ? "600px" : "auto" }}>
            {(() => {
              const ticks: number[] = [];
              const step = range > 3000 ? 500 : range > 1000 ? 200 : range > 200 ? 50 : 10;
              const start = Math.ceil(period.start / step) * step;
              for (let y = start; y <= period.end; y += step) {
                ticks.push(y);
              }
              return ticks.map((y) => (
                <div
                  key={y}
                  style={{
                    position: "absolute",
                    left: `${toPercent(y)}%`,
                    bottom: "-2px",
                    transform: "translateX(-50%)",
                  }}
                >
                  <div style={{ width: "1px", height: "8px", background: "rgba(255,255,255,0.25)" }} />
                  <div style={{ fontSize: "0.6rem", color: "var(--text-muted)", marginTop: "2px", whiteSpace: "nowrap", transform: "translateX(-50%)", position: "absolute", left: "50%" }}>
                    {fmtYear(y)}
                  </div>
                </div>
              ));
            })()}
          </div>

          {/* Swim lanes by volume */}
          <div style={{ marginTop: "28px", minWidth: isMobile ? "600px" : "auto" }}>
            {Array.from(volumeBooks.entries()).map(([abbrev, vBooks]) => {
              const color = VOLUME_COLORS[abbrev] || "#888";
              return (
                <div key={abbrev} style={{ marginBottom: "16px" }}>
                  <div style={{ fontSize: "0.68rem", fontWeight: 600, color, marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    {isMobile ? abbrev : volumeNames[abbrev]}
                  </div>
                  <div style={{ position: "relative", height: "26px" }}>
                    {vBooks.map((book) => {
                      const left = Math.max(toPercent(book.startYear), 0);
                      const right = Math.min(toPercent(book.endYear), 100);
                      let width = right - left;
                      if (width < 0.5) width = 0.5;
                      const isHovered = hoveredBook === book.name;
                      return (
                        <div
                          key={book.name}
                          onMouseEnter={() => setHoveredBook(book.name)}
                          onMouseLeave={() => setHoveredBook(null)}
                          title={`${book.name} (${fmtYear(book.startYear)} – ${fmtYear(book.endYear)})`}
                          style={{
                            position: "absolute",
                            left: `${left}%`,
                            width: `${width}%`,
                            top: "2px",
                            height: "22px",
                            background: isHovered ? color : `${color}80`,
                            borderRadius: "4px",
                            cursor: "pointer",
                            transition: "all 0.15s",
                            display: "flex",
                            alignItems: "center",
                            paddingLeft: "4px",
                            overflow: "hidden",
                            zIndex: isHovered ? 10 : 1,
                            boxShadow: isHovered ? `0 2px 8px ${color}40` : "none",
                          }}
                          onClick={() => {
                            window.location.href = `/read?book=${encodeURIComponent(book.name)}`;
                          }}
                        >
                          {width > 3 && (
                            <span
                              style={{
                                fontSize: "0.58rem",
                                fontWeight: 600,
                                color: "#fff",
                                whiteSpace: "nowrap",
                                textShadow: "0 1px 2px rgba(0,0,0,0.4)",
                              }}
                            >
                              {book.name}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Methodology modal */}
      <MethodologyModal
        title="About the Scripture Timeline"
        isOpen={showMethodology}
        onClose={() => setShowMethodology(false)}
        isMobile={isMobile}
      >
        <MethodSection title="Overview">
          <p style={{ margin: "0 0 8px" }}>
            This timeline visualizes the <strong style={{ color: "var(--text)" }}>historical periods</strong> covered
            by each book of scripture and key events across all five volumes. It provides a bird&rsquo;s-eye
            view of when scriptural narratives took place and how they overlap in history.
          </p>
        </MethodSection>

        <MethodSection title="Event Categories">
          <p style={{ margin: "0 0 8px" }}>
            Events are organized into <strong style={{ color: "var(--text)" }}>{EVENT_CATEGORIES.length} categories</strong>:
            covenants and revelations, prophets and leaders, temples and sacred sites, wars and conflicts,
            migrations and journeys, miracles and signs, political and cultural events, and Restoration events.
            Use the category toggles to focus on specific types of events.
          </p>
        </MethodSection>

        <MethodSection title="Book Spans">
          <p style={{ margin: "0 0 8px" }}>
            The Book Spans view shows the <strong style={{ color: "var(--text)" }}>approximate historical period</strong> each
            book covers — not when it was written. These ranges are based on commonly accepted biblical and
            LDS chronologies and are approximate, especially for earlier periods.
          </p>
        </MethodSection>

        <MethodSection title="Navigation">
          <p style={{ margin: "0" }}>
            Use <strong style={{ color: "var(--text)" }}>time period filters</strong> to zoom into specific eras.
            Toggle volumes on/off to focus on specific scripture traditions. In the Events view, click any event
            to see its description. In the Book Spans view, hover over bars to see date ranges and click to
            open in the reader.
          </p>
        </MethodSection>

        <MethodNote>
          <strong style={{ color: "var(--text)" }}>Note on dates:</strong> Biblical chronology, especially
          for the Old Testament, is subject to significant scholarly debate. The dates shown here follow
          traditional LDS and conservative biblical chronologies for consistency across all five volumes.
          Some dates (particularly before ~1000 BC) may vary by hundreds of years depending on the
          chronological framework used. The timeline is designed for orientation and comparative study,
          not as a definitive chronological reference.
        </MethodNote>
      </MethodologyModal>
    </div>
  );
}
