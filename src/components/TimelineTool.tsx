"use client";

import { useState, useEffect, useRef } from "react";
import { VOLUME_COLORS } from "@/lib/constants";
import Header from "./Header";
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
type TimelineBook = { name: string; volumeAbbrev: string; startYear: number; endYear: number; era: string };
type TimelineEvent = { year: number; label: string; volumes: string[] };

// Period ranges for filtering
const PERIODS = [
  { id: "all", label: "All Time", start: -4000, end: 1850 },
  { id: "ot-early", label: "Patriarchs & Exodus", start: -4000, end: -1000 },
  { id: "ot-late", label: "Kingdoms & Exile", start: -1050, end: -400 },
  { id: "nt", label: "New Testament", start: -10, end: 100 },
  { id: "bom", label: "Book of Mormon", start: -600, end: 425 },
  { id: "restoration", label: "Restoration", start: 1815, end: 1850 },
];

export default function TimelineTool() {
  const isMobile = useIsMobile();
  const [activePeriod, setActivePeriod] = useState("all");
  const [activeVolumes, setActiveVolumes] = useState<Set<string>>(
    new Set(["OT", "NT", "BoM", "D&C", "PoGP"])
  );
  const [hoveredBook, setHoveredBook] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const period = PERIODS.find((p) => p.id === activePeriod) || PERIODS[0];

  const books = (timelineData.books as TimelineBook[]).filter(
    (b) => activeVolumes.has(b.volumeAbbrev) && b.endYear >= period.start && b.startYear <= period.end
  );

  const events = (timelineData.events as TimelineEvent[]).filter(
    (e) => e.year >= period.start && e.year <= period.end && e.volumes.some((v) => activeVolumes.has(v))
  );

  const eras = (timelineData.eras as Era[]).filter(
    (e) => e.endYear >= period.start && e.startYear <= period.end
  );

  const range = period.end - period.start;
  const toPercent = (year: number) => ((year - period.start) / range) * 100;

  // Group books by volume for swim lanes
  const volumeOrder = ["OT", "NT", "BoM", "D&C", "PoGP"];
  const volumeBooks = new Map<string, TimelineBook[]>();
  for (const abbrev of volumeOrder) {
    const vBooks = books.filter((b) => b.volumeAbbrev === abbrev);
    if (vBooks.length > 0) volumeBooks.set(abbrev, vBooks);
  }

  const volumeNames: Record<string, string> = {
    OT: "Old Testament",
    NT: "New Testament",
    BoM: "Book of Mormon",
    "D&C": "D&C",
    PoGP: "Pearl of Great Price",
  };

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

  // Format year for display
  const fmtYear = (y: number) => (y < 0 ? `${Math.abs(y)} BC` : y === 0 ? "1 BC" : `${y} AD`);

  return (
    <div className="page-container">
      <Header />

      <h1 style={{ fontSize: isMobile ? "1.3rem" : "1.6rem", fontWeight: 700, color: "var(--text)", marginBottom: "8px" }}>
        Scripture Timeline
      </h1>
      <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "20px", lineHeight: 1.5, maxWidth: "640px" }}>
        See when scripture events happened and how the books overlap in history across all five volumes.
      </p>

      {/* Period selector */}
      <div style={{ display: "flex", gap: "6px", marginBottom: "12px", flexWrap: "wrap" }}>
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

      {/* Volume toggles */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap" }}>
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

      {/* Timeline visualization */}
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
        <div style={{ position: "relative", height: "32px", marginBottom: "8px" }}>
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
        <div style={{ position: "relative", height: "24px", borderBottom: "2px solid rgba(255,255,255,0.15)", marginBottom: "16px" }}>
          {/* Tick marks */}
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

          {/* Event markers */}
          {events.map((evt, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                left: `${toPercent(evt.year)}%`,
                top: "-4px",
                transform: "translateX(-50%)",
                zIndex: 2,
              }}
              title={`${evt.label} (${fmtYear(evt.year)})`}
            >
              <div
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: "#fff",
                  border: "2px solid var(--accent)",
                  cursor: "pointer",
                }}
              />
            </div>
          ))}
        </div>

        {/* Swim lanes by volume */}
        <div style={{ marginTop: "28px" }}>
          {Array.from(volumeBooks.entries()).map(([abbrev, vBooks]) => {
            const color = VOLUME_COLORS[abbrev] || "#888";
            return (
              <div key={abbrev} style={{ marginBottom: "16px" }}>
                <div style={{ fontSize: "0.68rem", fontWeight: 600, color, marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  {isMobile ? abbrev : volumeNames[abbrev]}
                </div>
                <div style={{ position: "relative", height: "26px" }}>
                  {vBooks.map((book, i) => {
                    const left = Math.max(toPercent(book.startYear), 0);
                    const right = Math.min(toPercent(book.endYear), 100);
                    let width = right - left;
                    if (width < 0.5) width = 0.5; // minimum visible width
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

        {/* Events legend */}
        {events.length > 0 && (
          <div style={{ marginTop: "24px", borderTop: "1px solid var(--border)", paddingTop: "16px" }}>
            <div style={{ fontSize: "0.65rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: "10px" }}>
              Key Events
            </div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)", gap: "6px" }}>
              {events.map((evt, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.78rem" }}>
                  <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--accent)", flexShrink: 0 }} />
                  <span style={{ color: "var(--text-muted)", fontWeight: 500, minWidth: "65px" }}>{fmtYear(evt.year)}</span>
                  <span style={{ color: "var(--text-secondary)" }}>{evt.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
