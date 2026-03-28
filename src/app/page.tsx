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

// Book -> volume mapping for nugget links
const BOOK_TO_VOLUME: Record<string, string> = {};
["Genesis","Exodus","Leviticus","Numbers","Deuteronomy","Joshua","Judges","Ruth","1 Samuel","2 Samuel","1 Kings","2 Kings","1 Chronicles","2 Chronicles","Ezra","Nehemiah","Esther","Job","Psalms","Proverbs","Ecclesiastes","Song of Solomon","Isaiah","Jeremiah","Lamentations","Ezekiel","Daniel","Hosea","Joel","Amos","Obadiah","Jonah","Micah","Nahum","Habakkuk","Zephaniah","Haggai","Zechariah","Malachi"].forEach(b => BOOK_TO_VOLUME[b] = "OT");
["Matthew","Mark","Luke","John","Acts","Romans","1 Corinthians","2 Corinthians","Galatians","Ephesians","Philippians","Colossians","1 Thessalonians","2 Thessalonians","1 Timothy","2 Timothy","Titus","Philemon","Hebrews","James","1 Peter","2 Peter","1 John","2 John","3 John","Jude","Revelation"].forEach(b => BOOK_TO_VOLUME[b] = "NT");
["1 Nephi","2 Nephi","Jacob","Enos","Jarom","Omni","Words of Mormon","Mosiah","Alma","Helaman","3 Nephi","4 Nephi","Mormon","Ether","Moroni"].forEach(b => BOOK_TO_VOLUME[b] = "BoM");
BOOK_TO_VOLUME["Doctrine and Covenants"] = "D&C";
["Moses","Abraham","Joseph Smith—Matthew","Joseph Smith—History","Articles of Faith"].forEach(b => BOOK_TO_VOLUME[b] = "PoGP");

const PRIMARY_TOOLS = [
  { href: "/word-explorer", svgIcon: "/search.svg", name: "Word Explorer", description: "Frequency analysis with 3-level drill-down across all volumes." },
  { href: "/people", svgIcon: "/people.svg", name: "People", description: "857 named individuals with bios, family trees, and portraits." },
  { href: "/locations", svgIcon: "/locations.svg", name: "Places", description: "333 scripture locations with maps and mentions." },
];

const SECONDARY_TOOLS = [
  { href: "/wordcloud", name: "Word Cloud" },
  { href: "/sentiment", name: "Sentiment" },
  { href: "/chiasmus", name: "Chiasmus" },
  { href: "/topics", name: "Topics" },
  { href: "/bookmarks", name: "Bookmarks" },
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
function GaugeDial({ value, max, label, color, size = 100 }: { value: number; max: number; label: string; color: string; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animatedVal = useCounter(value);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, size, size * 0.7);
    const cx = size / 2, cy = size * 0.6, R = size * 0.4;
    // Background arc
    ctx.beginPath();
    ctx.arc(cx, cy, R, Math.PI, 2 * Math.PI);
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = size * 0.07;
    ctx.lineCap = "round";
    ctx.stroke();
    // Filled arc
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
      <div style={{ fontSize: "0.6rem", color: "var(--text-muted)", fontWeight: 500, marginTop: "-4px" }}>{label}</div>
    </div>
  );
}

