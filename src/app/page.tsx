"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import { VOLUME_COLORS } from "@/lib/constants";
import VolumeTooltip from "@/components/VolumeTooltip";
import { usePreferencesContext } from "@/components/PreferencesProvider";
import { useIsMobile } from "@/lib/useIsMobile";
import { bookNameToSlug, VOLUME_ABBREV_TO_SLUG } from "@/lib/scripture-slugs";
import type { ScriptureCharacter, ContextNugget, BookStat } from "@/lib/types";
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

// Book → volume mapping for nugget links
const BOOK_TO_VOLUME: Record<string, string> = {};
// OT books
["Genesis","Exodus","Leviticus","Numbers","Deuteronomy","Joshua","Judges","Ruth","1 Samuel","2 Samuel","1 Kings","2 Kings","1 Chronicles","2 Chronicles","Ezra","Nehemiah","Esther","Job","Psalms","Proverbs","Ecclesiastes","Song of Solomon","Isaiah","Jeremiah","Lamentations","Ezekiel","Daniel","Hosea","Joel","Amos","Obadiah","Jonah","Micah","Nahum","Habakkuk","Zephaniah","Haggai","Zechariah","Malachi"].forEach(b => BOOK_TO_VOLUME[b] = "OT");
// NT books
["Matthew","Mark","Luke","John","Acts","Romans","1 Corinthians","2 Corinthians","Galatians","Ephesians","Philippians","Colossians","1 Thessalonians","2 Thessalonians","1 Timothy","2 Timothy","Titus","Philemon","Hebrews","James","1 Peter","2 Peter","1 John","2 John","3 John","Jude","Revelation"].forEach(b => BOOK_TO_VOLUME[b] = "NT");
// BoM books
["1 Nephi","2 Nephi","Jacob","Enos","Jarom","Omni","Words of Mormon","Mosiah","Alma","Helaman","3 Nephi","4 Nephi","Mormon","Ether","Moroni"].forEach(b => BOOK_TO_VOLUME[b] = "BoM");
// D&C
BOOK_TO_VOLUME["Doctrine and Covenants"] = "D&C";
// PoGP
["Moses","Abraham","Joseph Smith—Matthew","Joseph Smith—History","Articles of Faith"].forEach(b => BOOK_TO_VOLUME[b] = "PoGP");

const TOOLS = [
  { href: "/scriptures", svgIcon: "/scriptures.svg", name: "Scriptures", description: "Read with insights, themes, and verse interactions." },
  { href: "/search", svgIcon: "/search.svg", name: "Word Search", description: "Frequency analysis across all 87 books." },
  { href: "/narrative-arc", svgIcon: "/narrative-arc.svg", name: "Narrative Arc", description: "Trace themes across all volumes." },
  { href: "/heatmap", svgIcon: "/heatmap.svg", name: "Heatmap", description: "Word frequency by chapter." },
  { href: "/wordcloud", svgIcon: "/word-cloud.svg", name: "Word Cloud", description: "Most frequent words in any book." },
  { href: "/sentiment", svgIcon: "/sentiment.svg", name: "Sentiment Arc", description: "Emotional tone across books." },
  { href: "/people", svgIcon: "/people.svg", name: "People", description: "757 named individuals." },
  { href: "/locations", svgIcon: "/locations.svg", name: "Places", description: "333 scripture locations." },
  { href: "/chiasmus", svgIcon: "/chiasmus.svg", name: "Chiasmus", description: "40 documented ABBA mirror patterns." },
  { href: "/topics", svgIcon: "/topics.svg", name: "Topic Map", description: "Find similar chapters." },
];

// ─── Animated counter hook ───
function useCounter(target: number, duration = 1500, active = true) {
  const [value, setValue] = useState(0);
  const ref = useRef<number>(0);
  useEffect(() => {
    if (!active || target === 0) return;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      const current = Math.round(eased * target);
      setValue(current);
      if (progress < 1) ref.current = requestAnimationFrame(tick);
    };
    ref.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(ref.current);
  }, [target, duration, active]);
  return value;
}

// ─── Tool Card Component ───
function ToolCard({ tool, isMobile }: { tool: typeof TOOLS[0]; isMobile: boolean }) {
  return (
    <Link
      href={tool.href}
      onClick={() => analytics.homeToolCardClick(tool.name)}
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "12px",
        padding: isMobile ? "14px 12px" : "16px 14px",
        textDecoration: "none",
        transition: "all 0.2s ease",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)";
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.3)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--border)";
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <div style={{ width: "30px", height: "30px", borderRadius: "8px", background: "rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <img src={tool.svgIcon} alt="" style={{ width: "15px", height: "15px", filter: "invert(1) brightness(0.7)" }} />
      </div>
      <div>
        <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text)", marginBottom: "3px" }}>{tool.name}</div>
        <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", lineHeight: 1.4 }}>{tool.description}</div>
      </div>
    </Link>
  );
}

