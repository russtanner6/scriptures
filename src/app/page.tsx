"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import { VOLUME_COLORS } from "@/lib/constants";
import VolumeTooltip from "@/components/VolumeTooltip";
import { usePreferencesContext } from "@/components/PreferencesProvider";
import { useIsMobile } from "@/lib/useIsMobile";
import { bookNameToSlug, VOLUME_ABBREV_TO_SLUG } from "@/lib/scripture-slugs";
import { useScrollReveal } from "@/lib/useScrollReveal";
import type { ScriptureCharacter, ContextNugget, BookStat, Volume } from "@/lib/types";
import { analytics } from "@/lib/analytics";

const VOLUME_ORDER = ["OT", "NT", "BoM", "D&C", "PoGP"];

const VOLUME_FULL_NAMES: Record<string, string> = {
  OT: "Old Testament",
  NT: "New Testament",
  BoM: "Book of Mormon",
  "D&C": "D&C",
  PoGP: "Pearl of Great Price",
};

const BOOK_TO_VOLUME: Record<string, string> = {};
["Genesis","Exodus","Leviticus","Numbers","Deuteronomy","Joshua","Judges","Ruth","1 Samuel","2 Samuel","1 Kings","2 Kings","1 Chronicles","2 Chronicles","Ezra","Nehemiah","Esther","Job","Psalms","Proverbs","Ecclesiastes","Song of Solomon","Isaiah","Jeremiah","Lamentations","Ezekiel","Daniel","Hosea","Joel","Amos","Obadiah","Jonah","Micah","Nahum","Habakkuk","Zephaniah","Haggai","Zechariah","Malachi"].forEach(b => BOOK_TO_VOLUME[b] = "OT");
["Matthew","Mark","Luke","John","Acts","Romans","1 Corinthians","2 Corinthians","Galatians","Ephesians","Philippians","Colossians","1 Thessalonians","2 Thessalonians","1 Timothy","2 Timothy","Titus","Philemon","Hebrews","James","1 Peter","2 Peter","1 John","2 John","3 John","Jude","Revelation"].forEach(b => BOOK_TO_VOLUME[b] = "NT");
["1 Nephi","2 Nephi","Jacob","Enos","Jarom","Omni","Words of Mormon","Mosiah","Alma","Helaman","3 Nephi","4 Nephi","Mormon","Ether","Moroni"].forEach(b => BOOK_TO_VOLUME[b] = "BoM");
BOOK_TO_VOLUME["Doctrine and Covenants"] = "D&C";
["Moses","Abraham","Joseph Smith—Matthew","Joseph Smith—History","Articles of Faith"].forEach(b => BOOK_TO_VOLUME[b] = "PoGP");

const PRIMARY_TOOLS = [
  { href: "/word-explorer", svgIcon: "/search.svg", name: "Word Explorer", description: "Frequency analysis with 3-level drill-down across all volumes.", accent: "#3B82F6" },
  { href: "/people", svgIcon: "/people.svg", name: "People", description: "857 named individuals with bios, family trees, and portraits.", accent: "#A78BFA" },
  { href: "/locations", svgIcon: "/locations.svg", name: "Places", description: "333 scripture locations with maps and mentions.", accent: "#10B981" },
];

const SECONDARY_TOOLS = [
  { href: "/wordcloud", name: "Word Cloud", icon: "/word-cloud.svg" },
  { href: "/sentiment", name: "Sentiment", icon: "/narrative-arc.svg" },
  { href: "/chiasmus", name: "Chiasmus", icon: "/heatmap.svg" },
  { href: "/topics", name: "Topics", icon: "/search.svg" },
  { href: "/bookmarks", name: "Bookmarks", icon: "/favorite.svg" },
];

// --- Animated counter hook ---
function useCounter(target: number, duration = 1500, active = true) {
  const [value, setValue] = useState(0);
  const ref = useRef<number>(0);
  useEffect(() => {
    if (!active || target === 0) return;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(eased * target);
      setValue(current);
      if (progress < 1) ref.current = requestAnimationFrame(tick);
    };
    ref.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(ref.current);
  }, [target, duration, active]);
  return value;
}