// --- Horizontal Bar ---
function StatBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const animatedVal = useCounter(value);
  const pct = max > 0 ? (animatedVal / max) * 100 : 0;
  return (
    <div style={{ marginBottom: "6px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
        <span style={{ fontSize: "0.65rem", color: "var(--text-secondary)", fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: "0.65rem", color: "var(--text)", fontWeight: 700 }}>{animatedVal.toLocaleString()}</span>
      </div>
      <div style={{ height: "5px", borderRadius: "3px", background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
        <div style={{ height: "100%", borderRadius: "3px", background: color, width: `${Math.min(pct, 100)}%`, transition: "width 1.5s cubic-bezier(0.16, 1, 0.3, 1)" }} />
      </div>
    </div>
  );
}

// --- Volume Shelf Card ---
function VolumeCard({ abbrev, name, bookCount, chapterCount, index }: { abbrev: string; name: string; bookCount: number; chapterCount: number; index: number }) {
  const [mounted, setMounted] = useState(false);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 100 + index * 120);
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
        flexDirection: "column",
        alignItems: "center",
        textDecoration: "none",
        padding: "24px 8px 18px",
        transition: "all 0.4s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.6s ease",
        opacity: mounted ? 1 : 0,
        transform: mounted ? (hovered ? "translateY(-4px)" : "translateY(0)") : "translateY(16px)",
        position: "relative",
        textAlign: "center",
      }}
    >
      {/* Volume color accent dot */}
      <div style={{
        width: hovered ? "40px" : "6px",
        height: "6px",
        borderRadius: "3px",
        background: color,
        marginBottom: "14px",
        transition: "width 0.4s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.4s ease",
        boxShadow: hovered ? `0 0 20px ${color}60` : "none",
      }} />
      <div style={{
        fontSize: "0.95rem",
        fontWeight: 700,
        color: hovered ? "var(--text)" : "rgba(255,255,255,0.8)",
        marginBottom: "5px",
        transition: "color 0.3s ease",
        letterSpacing: "0.01em",
      }}>
        {name}
      </div>
      <div style={{
        fontSize: "0.62rem",
        color: "var(--text-muted)",
        marginBottom: "12px",
        letterSpacing: "0.04em",
      }}>
        {bookCount} {bookCount === 1 ? "book" : "books"} · {chapterCount} chapters
      </div>
      <div style={{
        fontSize: "0.65rem",
        fontWeight: 600,
        color,
        opacity: hovered ? 1 : 0.5,
        transition: "opacity 0.3s ease, letter-spacing 0.3s ease",
        letterSpacing: hovered ? "0.08em" : "0.04em",
        textTransform: "uppercase",
      }}>
        Read →
      </div>
    </Link>
  );
}