// ─── Stat Pill Component ───
function StatPill({ label, value, suffix, icon }: { label: string; value: number; suffix?: string; icon: string }) {
  const count = useCounter(value);
  return (
    <div style={{
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: "10px",
      padding: "12px 14px",
      display: "flex",
      alignItems: "center",
      gap: "10px",
    }}>
      <span style={{ fontSize: "1.1rem" }}>{icon}</span>
      <div>
        <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text)", letterSpacing: "-0.02em" }}>
          {count.toLocaleString()}{suffix || ""}
        </div>
        <div style={{ fontSize: "0.62rem", color: "var(--text-muted)", fontWeight: 500 }}>{label}</div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const isMobile = useIsMobile();
  const { isVolumeVisible } = usePreferencesContext();
  const [randomVerse, setRandomVerse] = useState<RandomVerse | null>(null);
  const [featuredChars, setFeaturedChars] = useState<ScriptureCharacter[]>([]);
  const [spotlightChar, setSpotlightChar] = useState<ScriptureCharacter | null>(null);
  const [nugget, setNugget] = useState<ContextNugget | null>(null);
  const [bookStats, setBookStats] = useState<{ totalVerses: number; totalWords: number; totalChapters: number; totalBooks: number; longestBook: string; shortestBook: string }>({ totalVerses: 0, totalWords: 0, totalChapters: 0, totalBooks: 0, longestBook: "", shortestBook: "" });
  const [genderCounts, setGenderCounts] = useState<{ male: number; female: number }>({ male: 0, female: 0 });
  const [locationCount, setLocationCount] = useState(0);

  // Fetch all home page data on mount
  useEffect(() => {
    // Random verse
    fetch("/api/random-verse")
      .then((r) => r.json())
      .then((data) => {
        if (data && data.text) setRandomVerse(data);
      })
      .catch(() => {});

    // Characters (spotlight + featured + gender counts)
    fetch("/api/characters")
      .then((r) => r.json())
      .then((data) => {
        const chars: ScriptureCharacter[] = data.characters || [];
        const withPortraits = chars.filter((c) => c.portraitUrl);
        const shuffled = withPortraits.sort(() => Math.random() - 0.5);
        setSpotlightChar(shuffled[0] || null);
        setFeaturedChars(shuffled.slice(1, 4));
        setGenderCounts({
          male: chars.filter((c) => c.gender === "male").length,
          female: chars.filter((c) => c.gender === "female").length,
        });
      })
      .catch(() => {});

    // Book stats
    fetch("/api/book-stats")
      .then((r) => r.json())
      .then((data) => {
        const bs: BookStat[] = data.stats || [];
        const sorted = [...bs].sort((a, b) => b.wordCount - a.wordCount);
        setBookStats({
          totalVerses: bs.reduce((s, b) => s + b.verseCount, 0),
          totalWords: bs.reduce((s, b) => s + b.wordCount, 0),
          totalChapters: bs.reduce((s, b) => s + b.chapterCount, 0),
          totalBooks: bs.length,
          longestBook: sorted[0]?.bookName || "",
          shortestBook: sorted[sorted.length - 1]?.bookName || "",
        });
      })
      .catch(() => {});

    // Locations
    fetch("/api/locations")
      .then((r) => r.json())
      .then((data) => setLocationCount((data.locations || []).length))
      .catch(() => {});

    // Random nugget
    fetch("/api/random-nugget")
      .then((r) => r.json())
      .then((data) => { if (data.nugget) setNugget(data.nugget); })
      .catch(() => {});
  }, []);

  const volColor = randomVerse ? VOLUME_COLORS[randomVerse.volumeAbbrev] || "#3B82F6" : "#3B82F6";
  const isDC = randomVerse?.volumeAbbrev === "D&C";
  const verseRef = randomVerse
    ? isDC
      ? `D&C ${randomVerse.chapter}:${randomVerse.verse}`
      : `${randomVerse.bookName} ${randomVerse.chapter}:${randomVerse.verse}`
    : "";

  const getCharColor = (c: ScriptureCharacter) => {
    for (const v of VOLUME_ORDER) {
      if (c.volumes.includes(v)) return VOLUME_COLORS[v] || "#8b5cf6";
    }
    return "#8b5cf6";
  };

  // Build nugget link
  const nuggetVolume = nugget ? BOOK_TO_VOLUME[nugget.book] : null;
  const nuggetLink = nugget && nuggetVolume
    ? `/scriptures/${VOLUME_ABBREV_TO_SLUG[nuggetVolume]}/${bookNameToSlug(nugget.book)}/${nugget.chapter}?verse=${nugget.verse}`
    : null;

  const CATEGORY_COLORS: Record<string, string> = {
    Linguistic: "#3B82F6",
    Historical: "#F59E0B",
    Cultural: "#10B981",
    Literary: "#A78BFA",
    Restoration: "#F43F5E",
  };

  // ─── MOBILE LAYOUT ───
  if (isMobile) {
    return (
      <>
        <Header />
        <div className="page-container">
          {/* Hero */}
          <div style={{ textAlign: "center", marginTop: "24px", marginBottom: "24px" }}>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--text)", letterSpacing: "0.08em", marginBottom: "10px", textTransform: "uppercase" }}>
              Scripture Explorer
            </h1>
            <p style={{ fontSize: "0.92rem", color: "#ffffff", margin: "0 auto", lineHeight: 1.6 }}>
              Search, analyze, and read {bookStats.totalVerses ? bookStats.totalVerses.toLocaleString() : "41,995"} verses across all five volumes.
            </p>
          </div>

          {/* Row 1: Scriptures + People (prominent) */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
            {TOOLS.filter(t => t.name === "Scriptures" || t.name === "People").map(t => (
              <ToolCard key={t.href} tool={t} isMobile={true} />
            ))}
          </div>

          {/* Row 2: 2 Featured People cards */}
          {featuredChars.length >= 2 && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
              {featuredChars.slice(0, 2).map((c) => (
                <Link key={c.id} href={`/people?person=${c.id}`} style={{ textDecoration: "none" }}>
                  <div style={{
                    background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px",
                    overflow: "hidden", transition: "all 0.2s",
                  }}>
                    <div style={{ aspectRatio: "3/2", overflow: "hidden" }}>
                      <img src={c.portraitUrl} alt={c.name} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 20%" }} loading="lazy" />
                    </div>
                    <div style={{ padding: "10px 12px" }}>
                      <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text)" }}>{c.name}</div>
                      <div style={{ fontSize: "0.62rem", color: "var(--text-muted)" }}>{c.roles[0]}</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Row 3: 4 Tool cards */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "16px" }}>
            {TOOLS.filter(t => ["Word Search", "Heatmap", "Places", "Chiasmus"].includes(t.name)).map(t => (
              <ToolCard key={t.href} tool={t} isMobile={true} />
            ))}
          </div>

          {/* Scripture Stats */}
          {bookStats.totalVerses > 0 && (
            <div style={{ marginBottom: "16px" }}>
              <div style={{ fontSize: "0.65rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--text-muted)", marginBottom: "10px" }}>
                By the Numbers
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                <StatPill icon="📖" value={bookStats.totalVerses} label="Verses" />
                <StatPill icon="✍️" value={bookStats.totalWords} label="Words" />
                <StatPill icon="📚" value={bookStats.totalChapters} label="Chapters" />
                <StatPill icon="👤" value={genderCounts.male + genderCounts.female} label="Named People" />
                <StatPill icon="📍" value={locationCount} label="Places" />
                <StatPill icon="📕" value={bookStats.totalBooks} label="Books" />
              </div>
            </div>
          )}

          {/* Featured Nugget */}
          {nugget && (
            <div style={{
              background: "linear-gradient(135deg, rgba(245,166,35,0.08), rgba(245,200,41,0.04))",
              border: "1px solid rgba(245,166,35,0.2)",
              borderRadius: "14px",
              padding: "16px",
              marginBottom: "16px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                <span style={{ fontSize: "0.55rem", fontWeight: 700, padding: "2px 8px", borderRadius: "4px", background: `${CATEGORY_COLORS[nugget.category] || "#F5A623"}20`, color: CATEGORY_COLORS[nugget.category] || "#F5A623", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  {nugget.category}
                </span>
                <span style={{ fontSize: "0.55rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", color: "#F5A623" }}>
                  Did you know?
                </span>
              </div>
              <div style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--text)", marginBottom: "8px" }}>{nugget.title}</div>
              <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.6, margin: "0 0 10px", display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                {nugget.insight}
              </p>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>{nugget.book} {nugget.chapter}:{nugget.verse}</span>
                {nuggetLink && (
                  <Link href={nuggetLink} style={{ fontSize: "0.72rem", color: "#F5A623", textDecoration: "underline", textUnderlineOffset: "3px" }}>
                    Read in context →
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* Remaining tools */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "16px" }}>
            {TOOLS.filter(t => ["Narrative Arc", "Word Cloud", "Sentiment Arc", "Topic Map"].includes(t.name)).map(t => (
              <ToolCard key={t.href} tool={t} isMobile={true} />
            ))}
          </div>

          {/* Random Verse */}
          {randomVerse && (
            <div style={{
              background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "14px",
              padding: "16px", borderLeft: `3px solid ${volColor}`, marginBottom: "36px",
            }}>
              <div style={{ fontSize: "0.55rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--text-muted)", marginBottom: "10px" }}>
                Discover a Verse
              </div>
              <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.7, fontStyle: "italic", marginBottom: "12px" }}>
                &ldquo;{randomVerse.text.length > 180 ? randomVerse.text.substring(0, 180) + "..." : randomVerse.text}&rdquo;
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.75rem", fontWeight: 600, color: volColor }}>— {verseRef}</span>
                <a href={`/scriptures?bookId=${randomVerse.bookId}&chapter=${randomVerse.chapter}&verse=${randomVerse.verse}`} style={{ fontSize: "0.72rem", color: "var(--accent)", textDecoration: "underline", textUnderlineOffset: "3px" }}>
                  Read →
                </a>
              </div>
            </div>
          )}
        </div>
      </>
    );
  }

  // ─── DESKTOP LAYOUT (3 columns) ───
  return (
    <>
      <Header />
      <div className="page-container">
        {/* Hero */}
        <div style={{ textAlign: "center", marginTop: "48px", marginBottom: "44px" }}>
          <h1 style={{ fontSize: "2.2rem", fontWeight: 800, color: "var(--text)", letterSpacing: "0.08em", marginBottom: "12px", textTransform: "uppercase" }}>
            Scripture Explorer
          </h1>
          <p style={{ fontSize: "1.1rem", color: "#ffffff", maxWidth: "680px", margin: "0 auto", lineHeight: 1.6 }}>
            Search, analyze, and read {bookStats.totalVerses ? bookStats.totalVerses.toLocaleString() : "41,995"} verses across all five volumes of scripture.
          </p>
        </div>

        {/* ═══ THREE-COLUMN LAYOUT ═══ */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 320px 280px",
          gap: "24px",
          marginBottom: "52px",
          alignItems: "start",
        }}>
          {/* ── COLUMN 1: Tool Cards ── */}
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "10px" }}>
              {TOOLS.map((tool) => (
                <ToolCard key={tool.href} tool={tool} isMobile={false} />
              ))}
            </div>
          </div>

          {/* ── COLUMN 2: People + Nugget ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {/* Spotlight Character */}
            {spotlightChar && (
              <Link href={`/people?person=${spotlightChar.id}`} onClick={() => analytics.homeSpotlightClick(spotlightChar.id)} style={{ display: "block", textDecoration: "none" }}>
                <div style={{ borderRadius: "14px", overflow: "hidden", background: "var(--surface)", border: "1px solid var(--border)", transition: "all 0.3s ease" }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = `${getCharColor(spotlightChar)}50`; e.currentTarget.style.boxShadow = `0 12px 40px ${getCharColor(spotlightChar)}15`; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "none"; }}
                >
                  <div style={{ aspectRatio: "16 / 9", overflow: "hidden", position: "relative" }}>
                    <img src={spotlightChar.portraitUrl} alt={spotlightChar.name} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 20%" }} />
                    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "50px", background: "linear-gradient(transparent, var(--surface))" }} />
                  </div>
                  <div style={{ padding: "12px 16px 14px" }}>
                    <div style={{ fontSize: "0.5rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.14em", color: getCharColor(spotlightChar), marginBottom: "4px" }}>Spotlight</div>
                    <div style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--text)", marginBottom: "3px" }}>{spotlightChar.name}</div>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: "8px" }}>{spotlightChar.roles.slice(0, 3).join(" · ")}</div>
                    <p style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.65)", lineHeight: 1.55, margin: "0 0 10px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {spotlightChar.bio}
                    </p>
                    <div style={{ display: "flex", gap: "4px" }}>
                      {spotlightChar.volumes.map((v) => (
                        <VolumeTooltip key={v} abbrev={v} style={{ fontSize: "0.5rem", fontWeight: 700, color: VOLUME_COLORS[v] || "#888", background: `${VOLUME_COLORS[v] || "#888"}15`, padding: "2px 6px", borderRadius: "3px" }} />
                      ))}
                    </div>
                  </div>
                </div>
              </Link>
            )}

            {/* 3 Featured People */}
            {featuredChars.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
                {featuredChars.slice(0, 3).map((c) => (
                  <Link key={c.id} href={`/people?person=${c.id}`} style={{ textDecoration: "none", textAlign: "center", transition: "transform 0.2s" }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; }}
                  >
                    <div style={{ width: "100%", aspectRatio: "1", borderRadius: "10px", overflow: "hidden", marginBottom: "4px", border: "1px solid var(--border)" }}>
                      <img src={c.portraitUrl} alt={c.name} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 20%" }} loading="lazy" />
                    </div>
                    <div style={{ fontSize: "0.6rem", fontWeight: 600, color: "var(--text-secondary)", lineHeight: 1.2 }}>{c.name}</div>
                  </Link>
                ))}
              </div>
            )}

            {/* See all people link */}
            <div style={{ textAlign: "center" }}>
              <Link href="/people" style={{ fontSize: "0.72rem", fontWeight: 500, color: "var(--accent)", textDecoration: "underline", textUnderlineOffset: "3px" }}>
                Explore all 757 people →
              </Link>
            </div>

            {/* Featured Nugget */}
            {nugget && (
              <div style={{
                background: "linear-gradient(135deg, rgba(245,166,35,0.08), rgba(245,200,41,0.04))",
                border: "1px solid rgba(245,166,35,0.2)",
                borderRadius: "14px",
                padding: "16px",
              }}>
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
                  {nuggetLink && (
                    <Link href={nuggetLink} style={{ fontSize: "0.72rem", color: "#F5A623", textDecoration: "underline", textUnderlineOffset: "3px" }}>
                      Read in context →
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── COLUMN 3: Stats + Random Verse ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ fontSize: "0.65rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--text-muted)", marginBottom: "2px" }}>
              By the Numbers
            </div>

            {bookStats.totalVerses > 0 && (
              <>
                <StatPill icon="📖" value={bookStats.totalVerses} label="Verses across 5 volumes" />
                <StatPill icon="✍️" value={bookStats.totalWords} label="Total words" />
                <StatPill icon="📚" value={bookStats.totalChapters} label="Chapters" />
                <StatPill icon="📕" value={bookStats.totalBooks} label="Books" />
                <StatPill icon="👤" value={genderCounts.male + genderCounts.female} label={`People (${genderCounts.male + genderCounts.female > 0 ? Math.round(genderCounts.male / (genderCounts.male + genderCounts.female) * 100) : 0}% men)`} />
                <StatPill icon="📍" value={locationCount} label="Named locations" />

                {/* Text stats */}
                <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", padding: "12px 14px" }}>
                  <div style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--text)", marginBottom: "6px" }}>
                    📊 Fun Facts
                  </div>
                  <div style={{ fontSize: "0.68rem", color: "var(--text-secondary)", lineHeight: 1.7 }}>
                    <div>Longest book: <strong style={{ color: "var(--text)" }}>{bookStats.longestBook}</strong></div>
                    <div>Shortest book: <strong style={{ color: "var(--text)" }}>{bookStats.shortestBook}</strong></div>
                    <div>~{Math.round(bookStats.totalWords * 4.5 / 1000000 * 10) / 10}M letters estimated</div>
                    <div>5 volumes spanning ~4,000 years</div>
                  </div>
                </div>
              </>
            )}

            {/* Random Verse */}
            {randomVerse && (
              <div style={{
                background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px",
                padding: "14px 16px", borderLeft: `3px solid ${volColor}`, marginTop: "4px",
              }}>
                <div style={{ fontSize: "0.55rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--text-muted)", marginBottom: "8px" }}>
                  Discover a Verse
                </div>
                <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.65, fontStyle: "italic", marginBottom: "10px" }}>
                  &ldquo;{randomVerse.text.length > 160 ? randomVerse.text.substring(0, 160) + "..." : randomVerse.text}&rdquo;
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.72rem", fontWeight: 600, color: volColor }}>— {verseRef}</span>
                  <a href={`/scriptures?bookId=${randomVerse.bookId}&chapter=${randomVerse.chapter}&verse=${randomVerse.verse}`}
                    onClick={() => analytics.randomVerseClick(randomVerse.bookName, randomVerse.chapter, randomVerse.verse)}
                    style={{ fontSize: "0.68rem", color: "var(--accent)", textDecoration: "underline", textUnderlineOffset: "3px" }}>
                    Read →
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