// --- Canvas Gauge Dial ---
function GaugeDial({ value, max, label, color, size = 120 }: { value: number; max: number; label: string; color: string; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animatedVal = useCounter(value);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, size, size * 0.7);
    const cx = size / 2, cy = size * 0.6, R = size * 0.4;
    ctx.beginPath();
    ctx.arc(cx, cy, R, Math.PI, 2 * Math.PI);
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = size * 0.07;
    ctx.lineCap = "round";
    ctx.stroke();
    const pct = max > 0 ? Math.min(animatedVal / max, 1) : 0;
    ctx.beginPath();
    ctx.arc(cx, cy, R, Math.PI, Math.PI + Math.PI * pct);
    ctx.strokeStyle = color;
    ctx.lineWidth = size * 0.07;
    ctx.lineCap = "round";
    ctx.stroke();
  }, [animatedVal, max, color, size]);

  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ position: "relative", width: size, height: size * 0.55 }}>
        <canvas ref={canvasRef} width={size} height={size * 0.7} style={{ width: size, height: size * 0.7 }} />
        <div style={{ position: "absolute", bottom: "2px", left: "50%", transform: "translateX(-50%)", fontSize: size * 0.16, fontWeight: 700, color: "var(--text)" }}>
          {animatedVal.toLocaleString()}
        </div>
      </div>
      <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontWeight: 500, marginTop: "-4px" }}>{label}</div>
    </div>
  );
}

// --- Horizontal Bar ---
function StatBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const animatedVal = useCounter(value);
  const pct = max > 0 ? (animatedVal / max) * 100 : 0;
  return (
    <div style={{ marginBottom: "8px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
        <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)", fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: "0.7rem", color: "var(--text)", fontWeight: 700 }}>{animatedVal.toLocaleString()}</span>
      </div>
      <div style={{ height: "6px", borderRadius: "3px", background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
        <div style={{ height: "100%", borderRadius: "3px", background: `linear-gradient(90deg, ${color}, ${color}cc)`, width: `${Math.min(pct, 100)}%`, transition: "width 1.5s cubic-bezier(0.16, 1, 0.3, 1)" }} />
      </div>
    </div>
  );
}

// --- Particle Hero Background ---
function ParticleHero({ children }: { children: React.ReactNode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let W = canvas.width = canvas.offsetWidth;
    let H = canvas.height = canvas.offsetHeight;
    const particles: { x: number; y: number; vx: number; vy: number; r: number }[] = [];
    const N = 60;

    for (let i = 0; i < N; i++) {
      particles.push({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: 1 + Math.random() * 1.5,
      });
    }

    let animId: number;
    function draw() {
      ctx!.clearRect(0, 0, W, H);
      for (let i = 0; i < N; i++) {
        for (let j = i + 1; j < N; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 120) {
            ctx!.beginPath();
            ctx!.moveTo(particles[i].x, particles[i].y);
            ctx!.lineTo(particles[j].x, particles[j].y);
            ctx!.strokeStyle = `rgba(255,255,255,${(1 - d / 120) * 0.06})`;
            ctx!.lineWidth = 0.5;
            ctx!.stroke();
          }
        }
      }
      for (const p of particles) {
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx!.fillStyle = "rgba(255,255,255,0.08)";
        ctx!.fill();
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;
      }
      animId = requestAnimationFrame(draw);
    }
    draw();

    const handleResize = () => {
      W = canvas.width = canvas.offsetWidth;
      H = canvas.height = canvas.offsetHeight;
    };
    window.addEventListener("resize", handleResize);
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", handleResize); };
  }, []);

  return (
    <div style={{ position: "relative", overflow: "hidden" }}>
      <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} />
      <div style={{ position: "relative", zIndex: 1 }}>{children}</div>
    </div>
  );
}

