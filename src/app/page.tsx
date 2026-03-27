"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { VOLUME_COLORS } from "@/lib/constants";
import VolumeTooltip from "@/components/VolumeTooltip";
import { usePreferencesContext } from "@/components/PreferencesProvider";
import { useIsMobile } from "@/lib/useIsMobile";
import { bookNameToSlug, VOLUME_ABBREV_TO_SLUG } from "@/lib/scripture-slugs";
import { useScrollReveal } from "@/lib/useScrollReveal";
import type { ScriptureCharacter, ContextNugget, BookStat, Volume } from "@/lib/types";
import { analytics } from "@/lib/analytics";

interface RandomVerse {
  verse: number;
  chapter: number;
  text: string;
  bookId: number;
  bookName: string;
  volumeAbbrev: string;
}

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

// --- SVG Ring Chart ---
function RingChart({ value, max, label, color, size = 72, strokeWidth = 6, fontSize: fs }: { value: number; max: number; label: string; color: string; size?: number; strokeWidth?: number; fontSize?: string }) {
  const animatedVal = useCounter(value);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = max > 0 ? animatedVal / max : 0;
  const dashOffset = circumference * (1 - progress);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
      <div style={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)", display: "block" }}>
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth} />
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
            strokeDasharray={circumference} strokeDashoffset={dashOffset} strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 1.5s cubic-bezier(0.16, 1, 0.3, 1)" }} />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: fs || "0.82rem", fontWeight: 700, color: "var(--text)" }}>
          {animatedVal.toLocaleString()}
        </div>
      </div>
      <div style={{ fontSize: "0.58rem", color: "var(--text-muted)", fontWeight: 500, textAlign: "center" }}>{label}</div>
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
  const cardRef = useRef<HTMLAnchorElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 100 + index * 100);
    return () => clearTimeout(timer);
  }, [index]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx", `${e.clientX - rect.left}px`);
    e.currentTarget.style.setProperty("--my", `${e.clientY - rect.top}px`);
  }, []);

  const color = VOLUME_COLORS[abbrev] || "#888";
  const slug = VOLUME_ABBREV_TO_SLUG[abbrev];

  return (
    <Link
      ref={cardRef}
      href={`/scriptures/${slug}`}
      onMouseMove={handleMouseMove}
      style={{
        display: "block",
        textDecoration: "none",
        background: "rgba(255,255,255,0.03)",
        borderLeft: `3px solid ${color}`,
        borderRadius: "10px",
        padding: "20px 18px",
        transition: "all 0.3s ease, opacity 0.5s ease, transform 0.5s ease",
        opacity: mounted ? 1 : 0,
        transform: mounted ? "translateY(0)" : "translateY(12px)",
        position: "relative",
        overflow: "hidden",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-3px)";
        e.currentTarget.style.boxShadow = `0 8px 32px ${color}25`;
        e.currentTarget.style.background = `radial-gradient(300px circle at var(--mx, 50%) var(--my, 50%), ${color}12, rgba(255,255,255,0.03) 70%)`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.background = "rgba(255,255,255,0.03)";
      }}
    >
      <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text)", marginBottom: "6px" }}>
        {name}
      </div>
      <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: "14px" }}>
        {bookCount} {bookCount === 1 ? "book" : "books"} &middot; {chapterCount} {chapterCount === 1 ? "chapter" : "chapters"}
      </div>
      <div style={{ fontSize: "0.72rem", fontWeight: 600, color }}>
        Start Reading &rarr;
      </div>
    </Link>
  );
}