// --- Section Divider ---
function SectionDivider() {
  return (
    <div style={{ height: "1px", background: "rgba(255,255,255,0.04)", margin: "0 auto", maxWidth: "100%" }} />
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
  const [carouselIdx, setCarouselIdx] = useState(0);

  const animatedTotalWords = useCounter(bookStats.totalWords);
  const animatedVerses = useCounter(bookStats.totalVerses);
  const animatedBooks = useCounter(bookStats.totalBooks);
  const animatedPeople = useCounter(genderCounts.male + genderCounts.female);

  // Scroll-reveal refs
  const toolsReveal = useScrollReveal(0.1);
  const discoveryReveal = useScrollReveal(0.1);
  const statsReveal = useScrollReveal(0.1);

  // Auto-advance people carousel every 3s
  useEffect(() => {
    if (featuredChars.length <= 3) return;
    const timer = setInterval(() => {
      setCarouselIdx((prev) => (prev + 1) % (featuredChars.length - 2));
    }, 3000);
    return () => clearInterval(timer);
  }, [featuredChars.length]);

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

  // Build volume shelf data from API
  const volumeShelfData = VOLUME_ORDER
    .filter((abbrev) => isVolumeVisible(abbrev))
    .map((abbrev) => {
      const vol = volumes.find((v) => v.abbrev === abbrev);
      const bookCount = vol ? vol.books.length : 0;
      const chapterCount = vol ? vol.books.reduce((sum, b) => sum + b.chapterCount, 0) : 0;
      return { abbrev, name: VOLUME_FULL_NAMES[abbrev] || abbrev, bookCount, chapterCount };
    });

  const counterItems = [
    { value: animatedVerses, label: "Verses", fallback: "41,995" },
    { value: animatedBooks, label: "Books", fallback: "87" },
    { value: volumeShelfData.length, label: "Volumes", fallback: "5" },
    { value: animatedPeople, label: "People", fallback: "857" },
  ];

  return (
    <>
      <Header />
      <div className="page-container page-darker">
        {/* ═══ 1. HERO ═══ */}
        <div style={{ textAlign: "center", marginTop: isMobile ? "28px" : "56px", marginBottom: "24px" }}>
          <h1 style={{
            fontSize: isMobile ? "1.3rem" : "1.8rem",
            fontWeight: 800,
            letterSpacing: "0.08em",
            marginBottom: "10px",
            textTransform: "uppercase",
            background: "linear-gradient(90deg, #DC2F4B, #E8532C, #F57B20, #F5A623, #F5C829)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}>
            LDS Scripture Explorer
          </h1>
          <p style={{ fontSize: isMobile ? "0.85rem" : "0.95rem", color: "var(--text-secondary)", margin: "0 auto", lineHeight: 1.6 }}>
            Search, analyze, and read {bookStats.totalVerses ? bookStats.totalVerses.toLocaleString() : "41,995"} verses across all five volumes.
          </p>
        </div>

        {/* ═══ 2. ANIMATED COUNTERS ═══ */}
        <div style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          alignItems: "baseline",
          gap: isMobile ? "4px 0" : "0",
          maxWidth: "600px",
          margin: "0 auto 40px",
          textAlign: "center",
        }}>
          {counterItems.map((item, i) => (
            <div key={item.label} style={{ display: "flex", alignItems: "baseline", ...(isMobile && i % 2 === 0 && i < counterItems.length - 1 ? { width: "50%", justifyContent: "center" } : isMobile ? { width: "50%", justifyContent: "center" } : {}) }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{ fontSize: isMobile ? "1.6rem" : "2rem", fontWeight: 800, color: "var(--text)", letterSpacing: "-0.02em" }}>
                  {item.value > 0 ? item.value.toLocaleString() : item.fallback}
                </div>
                <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.1em", marginTop: "2px" }}>
                  {item.label}
                </div>
              </div>
              {!isMobile && i < counterItems.length - 1 && (
                <span style={{ fontSize: "1.2rem", color: "rgba(255,255,255,0.15)", margin: "0 20px", fontWeight: 300, alignSelf: "center" }}>&middot;</span>
              )}
            </div>
          ))}
        </div>

        <SectionDivider />

        {/* ═══ 3. VOLUME SHELF ═══ */}
        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : `repeat(${volumeShelfData.length}, 1fr)`,
          gap: isMobile ? "10px" : "14px",
          marginTop: "56px",
          marginBottom: "56px",
        }}>
          {volumeShelfData.map((v, i) => (
            <VolumeCard key={v.abbrev} abbrev={v.abbrev} name={v.name} bookCount={v.bookCount} chapterCount={v.chapterCount} index={i} />
          ))}
        </div>

        <SectionDivider />

        {/* ═══ PEOPLE SPOTLIGHT ═══ */}
        {spotlightChar && (
          <div style={{ marginTop: "56px", marginBottom: "48px", display: "flex", flexDirection: isMobile ? "column" : "row", alignItems: "center", gap: isMobile ? "16px" : "24px" }}>
            {/* Large portrait */}
            <Link href={`/people?person=${spotlightChar.id}`} onClick={() => analytics.homeSpotlightClick(spotlightChar.id)} style={{ textDecoration: "none", flexShrink: 0 }}>
              <div style={{ width: isMobile ? "100px" : "120px", height: isMobile ? "100px" : "120px", borderRadius: "50%", overflow: "hidden", border: `3px solid ${getCharColor(spotlightChar)}50`, transition: "transform 0.3s, box-shadow 0.3s" }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.05)"; e.currentTarget.style.boxShadow = `0 0 30px ${getCharColor(spotlightChar)}30`; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "none"; }}
              >
                <img src={spotlightChar.portraitUrl} alt={spotlightChar.name} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 20%" }} />
              </div>
            </Link>
            {/* Info + carousel */}
            <div style={{ flex: 1, textAlign: isMobile ? "center" : "left" }}>
              <div style={{ fontSize: "0.55rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.14em", color: getCharColor(spotlightChar), marginBottom: "2px" }}>Spotlight</div>
              <Link href={`/people?person=${spotlightChar.id}`} style={{ textDecoration: "none" }}>
                <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text)", marginBottom: "2px" }}>{spotlightChar.name}</div>
              </Link>
              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: "10px" }}>{spotlightChar.roles.slice(0, 3).join(" · ")}</div>
              {/* Mini carousel */}
              {featuredChars.length > 0 && (
                <div style={{ display: "flex", gap: "8px", justifyContent: isMobile ? "center" : "flex-start", flexWrap: "wrap" }}>
                  {featuredChars.slice(0, 8).map((c) => (
                    <Link key={c.id} href={`/people?person=${c.id}`} style={{ textDecoration: "none" }}>
                      <div style={{ width: "36px", height: "36px", borderRadius: "50%", overflow: "hidden", border: `2px solid ${getCharColor(c)}30`, transition: "transform 0.2s, border-color 0.2s" }}
                        onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.15)"; e.currentTarget.style.borderColor = `${getCharColor(c)}80`; }}
                        onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.borderColor = `${getCharColor(c)}30`; }}
                      >
                        <img src={c.portraitUrl} alt={c.name} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 20%" }} loading="lazy" />
                      </div>
                    </Link>
                  ))}
                  <Link href="/people" style={{ width: "36px", height: "36px", borderRadius: "50%", background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none", fontSize: "0.6rem", fontWeight: 700, color: "var(--text-muted)", transition: "all 0.2s" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.12)"; e.currentTarget.style.color = "var(--text)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "var(--text-muted)"; }}
                  >
                    +{(genderCounts.male + genderCounts.female) - 8}
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        <SectionDivider />

        {/* ═══ 4. DISCOVERY TOOLS ═══ */}
        <div
          ref={toolsReveal.ref}
          style={{
            marginTop: "56px",
            marginBottom: "56px",
            opacity: toolsReveal.isVisible ? 1 : 0,
            transform: toolsReveal.isVisible ? "translateY(0)" : "translateY(20px)",
            transition: "opacity 0.6s ease, transform 0.6s ease",
          }}
        >
          {/* Primary row */}
          <div style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
            gap: "14px",
            marginBottom: "18px",
          }}>
            {PRIMARY_TOOLS.map((tool) => (
              <Link
                key={tool.href}
                href={tool.href}
                onClick={() => analytics.homeToolCardClick(tool.name)}
                style={{
                  display: "block",
                  textDecoration: "none",
                  background: "transparent",
                  padding: isMobile ? "16px" : "20px",
                  transition: "all 0.25s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  const nameEl = e.currentTarget.querySelector("[data-tool-name]") as HTMLElement;
                  if (nameEl) nameEl.style.color = "#ffffff";
                  const descEl = e.currentTarget.querySelector("[data-tool-desc]") as HTMLElement;
                  if (descEl) descEl.style.color = "var(--text-secondary)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  const nameEl = e.currentTarget.querySelector("[data-tool-name]") as HTMLElement;
                  if (nameEl) nameEl.style.color = "var(--text)";
                  const descEl = e.currentTarget.querySelector("[data-tool-desc]") as HTMLElement;
                  if (descEl) descEl.style.color = "var(--text-muted)";
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                  <div style={{ width: "30px", height: "30px", borderRadius: "8px", background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <img src={tool.svgIcon} alt="" style={{ width: "15px", height: "15px", filter: "invert(1) brightness(0.8)" }} />
                  </div>
                  <div data-tool-name style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text)", transition: "color 0.25s" }}>{tool.name}</div>
                </div>
                <div data-tool-desc style={{ fontSize: "0.75rem", color: "var(--text-muted)", lineHeight: 1.5, transition: "color 0.25s" }}>{tool.description}</div>
              </Link>
            ))}
          </div>

          {/* Secondary row - inline text links */}
          <div style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "6px 20px",
            justifyContent: "center",
          }}>
            {SECONDARY_TOOLS.map((tool) => (
              <Link
                key={tool.href}
                href={tool.href}
                onClick={() => analytics.homeToolCardClick(tool.name)}
                style={{
                  textDecoration: "none",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  color: "var(--text-muted)",
                  padding: "4px 0",
                  transition: "color 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "var(--text)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "var(--text-muted)";
                }}
              >
                {tool.name}
              </Link>
            ))}
          </div>
        </div>

        <SectionDivider />

        {/* ═══ 5. CONTEXT NUGGET ═══ */}
        {nugget && nuggetLink && (
          <div
            ref={discoveryReveal.ref}
            style={{
              marginTop: "56px",
              marginBottom: "56px",
              maxWidth: "640px",
              marginLeft: "auto",
              marginRight: "auto",
              opacity: discoveryReveal.isVisible ? 1 : 0,
              transform: discoveryReveal.isVisible ? "translateY(0)" : "translateY(20px)",
              transition: "opacity 0.6s ease, transform 0.6s ease",
            }}
          >
            <Link href={nuggetLink} style={{ textDecoration: "none", display: "block" }}>
              <div
                style={{
                  padding: "18px",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                  <span style={{ fontSize: "0.55rem", fontWeight: 700, padding: "2px 8px", borderRadius: "4px", background: `${CATEGORY_COLORS[nugget.category] || "#F5A623"}20`, color: CATEGORY_COLORS[nugget.category] || "#F5A623", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    {nugget.category}
                  </span>
                  <span style={{ fontSize: "0.55rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", color: "#F5A623" }}>
                    Did you know?
                  </span>
                </div>
                <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text)", marginBottom: "8px" }}>{nugget.title}</div>
                <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.6, margin: "0 0 10px", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {nugget.insight}
                </p>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>{nugget.book} {nugget.chapter}:{nugget.verse}</span>
                  <span style={{ fontSize: "0.72rem", color: "#F5A623" }}>Read in context &rarr;</span>
                </div>
              </div>
            </Link>
          </div>
        )}

        <SectionDivider />

        {/* ═══ 6. SCRIPTURE STATS ═══ */}
        <div
          ref={statsReveal.ref}
          style={{
            marginTop: "56px",
            marginBottom: "56px",
            opacity: statsReveal.isVisible ? 1 : 0,
            transform: statsReveal.isVisible ? "translateY(0)" : "translateY(20px)",
            transition: "opacity 0.6s ease, transform 0.6s ease",
          }}
        >
          <div style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
            gap: "32px",
          }}>
            {/* Stats gauges */}
            {bookStats.totalVerses > 0 && (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--text)", letterSpacing: "-0.02em", marginBottom: "2px" }}>
                  {animatedTotalWords.toLocaleString()}
                </div>
                <div style={{ fontSize: "0.6rem", color: "var(--text-muted)", marginBottom: "20px" }}>total words across 5 volumes</div>
                <div style={{ display: "flex", justifyContent: "space-around" }}>
                  <GaugeDial value={bookStats.totalVerses} max={50000} label="Verses" color="#3B82F6" size={isMobile ? 80 : 100} />
                  <GaugeDial value={bookStats.totalChapters} max={2000} label="Chapters" color="#10B981" size={isMobile ? 80 : 100} />
                  <GaugeDial value={bookStats.totalBooks} max={100} label="Books" color="#A78BFA" size={isMobile ? 80 : 100} />
                </div>
              </div>
            )}

            {/* Volume bars + fun facts */}
            {bookStats.totalVerses > 0 && (
              <div>
                <div style={{ fontSize: "0.6rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: "10px" }}>
                  Words by Volume
                </div>
                {VOLUME_ORDER.filter(v => bookStats.volumeWords[v]).map((v) => (
                  <StatBar key={v} label={v} value={bookStats.volumeWords[v] || 0} max={Math.max(...Object.values(bookStats.volumeWords))} color={VOLUME_COLORS[v] || "#888"} />
                ))}
                <div style={{ display: "flex", justifyContent: "space-around", marginTop: "16px" }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "0.8rem", fontWeight: 800, color: "#10B981" }}>{bookStats.longestBook}</div>
                    <div style={{ fontSize: "0.5rem", color: "var(--text-muted)" }}>Longest Book</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "0.8rem", fontWeight: 800, color: "#F59E0B" }}>{bookStats.shortestBook}</div>
                    <div style={{ fontSize: "0.5rem", color: "var(--text-muted)" }}>Shortest Book</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