// --- Volume Shelf Row ---
function VolumeRow({ abbrev, name, bookCount, chapterCount, wordCount, index }: { abbrev: string; name: string; bookCount: number; chapterCount: number; wordCount: number; index: number }) {
  const [mounted, setMounted] = useState(false);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 150 + index * 100);
    return () => clearTimeout(timer);
  }, [index]);

  const color = VOLUME_COLORS[abbrev] || "#888";
  const slug = VOLUME_ABBREV_TO_SLUG[abbrev];

  return (
    <Link
      href={`/scriptures/${slug}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        textDecoration: "none",
        padding: "14px 18px",
        borderRadius: "10px",
        background: hovered ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.015)",
        borderLeft: `4px solid ${color}`,
        transition: "all 0.35s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.5s ease",
        opacity: mounted ? 1 : 0,
        transform: mounted ? (hovered ? "translateX(4px)" : "translateX(0)") : "translateX(-20px)",
        boxShadow: hovered ? `inset 0 0 30px ${color}08, 0 2px 12px rgba(0,0,0,0.15)` : "none",
      }}
    >
      {/* Glow dot */}
      <div style={{
        width: "8px",
        height: "8px",
        borderRadius: "50%",
        background: color,
        marginRight: "14px",
        flexShrink: 0,
        boxShadow: hovered ? `0 0 12px ${color}80` : `0 0 4px ${color}40`,
        transition: "box-shadow 0.35s ease",
      }} />
      {/* Name */}
      <div style={{ flex: 1 }}>
        <div style={{
          fontSize: "0.95rem",
          fontWeight: 700,
          color: hovered ? "#fff" : "rgba(255,255,255,0.85)",
          transition: "color 0.3s",
          letterSpacing: "0.01em",
        }}>
          {name}
        </div>
      </div>
      {/* Stats */}
      <div style={{ display: "flex", gap: "16px", alignItems: "center", flexShrink: 0 }}>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text-secondary)" }}>{bookCount}</div>
          <div style={{ fontSize: "0.5rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>books</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text-secondary)" }}>{chapterCount}</div>
          <div style={{ fontSize: "0.5rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>chapters</div>
        </div>
        {wordCount > 0 && (
          <div style={{ textAlign: "right", minWidth: "50px" }}>
            <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text-secondary)" }}>{Math.round(wordCount / 1000)}k</div>
            <div style={{ fontSize: "0.5rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>words</div>
          </div>
        )}
      </div>
      {/* Arrow */}
      <div style={{
        marginLeft: "14px",
        fontSize: "0.8rem",
        color: hovered ? color : "rgba(255,255,255,0.2)",
        transition: "color 0.3s, transform 0.3s",
        transform: hovered ? "translateX(2px)" : "translateX(0)",
      }}>
        &rsaquo;
      </div>
    </Link>
  );
}

export default function HomePage() {
  const isMobile = useIsMobile();
  const { isVolumeVisible } = usePreferencesContext();
  const [featuredChars, setFeaturedChars] = useState<ScriptureCharacter[]>([]);
  const [spotlightChar, setSpotlightChar] = useState<ScriptureCharacter | null>(null);
  const [nugget, setNugget] = useState<ContextNugget | null>(null);
  const [bookStats, setBookStats] = useState<{ totalVerses: number; totalWords: number; totalChapters: number; totalBooks: number; longestBook: string; shortestBook: string; volumeWords: Record<string, number> }>({ totalVerses: 0, totalWords: 0, totalChapters: 0, totalBooks: 0, longestBook: "", shortestBook: "", volumeWords: {} });
  const [genderCounts, setGenderCounts] = useState<{ male: number; female: number }>({ male: 0, female: 0 });
  const [locationCount, setLocationCount] = useState(0);
  const [volumes, setVolumes] = useState<Volume[]>([]);

  const animatedTotalWords = useCounter(bookStats.totalWords);
  const animatedVerses = useCounter(bookStats.totalVerses);
  const animatedBooks = useCounter(bookStats.totalBooks);
  const animatedPeople = useCounter(genderCounts.male + genderCounts.female);
  const animatedLocations = useCounter(locationCount);

  const toolsReveal = useScrollReveal(0.1);
  const peopleReveal = useScrollReveal(0.1);
  const nuggetReveal = useScrollReveal(0.1);
  const statsReveal = useScrollReveal(0.1);

  // Fetch all data on mount
  useEffect(() => {
    fetch("/api/characters")
      .then((r) => r.json())
      .then((data) => {
        const chars: ScriptureCharacter[] = data.characters || [];
        const withPortraits = chars.filter((c) => c.portraitUrl).sort(() => Math.random() - 0.5);
        setSpotlightChar(withPortraits[0] || null);
        setFeaturedChars(withPortraits.slice(1, 21));
        setGenderCounts({
          male: chars.filter((c) => c.gender === "male").length,
          female: chars.filter((c) => c.gender === "female").length,
        });
      })
      .catch(() => {});

    fetch("/api/book-stats")
      .then((r) => r.json())
      .then((data) => {
        const bs: BookStat[] = data.stats || [];
        const realBooks = bs.filter((b) => b.volumeAbbrev !== "D&C");
        const sorted = [...realBooks].sort((a, b) => b.wordCount - a.wordCount);
        const volumeWords: Record<string, number> = {};
        bs.forEach((b) => { volumeWords[b.volumeAbbrev] = (volumeWords[b.volumeAbbrev] || 0) + b.wordCount; });
        setBookStats({
          totalVerses: bs.reduce((s, b) => s + b.verseCount, 0),
          totalWords: bs.reduce((s, b) => s + b.wordCount, 0),
          totalChapters: bs.reduce((s, b) => s + b.chapterCount, 0),
          totalBooks: bs.length,
          longestBook: sorted[0]?.bookName || "",
          shortestBook: sorted[sorted.length - 1]?.bookName || "",
          volumeWords,
        });
      })
      .catch(() => {});

    fetch("/api/locations")
      .then((r) => r.json())
      .then((data) => setLocationCount((data.locations || []).length))
      .catch(() => {});

    fetch("/api/random-nugget")
      .then((r) => r.json())
      .then((data) => { if (data.nugget) setNugget(data.nugget); })
      .catch(() => {});

    fetch("/api/books")
      .then((r) => r.json())
      .then((data) => { if (data.volumes) setVolumes(data.volumes); })
      .catch(() => {});
  }, []);

  const getCharColor = (c: ScriptureCharacter) => {
    for (const v of VOLUME_ORDER) {
      if (c.volumes.includes(v)) return VOLUME_COLORS[v] || "#8b5cf6";
    }
    return "#8b5cf6";
  };

  const nuggetVolume = nugget ? BOOK_TO_VOLUME[nugget.book] : null;
  const nuggetLink = nugget && nuggetVolume
    ? `/scriptures/${VOLUME_ABBREV_TO_SLUG[nuggetVolume]}/${bookNameToSlug(nugget.book)}/${nugget.chapter}?verse=${nugget.verse}`
    : null;

  const CATEGORY_COLORS: Record<string, string> = {
    Linguistic: "#3B82F6", Historical: "#F59E0B", Cultural: "#10B981", Literary: "#A78BFA", Restoration: "#F43F5E",
  };

  const volumeShelfData = VOLUME_ORDER
    .filter((abbrev) => isVolumeVisible(abbrev))
    .map((abbrev) => {
      const vol = volumes.find((v) => v.abbrev === abbrev);
      const bookCount = vol ? vol.books.length : 0;
      const chapterCount = vol ? vol.books.reduce((sum, b) => sum + b.chapterCount, 0) : 0;
      const wordCount = bookStats.volumeWords[abbrev] || 0;
      return { abbrev, name: VOLUME_FULL_NAMES[abbrev] || abbrev, bookCount, chapterCount, wordCount };
    });

  return (
    <>
      <Header />
      <div className="page-container page-darker">

        {/* ═══ 1. HERO with Particle Canvas ═══ */}
        <ParticleHero>
          <div style={{ textAlign: "center", padding: isMobile ? "36px 0 32px" : "64px 0 48px" }}>
            <div style={{
              fontSize: "0.6rem",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.2em",
              color: "rgba(255,255,255,0.35)",
              marginBottom: "12px",
            }}>
              Explore the Standard Works
            </div>
            <h1 style={{
              fontSize: isMobile ? "1.5rem" : "2.2rem",
              fontWeight: 800,
              letterSpacing: "0.06em",
              marginBottom: "12px",
              textTransform: "uppercase",
              background: "linear-gradient(90deg, #DC2F4B, #E8532C, #F57B20, #F5A623, #F5C829)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              lineHeight: 1.2,
            }}>
              LDS Scripture Explorer
            </h1>
            <p style={{
              fontSize: isMobile ? "0.85rem" : "0.95rem",
              color: "var(--text-secondary)",
              margin: "0 auto 32px",
              lineHeight: 1.6,
              maxWidth: "460px",
            }}>
              Search, analyze, and read across all five volumes of scripture.
            </p>

            {/* Counters inside hero */}
            <div style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: isMobile ? "0" : "0",
              maxWidth: "700px",
              margin: "0 auto",
            }}>
              {[
                { value: animatedVerses, label: "Verses", fallback: "41,995" },
                { value: animatedTotalWords, label: "Words", fallback: "820,000" },
                { value: animatedBooks, label: "Books", fallback: "87" },
                { value: animatedPeople, label: "People", fallback: "857" },
                { value: animatedLocations, label: "Places", fallback: "333" },
              ].map((item, i, arr) => (
                <div key={item.label} style={{
                  display: "flex",
                  alignItems: "center",
                  ...(isMobile ? { width: i < 3 ? "33.33%" : "50%", justifyContent: "center", marginBottom: "8px" } : {}),
                }}>
                  <div style={{ textAlign: "center", padding: isMobile ? "0 4px" : "0 16px" }}>
                    <div style={{
                      fontSize: isMobile ? "1.5rem" : "2rem",
                      fontWeight: 800,
                      color: "var(--text)",
                      letterSpacing: "-0.02em",
                      lineHeight: 1.1,
                    }}>
                      {item.value > 0 ? item.value.toLocaleString() : item.fallback}
                    </div>
                    <div style={{
                      fontSize: "0.55rem",
                      color: "var(--text-muted)",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.12em",
                      marginTop: "4px",
                    }}>
                      {item.label}
                    </div>
                  </div>
                  {!isMobile && i < arr.length - 1 && (
                    <span style={{ fontSize: "1.2rem", color: "rgba(255,255,255,0.1)", fontWeight: 300 }}>&middot;</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </ParticleHero>

        {/* ═══ 2. VOLUME SHELF ═══ */}
        <div style={{ marginTop: "16px", marginBottom: "48px" }}>
          <div style={{
            fontSize: "0.55rem",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.16em",
            color: "rgba(255,255,255,0.3)",
            marginBottom: "14px",
            paddingLeft: "4px",
          }}>
            Volumes
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {volumeShelfData.map((v, i) => (
              <VolumeRow
                key={v.abbrev}
                abbrev={v.abbrev}
                name={v.name}
                bookCount={v.bookCount}
                chapterCount={v.chapterCount}
                wordCount={v.wordCount}
                index={i}
              />
            ))}
          </div>
        </div>

        {/* ═══ 3. PRIMARY TOOLS ═══ */}
        <div
          ref={toolsReveal.ref}
          style={{
            marginBottom: "48px",
            opacity: toolsReveal.isVisible ? 1 : 0,
            transform: toolsReveal.isVisible ? "translateY(0)" : "translateY(20px)",
            transition: "opacity 0.6s ease, transform 0.6s ease",
          }}
        >
          <div style={{
            fontSize: "0.55rem",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.16em",
            color: "rgba(255,255,255,0.3)",
            marginBottom: "14px",
            paddingLeft: "4px",
          }}>
            Explore
          </div>
          <div style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
            gap: "12px",
            marginBottom: "20px",
          }}>
            {PRIMARY_TOOLS.map((tool) => (
              <Link
                key={tool.href}
                href={tool.href}
                onClick={() => analytics.homeToolCardClick(tool.name)}
                style={{
                  display: "block",
                  textDecoration: "none",
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: "12px",
                  padding: isMobile ? "18px" : "22px",
                  transition: "all 0.3s ease",
                  position: "relative",
                  overflow: "hidden",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                  e.currentTarget.style.borderColor = `${tool.accent}40`;
                  e.currentTarget.style.transform = "translateY(-3px)";
                  e.currentTarget.style.boxShadow = `0 8px 30px rgba(0,0,0,0.3), inset 0 0 40px ${tool.accent}06`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.02)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "10px" }}>
                  <div style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "10px",
                    background: `${tool.accent}18`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    <img src={tool.svgIcon} alt="" style={{ width: "17px", height: "17px", filter: "invert(1) brightness(0.9)" }} />
                  </div>
                  <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text)", letterSpacing: "0.01em" }}>{tool.name}</div>
                </div>
                <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", lineHeight: 1.55 }}>{tool.description}</div>
              </Link>
            ))}
          </div>

          {/* Secondary tools with icons */}
          <div style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "8px",
            justifyContent: "center",
          }}>
            {SECONDARY_TOOLS.map((tool) => (
              <Link
                key={tool.href}
                href={tool.href}
                onClick={() => analytics.homeToolCardClick(tool.name)}
                style={{
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "0.72rem",
                  fontWeight: 600,
                  color: "var(--text-muted)",
                  padding: "6px 14px",
                  borderRadius: "20px",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.05)",
                  transition: "all 0.25s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "var(--text)";
                  e.currentTarget.style.background = "rgba(255,255,255,0.07)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "var(--text-muted)";
                  e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)";
                }}
              >
                <img src={tool.icon} alt="" style={{ width: "12px", height: "12px", filter: "invert(1) brightness(0.5)" }} />
                {tool.name}
              </Link>
            ))}
          </div>
        </div>

        {/* ═══ 4. PEOPLE SHOWCASE ═══ */}
        {spotlightChar && (
          <div
            ref={peopleReveal.ref}
            style={{
              marginBottom: "48px",
              padding: isMobile ? "24px 18px" : "32px 28px",
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.05)",
              borderRadius: "16px",
              opacity: peopleReveal.isVisible ? 1 : 0,
              transform: peopleReveal.isVisible ? "translateY(0)" : "translateY(20px)",
              transition: "opacity 0.6s ease, transform 0.6s ease",
            }}
          >
            <div style={{
              fontSize: "0.55rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.16em",
              color: "rgba(255,255,255,0.3)",
              marginBottom: "20px",
            }}>
              Scripture People
            </div>

            <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "center" : "flex-start", gap: isMobile ? "20px" : "28px" }}>
              {/* Spotlight portrait */}
              <Link href={`/people?person=${spotlightChar.id}`} onClick={() => analytics.homeSpotlightClick(spotlightChar.id)} style={{ textDecoration: "none", flexShrink: 0 }}>
                <div style={{
                  width: isMobile ? "140px" : "160px",
                  height: isMobile ? "140px" : "160px",
                  borderRadius: "50%",
                  overflow: "hidden",
                  border: `3px solid ${getCharColor(spotlightChar)}50`,
                  boxShadow: `0 0 40px ${getCharColor(spotlightChar)}15`,
                  transition: "transform 0.3s, box-shadow 0.3s",
                }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.05)"; e.currentTarget.style.boxShadow = `0 0 50px ${getCharColor(spotlightChar)}25`; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = `0 0 40px ${getCharColor(spotlightChar)}15`; }}
                >
                  <img src={spotlightChar.portraitUrl} alt={spotlightChar.name} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 20%" }} />
                </div>
              </Link>

              {/* Info */}
              <div style={{ flex: 1, textAlign: isMobile ? "center" : "left" }}>
                <div style={{
                  fontSize: "0.55rem",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.14em",
                  color: getCharColor(spotlightChar),
                  marginBottom: "4px",
                }}>Featured</div>
                <Link href={`/people?person=${spotlightChar.id}`} style={{ textDecoration: "none" }}>
                  <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--text)", marginBottom: "4px" }}>{spotlightChar.name}</div>
                </Link>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "6px" }}>
                  {spotlightChar.roles.slice(0, 3).join(" · ")}
                </div>
                {spotlightChar.bio && (
                  <p style={{
                    fontSize: "0.78rem",
                    color: "var(--text-secondary)",
                    lineHeight: 1.55,
                    margin: "0 0 14px",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}>
                    {spotlightChar.bio}
                  </p>
                )}

                {/* Portrait grid */}
                <div style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "6px",
                  justifyContent: isMobile ? "center" : "flex-start",
                  marginBottom: "12px",
                }}>
                  {featuredChars.slice(0, isMobile ? 12 : 16).map((c) => (
                    <Link key={c.id} href={`/people?person=${c.id}`} style={{ textDecoration: "none" }}>
                      <div style={{
                        width: "40px",
                        height: "40px",
                        borderRadius: "50%",
                        overflow: "hidden",
                        border: `2px solid ${getCharColor(c)}30`,
                        transition: "all 0.25s ease",
                      }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = "scale(1.18)";
                          e.currentTarget.style.borderColor = `${getCharColor(c)}80`;
                          e.currentTarget.style.boxShadow = `0 0 16px ${getCharColor(c)}25`;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = "scale(1)";
                          e.currentTarget.style.borderColor = `${getCharColor(c)}30`;
                          e.currentTarget.style.boxShadow = "none";
                        }}
                      >
                        <img src={c.portraitUrl} alt={c.name} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 20%" }} loading="lazy" />
                      </div>
                    </Link>
                  ))}
                </div>

                <Link
                  href="/people"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    color: "#A78BFA",
                    textDecoration: "none",
                    transition: "color 0.2s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "#c4b5fd"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = "#A78BFA"; }}
                >
                  Explore {genderCounts.male + genderCounts.female} people &rarr;
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ═══ 5. CONTEXT NUGGET ═══ */}
        {nugget && nuggetLink && (
          <div
            ref={nuggetReveal.ref}
            style={{
              marginBottom: "48px",
              opacity: nuggetReveal.isVisible ? 1 : 0,
              transform: nuggetReveal.isVisible ? "translateY(0)" : "translateY(20px)",
              transition: "opacity 0.6s ease, transform 0.6s ease",
            }}
          >
            <Link href={nuggetLink} style={{ textDecoration: "none", display: "block" }}>
              <div
                style={{
                  padding: isMobile ? "20px 18px" : "24px 28px",
                  borderRadius: "14px",
                  background: "rgba(245,166,35,0.04)",
                  border: "1px solid rgba(245,166,35,0.12)",
                  transition: "all 0.3s ease",
                  position: "relative",
                  overflow: "hidden",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(245,166,35,0.07)";
                  e.currentTarget.style.borderColor = "rgba(245,166,35,0.2)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(245,166,35,0.04)";
                  e.currentTarget.style.borderColor = "rgba(245,166,35,0.12)";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                {/* Amber accent line */}
                <div style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: "2px",
                  background: "linear-gradient(90deg, transparent, #F5A623, transparent)",
                  opacity: 0.5,
                }} />

                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                  <span style={{
                    fontSize: "0.55rem",
                    fontWeight: 700,
                    padding: "3px 10px",
                    borderRadius: "4px",
                    background: `${CATEGORY_COLORS[nugget.category] || "#F5A623"}18`,
                    color: CATEGORY_COLORS[nugget.category] || "#F5A623",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}>
                    {nugget.category}
                  </span>
                  <span style={{ fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#F5A623" }}>
                    Did you know?
                  </span>
                </div>
                <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text)", marginBottom: "8px" }}>{nugget.title}</div>
                <p style={{
                  fontSize: "0.8rem",
                  color: "var(--text-secondary)",
                  lineHeight: 1.6,
                  margin: "0 0 12px",
                  display: "-webkit-box",
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}>
                  {nugget.insight}
                </p>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>{nugget.book} {nugget.chapter}:{nugget.verse}</span>
                  <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#F5A623" }}>Read in context &rarr;</span>
                </div>
              </div>
            </Link>
          </div>
        )}

        {/* ═══ 6. SCRIPTURE STATS ═══ */}
        {bookStats.totalVerses > 0 && (
          <div
            ref={statsReveal.ref}
            style={{
              marginBottom: "56px",
              padding: isMobile ? "24px 18px" : "32px 28px",
              background: "rgba(255,255,255,0.015)",
              border: "1px solid rgba(255,255,255,0.04)",
              borderRadius: "16px",
              opacity: statsReveal.isVisible ? 1 : 0,
              transform: statsReveal.isVisible ? "translateY(0)" : "translateY(20px)",
              transition: "opacity 0.6s ease, transform 0.6s ease",
            }}
          >
            <div style={{
              fontSize: "0.55rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.16em",
              color: "rgba(255,255,255,0.3)",
              marginBottom: "24px",
            }}>
              By the Numbers
            </div>

            <div style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
              gap: isMobile ? "28px" : "36px",
            }}>
              {/* Gauge dials */}
              <div>
                <div style={{
                  display: "flex",
                  justifyContent: "space-around",
                  marginBottom: "20px",
                }}>
                  <GaugeDial value={bookStats.totalVerses} max={50000} label="Verses" color="#3B82F6" size={isMobile ? 100 : 120} />
                  <GaugeDial value={bookStats.totalChapters} max={2000} label="Chapters" color="#10B981" size={isMobile ? 100 : 120} />
                  <GaugeDial value={bookStats.totalBooks} max={100} label="Books" color="#A78BFA" size={isMobile ? 100 : 120} />
                </div>
                {/* Fun facts */}
                <div style={{
                  display: "flex",
                  justifyContent: "space-around",
                  padding: "14px 0",
                  borderTop: "1px solid rgba(255,255,255,0.04)",
                }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "0.85rem", fontWeight: 800, color: "#10B981" }}>{bookStats.longestBook}</div>
                    <div style={{ fontSize: "0.52rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Longest Book</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "0.85rem", fontWeight: 800, color: "#F59E0B" }}>{bookStats.shortestBook}</div>
                    <div style={{ fontSize: "0.52rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Shortest Book</div>
                  </div>
                </div>
              </div>

              {/* Volume word bars */}
              <div>
                <div style={{
                  fontSize: "0.6rem",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: "var(--text-muted)",
                  marginBottom: "14px",
                }}>
                  Words by Volume
                </div>
                {VOLUME_ORDER.filter(v => bookStats.volumeWords[v]).map((v) => (
                  <StatBar key={v} label={VOLUME_FULL_NAMES[v] || v} value={bookStats.volumeWords[v] || 0} max={Math.max(...Object.values(bookStats.volumeWords))} color={VOLUME_COLORS[v] || "#888"} />
                ))}
                <div style={{
                  textAlign: "center",
                  marginTop: "16px",
                  padding: "12px 0",
                  borderTop: "1px solid rgba(255,255,255,0.04)",
                }}>
                  <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--text)", letterSpacing: "-0.02em" }}>
                    {animatedTotalWords.toLocaleString()}
                  </div>
                  <div style={{ fontSize: "0.55rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>total words</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
