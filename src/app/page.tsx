"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import { VOLUME_COLORS } from "@/lib/constants";
import VolumeTooltip from "@/components/VolumeTooltip";
import { usePreferencesContext } from "@/components/PreferencesProvider";
import { useIsMobile } from "@/lib/useIsMobile";
import { bookNameToSlug, VOLUME_ABBREV_TO_SLUG } from "@/lib/scripture-slugs";
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

const ALL_TOOLS = [
  { href: "/word-explorer", icon: "/search.svg", name: "Word Explorer", description: "Word frequency across all volumes.", accent: "#3B82F6" },
  { href: "/people", icon: "/people.svg", name: "People", description: "857 named individuals with bios.", accent: "#A78BFA" },
  { href: "/locations", icon: "/locations.svg", name: "Places", description: "333 locations with maps.", accent: "#10B981" },
  { href: "/wordcloud", icon: "/word-cloud.svg", name: "Word Cloud", description: "Visual word frequencies.", accent: "#DC2F4B" },
  { href: "/sentiment", icon: "/narrative-arc.svg", name: "Sentiment", description: "Theological tone analysis.", accent: "#E8532C" },
  { href: "/chiasmus", icon: "/heatmap.svg", name: "Chiasmus", description: "Mirror patterns in scripture.", accent: "#F57B20" },
  { href: "/topics", icon: "/search.svg", name: "Topics", description: "Find similar chapters.", accent: "#F5A623" },
  { href: "/bookmarks", icon: "/favorite.svg", name: "Bookmarks", description: "Your saved verses.", accent: "#F5C829" },
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
      {/* Warm radial gradient glow behind hero */}
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center top, rgba(220,47,75,0.08) 0%, rgba(245,200,41,0.04) 30%, transparent 60%)", pointerEvents: "none" }} />
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
        padding: "10px 16px",
        borderRadius: "10px",
        background: hovered
          ? `linear-gradient(90deg, ${color}12, transparent 70%)`
          : `linear-gradient(90deg, ${color}08, transparent 50%)`,
        borderLeft: `5px solid ${color}`,
        transition: "all 0.35s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.5s ease",
        opacity: mounted ? 1 : 0,
        transform: mounted ? (hovered ? "translateX(4px)" : "translateX(0)") : "translateX(-20px)",
        boxShadow: hovered ? `inset 0 0 30px ${color}10, 0 2px 12px rgba(0,0,0,0.15)` : "none",
      }}
    >
      {/* Glow dot */}
      <div style={{
        width: "10px",
        height: "10px",
        borderRadius: "50%",
        background: color,
        marginRight: "14px",
        flexShrink: 0,
        boxShadow: hovered ? `0 0 14px ${color}90, 0 0 4px ${color}` : `0 0 8px ${color}60, 0 0 2px ${color}80`,
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

  const animatedVerses = useCounter(bookStats.totalVerses);
  const animatedBooks = useCounter(bookStats.totalBooks);
  const animatedPeople = useCounter(genderCounts.male + genderCounts.female);
  const animatedLocations = useCounter(locationCount);


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
      <div className="page-container page-darker" style={{ paddingTop: 0 }}>

        {/* ═══ 1. HERO with Particle Canvas ═══ */}
        <ParticleHero>
          <div style={{ textAlign: "center", padding: isMobile ? "36px 0 32px" : "64px 0 48px" }}>
            <div style={{
              fontSize: "0.6rem",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.2em",
              color: "rgba(255,255,255,0.4)",
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
              color: "rgba(255,255,255,0.7)",
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
                { value: animatedVerses, label: "Verses", fallback: "41,995", accent: "#3B82F6", href: "/scriptures" },
                { value: animatedBooks, label: "Books", fallback: "87", accent: "#A78BFA", href: "/scriptures" },
                { value: animatedPeople, label: "People", fallback: "857", accent: "#F59E0B", href: "/people" },
                { value: animatedLocations, label: "Places", fallback: "333", accent: "#06B6D4", href: "/locations" },
              ].map((item, i, arr) => (
                <div key={item.label} style={{
                  display: "flex",
                  alignItems: "center",
                  ...(isMobile ? { width: i < 2 ? "50%" : "50%", justifyContent: "center", marginBottom: "8px" } : {}),
                }}>
                  <Link href={item.href} style={{
                    textAlign: "center",
                    padding: isMobile ? "0 4px" : "0 16px",
                    minWidth: isMobile ? "80px" : "110px",
                    textDecoration: "none",
                    transition: "opacity 0.2s",
                  }}
                    onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.8"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
                  >
                    <div style={{
                      fontSize: isMobile ? "1.5rem" : "2rem",
                      fontWeight: 800,
                      color: item.accent,
                      letterSpacing: "-0.02em",
                      lineHeight: 1.1,
                      fontVariantNumeric: "tabular-nums",
                    }}>
                      {item.value > 0 ? item.value.toLocaleString() : item.fallback}
                    </div>
                    <div style={{
                      fontSize: "0.62rem",
                      color: "rgba(255,255,255,0.5)",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.12em",
                      marginTop: "4px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "3px",
                    }}>
                      {item.label}
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                    </div>
                  </Link>
                  {!isMobile && i < arr.length - 1 && (
                    <span style={{ fontSize: "1.2rem", color: "rgba(255,255,255,0.1)", fontWeight: 300 }}>&middot;</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </ParticleHero>

        {/* ═══ 2. TWO-COLUMN: Volumes + Featured ═══ */}
        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "1fr 340px",
          gap: isMobile ? "24px" : "24px",
          marginTop: "12px",
          marginBottom: "24px",
          alignItems: "start",
        }}>
          {/* Left: Volume rows */}
          <div>
            <div style={{
              fontSize: "0.65rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.16em",
              color: "rgba(220,47,75,0.6)",
              marginBottom: "14px",
              paddingLeft: "4px",
            }}>
              Start Reading
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
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

          {/* Right: Featured Person + Nugget */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Featured Person */}
            {spotlightChar && (
              <Link href={`/people?person=${spotlightChar.id}`} onClick={() => analytics.homeSpotlightClick(spotlightChar.id)} style={{
                display: "block",
                textDecoration: "none",
                background: "rgba(255,255,255,0.02)",
                border: `1px solid ${getCharColor(spotlightChar)}25`,
                borderRadius: "14px",
                overflow: "hidden",
                transition: "all 0.3s ease",
                boxShadow: `0 0 0 1px ${getCharColor(spotlightChar)}10`,
              }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = `${getCharColor(spotlightChar)}40`;
                  e.currentTarget.style.boxShadow = `0 8px 30px rgba(0,0,0,0.3)`;
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
                  e.currentTarget.style.boxShadow = "none";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                {/* Large portrait */}
                <div style={{ width: "100%", aspectRatio: "16/10", overflow: "hidden", position: "relative" }}>
                  <img src={spotlightChar.portraitUrl} alt={spotlightChar.name} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 20%" }} />
                  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 60%)" }} />
                  {/* Glow line at bottom of portrait */}
                  <div style={{ position: "absolute", bottom: 0, left: "16px", right: "16px", height: "2px", background: getCharColor(spotlightChar), boxShadow: `0 0 12px ${getCharColor(spotlightChar)}80, 0 0 4px ${getCharColor(spotlightChar)}`, borderRadius: "1px" }} />
                  <div style={{ position: "absolute", bottom: "12px", left: "16px", right: "16px" }}>
                    <div style={{ fontSize: "0.5rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.14em", color: getCharColor(spotlightChar), marginBottom: "3px", textShadow: `0 0 12px ${getCharColor(spotlightChar)}60` }}>Spotlight</div>
                    <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "#fff" }}>{spotlightChar.name}</div>
                    <div style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.6)" }}>{spotlightChar.roles.slice(0, 3).join(" · ")}</div>
                  </div>
                </div>
              </Link>
            )}
            {/* Additional people row — separate from the spotlight link */}
            {featuredChars.length > 1 && (
              <div style={{ padding: "10px 16px", display: "flex", gap: "8px", alignItems: "center" }}>
                {featuredChars.filter(c => c.id !== spotlightChar?.id).slice(0, 3).map((c) => (
                  <Link key={c.id} href={`/people?person=${c.id}`} style={{
                    width: "36px", height: "36px", borderRadius: "50%", overflow: "hidden",
                    border: `2px solid ${getCharColor(c)}40`, transition: "transform 0.2s, border-color 0.2s",
                    flexShrink: 0,
                  }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.1)"; e.currentTarget.style.borderColor = getCharColor(c); }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.borderColor = `${getCharColor(c)}40`; }}
                  >
                    <img src={c.portraitUrl} alt={c.name} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 20%" }} loading="lazy" />
                  </Link>
                ))}
                <Link href="/people" style={{
                  fontSize: "0.62rem", fontWeight: 600, color: "rgba(255,255,255,0.55)",
                  textDecoration: "none", marginLeft: "4px", display: "flex", alignItems: "center", gap: "3px",
                  transition: "color 0.2s",
                }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.85)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.55)"; }}
                >
                  +{(genderCounts.male + genderCounts.female) - 4} more
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                </Link>
              </div>
            )}

          </div>
        </div>

        {/* ═══ 3. ALL TOOLS — Unified Grid ═══ */}
        <div style={{ marginBottom: "32px" }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)",
            gap: "10px",
          }}>
            {ALL_TOOLS.map((tool) => (
              <Link
                key={tool.href}
                href={tool.href}
                onClick={() => analytics.homeToolCardClick(tool.name)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  textDecoration: "none",
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderTop: `2px solid ${tool.accent}60`,
                  borderRadius: "10px",
                  padding: isMobile ? "14px 12px" : "16px",
                  transition: "all 0.25s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                  e.currentTarget.style.borderTopColor = tool.accent;
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = `0 6px 20px rgba(0,0,0,0.25), 0 0 12px ${tool.accent}10`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.02)";
                  e.currentTarget.style.borderTopColor = `${tool.accent}60`;
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                  <div style={{
                    width: "30px",
                    height: "30px",
                    borderRadius: "8px",
                    background: `${tool.accent}20`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    <img src={tool.icon} alt="" style={{ width: "14px", height: "14px", filter: "invert(1) brightness(0.85)" }} />
                  </div>
                  <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text)" }}>{tool.name}</div>
                </div>
                <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", lineHeight: 1.5 }}>{tool.description}</div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