export default function HomePage() {
  const isMobile = useIsMobile();
  const { isVolumeVisible } = usePreferencesContext();
  const [randomVerse, setRandomVerse] = useState<RandomVerse | null>(null);
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
    fetch("/api/random-verse")
      .then((r) => r.json())
      .then((data) => { if (data?.text) setRandomVerse(data); })
      .catch(() => {});

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

  const volColor = randomVerse ? VOLUME_COLORS[randomVerse.volumeAbbrev] || "#3B82F6" : "#3B82F6";
  const isDC = randomVerse?.volumeAbbrev === "D&C";
  const verseRef = randomVerse
    ? isDC ? `D&C ${randomVerse.chapter}:${randomVerse.verse}` : `${randomVerse.bookName} ${randomVerse.chapter}:${randomVerse.verse}`
    : "";

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
        <div style={{ textAlign: "center", marginTop: isMobile ? "24px" : "48px", marginBottom: "20px" }}>
          <h1 style={{
            fontSize: isMobile ? "1.2rem" : "1.6rem",
            fontWeight: 800,
            letterSpacing: "0.06em",
            marginBottom: "8px",
            textTransform: "uppercase",
            background: "linear-gradient(135deg, #e0e0e0 0%, #ffffff 40%, #c8b8ff 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}>
            Scripture Explorer
          </h1>
          <p style={{ fontSize: isMobile ? "0.85rem" : "0.95rem", color: "var(--text-secondary)", margin: "0 auto", lineHeight: 1.6 }}>
            Search, analyze, and read {bookStats.totalVerses ? bookStats.totalVerses.toLocaleString() : "41,995"} verses across all five volumes.
          </p>
        </div>

        {/* ═══ 2. ANIMATED COUNTERS ═══ */}
        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)",
          gap: isMobile ? "16px" : "24px",
          maxWidth: "600px",
          margin: "0 auto 36px",
          textAlign: "center",
        }}>
          {counterItems.map((item) => (
            <div key={item.label}>
              <div style={{ fontSize: isMobile ? "1.6rem" : "2rem", fontWeight: 800, color: "var(--text)", letterSpacing: "-0.02em" }}>
                {item.value > 0 ? item.value.toLocaleString() : item.fallback}
              </div>
              <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.1em", marginTop: "2px" }}>
                {item.label}
              </div>
            </div>
          ))}
        </div>

        {/* ═══ 3. VOLUME SHELF ═══ */}
        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : `repeat(${volumeShelfData.length}, 1fr)`,
          gap: isMobile ? "10px" : "14px",
          marginBottom: "48px",
        }}>
          {volumeShelfData.map((v, i) => (
            <VolumeCard key={v.abbrev} abbrev={v.abbrev} name={v.name} bookCount={v.bookCount} chapterCount={v.chapterCount} index={i} />
          ))}
        </div>

        {/* ═══ 4. DISCOVERY TOOLS ═══ */}
        <div
          ref={toolsReveal.ref}
          style={{
            marginBottom: "48px",
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
            marginBottom: "14px",
          }}>
            {PRIMARY_TOOLS.map((tool) => (
              <Link
                key={tool.href}
                href={tool.href}
                onClick={() => analytics.homeToolCardClick(tool.name)}
                style={{
                  display: "block",
                  textDecoration: "none",
                  background: "rgba(255,255,255,0.03)",
                  borderRadius: "12px",
                  padding: isMobile ? "16px" : "20px",
                  transition: "all 0.25s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.25)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                  <div style={{ width: "30px", height: "30px", borderRadius: "8px", background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <img src={tool.svgIcon} alt="" style={{ width: "15px", height: "15px", filter: "invert(1) brightness(0.8)" }} />
                  </div>
                  <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text)" }}>{tool.name}</div>
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", lineHeight: 1.5 }}>{tool.description}</div>
              </Link>
            ))}
          </div>

          {/* Secondary row - compact pills */}
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
                  fontSize: "0.72rem",
                  fontWeight: 600,
                  color: "var(--text-secondary)",
                  background: "rgba(255,255,255,0.04)",
                  padding: "6px 16px",
                  borderRadius: "20px",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.1)";
                  e.currentTarget.style.color = "var(--text)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                  e.currentTarget.style.color = "var(--text-secondary)";
                }}
              >
                {tool.name}
              </Link>
            ))}
          </div>
        </div>

        {/* ═══ 5. DAILY DISCOVERY ═══ */}
        <div
          ref={discoveryReveal.ref}
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
            gap: "16px",
            marginBottom: "48px",
            opacity: discoveryReveal.isVisible ? 1 : 0,
            transform: discoveryReveal.isVisible ? "translateY(0)" : "translateY(20px)",
            transition: "opacity 0.6s ease, transform 0.6s ease",
          }}
        >
          {/* Random Verse */}
          {randomVerse && (
            <div style={{
              background: "rgba(255,255,255,0.02)",
              borderRadius: "14px",
              padding: "18px",
              borderLeft: `3px solid ${volColor}`,
            }}>
              <div style={{ fontSize: "0.55rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--text-muted)", marginBottom: "10px" }}>
                Discover a Verse
              </div>
              <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.7, fontStyle: "italic", marginBottom: "12px" }}>
                &ldquo;{randomVerse.text.length > 200 ? randomVerse.text.substring(0, 200) + "..." : randomVerse.text}&rdquo;
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.72rem", fontWeight: 600, color: volColor }}>&mdash; {verseRef}</span>
                <a
                  href={`/scriptures?bookId=${randomVerse.bookId}&chapter=${randomVerse.chapter}&verse=${randomVerse.verse}`}
                  onClick={() => analytics.randomVerseClick(randomVerse.bookName, randomVerse.chapter, randomVerse.verse)}
                  style={{ fontSize: "0.7rem", color: "var(--accent)", textDecoration: "underline", textUnderlineOffset: "3px" }}
                >
                  Read &rarr;
                </a>
              </div>
            </div>
          )}

          {/* Context Nugget */}
          {nugget && nuggetLink && (
            <Link href={nuggetLink} style={{ textDecoration: "none", display: "block" }}>
              <div
                style={{
                  background: "rgba(255,255,255,0.02)",
                  borderRadius: "14px",
                  padding: "18px",
                  transition: "all 0.2s",
                  height: "100%",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
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
          )}
        </div>

        {/* ═══ 6. SCRIPTURE STATS + PEOPLE ═══ */}
        <div
          ref={statsReveal.ref}
          style={{
            marginBottom: "48px",
            opacity: statsReveal.isVisible ? 1 : 0,
            transform: statsReveal.isVisible ? "translateY(0)" : "translateY(20px)",
            transition: "opacity 0.6s ease, transform 0.6s ease",
          }}
        >
          <div style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr",
            gap: "16px",
          }}>
            {/* Stats card */}
            {bookStats.totalVerses > 0 && (
              <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: "14px", padding: "18px", textAlign: "center" }}>
                <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--text)", letterSpacing: "-0.02em", marginBottom: "2px" }}>
                  {animatedTotalWords.toLocaleString()}
                </div>
                <div style={{ fontSize: "0.6rem", color: "var(--text-muted)", marginBottom: "16px" }}>total words across 5 volumes</div>
                <div style={{ display: "flex", justifyContent: "space-around" }}>
                  <RingChart value={bookStats.totalVerses} max={50000} label="Verses" color="#3B82F6" size={64} strokeWidth={5} fontSize="0.7rem" />
                  <RingChart value={bookStats.totalChapters} max={2000} label="Chapters" color="#10B981" size={64} strokeWidth={5} fontSize="0.7rem" />
                  <RingChart value={bookStats.totalBooks} max={100} label="Books" color="#A78BFA" size={64} strokeWidth={5} fontSize="0.7rem" />
                </div>
              </div>
            )}

            {/* Volume bars + fun facts */}
            {bookStats.totalVerses > 0 && (
              <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: "14px", padding: "18px" }}>
                <div style={{ fontSize: "0.6rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: "10px" }}>
                  Words by Volume
                </div>
                {VOLUME_ORDER.filter(v => bookStats.volumeWords[v]).map((v) => (
                  <StatBar key={v} label={v} value={bookStats.volumeWords[v] || 0} max={Math.max(...Object.values(bookStats.volumeWords))} color={VOLUME_COLORS[v] || "#888"} />
                ))}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "12px" }}>
                  <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: "8px", padding: "8px", textAlign: "center" }}>
                    <div style={{ fontSize: "0.8rem", fontWeight: 800, color: "#10B981" }}>{bookStats.longestBook}</div>
                    <div style={{ fontSize: "0.5rem", color: "var(--text-muted)" }}>Longest Book</div>
                  </div>
                  <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: "8px", padding: "8px", textAlign: "center" }}>
                    <div style={{ fontSize: "0.8rem", fontWeight: 800, color: "#F59E0B" }}>{bookStats.shortestBook}</div>
                    <div style={{ fontSize: "0.5rem", color: "var(--text-muted)" }}>Shortest Book</div>
                  </div>
                </div>
              </div>
            )}

            {/* People spotlight + carousel */}
            <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: "14px", padding: "18px" }}>
              {spotlightChar && (
                <Link href={`/people?person=${spotlightChar.id}`} onClick={() => analytics.homeSpotlightClick(spotlightChar.id)} style={{ display: "block", textDecoration: "none", marginBottom: "12px" }}>
                  <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                    <div style={{ width: "52px", height: "52px", borderRadius: "50%", overflow: "hidden", flexShrink: 0, border: `2px solid ${getCharColor(spotlightChar)}40` }}>
                      <img src={spotlightChar.portraitUrl} alt={spotlightChar.name} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 20%" }} />
                    </div>
                    <div>
                      <div style={{ fontSize: "0.5rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.14em", color: getCharColor(spotlightChar), marginBottom: "2px" }}>Spotlight</div>
                      <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text)" }}>{spotlightChar.name}</div>
                      <div style={{ fontSize: "0.62rem", color: "var(--text-muted)" }}>{spotlightChar.roles.slice(0, 2).join(" · ")}</div>
                    </div>
                  </div>
                </Link>
              )}

              {/* People + places count */}
              <div style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
                <RingChart value={genderCounts.male + genderCounts.female} max={1000} label="People" color="#F59E0B" size={52} strokeWidth={4} fontSize="0.62rem" />
                <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  <div style={{ fontSize: "0.62rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
                    {genderCounts.male} men &middot; {genderCounts.female} women
                  </div>
                  <div style={{ fontSize: "0.62rem", color: "var(--text-muted)" }}>
                    {locationCount} named locations
                  </div>
                </div>
              </div>

              {/* People carousel */}
              {featuredChars.length > 0 && (
                <div style={{ overflow: "hidden", borderRadius: "8px" }}>
                  <div style={{
                    display: "flex",
                    gap: "6px",
                    transition: "transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
                    transform: `translateX(-${carouselIdx * (100 / 3 + 2)}%)`,
                  }}>
                    {featuredChars.map((c) => (
                      <Link key={c.id} href={`/people?person=${c.id}`} style={{ textDecoration: "none", textAlign: "center", flex: "0 0 calc(33.33% - 4px)", transition: "transform 0.2s" }}
                        onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.05)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
                      >
                        <div style={{ width: "100%", aspectRatio: "1", borderRadius: "8px", overflow: "hidden", marginBottom: "3px" }}>
                          <img src={c.portraitUrl} alt={c.name} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 20%" }} loading="lazy" />
                        </div>
                        <div style={{ fontSize: "0.55rem", fontWeight: 600, color: "var(--text-secondary)", lineHeight: 1.2 }}>{c.name}</div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ textAlign: "center", marginTop: "10px" }}>
                <Link href="/people" style={{ fontSize: "0.68rem", fontWeight: 500, color: "var(--accent)", textDecoration: "underline", textUnderlineOffset: "3px" }}>
                  Explore all 857 people &rarr;
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
