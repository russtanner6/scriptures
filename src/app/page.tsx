"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import { VOLUME_COLORS } from "@/lib/constants";
import type { ScriptureCharacter } from "@/lib/types";

interface RandomVerse {
  verse: number;
  chapter: number;
  text: string;
  bookId: number;
  bookName: string;
  volumeAbbrev: string;
}

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

const ALL_TOOLS = [
  {
    href: "/read",
    svgIcon: "/scriptures.svg",
    name: "Read Scriptures",
    description: "Beautiful reading experience with insights, themes, and verse interactions.",
  },
  {
    href: "/search",
    svgIcon: "/search.svg",
    name: "Word Search",
    description: "Search any word and see its frequency across all 87 books.",
  },
  {
    href: "/narrative-arc",
    svgIcon: "/narrative-arc.svg",
    name: "Narrative Arc",
    description: "Compare up to 6 words across volumes to trace themes.",
  },
  {
    href: "/heatmap",
    svgIcon: "/heatmap.svg",
    name: "Theme Heatmap",
    description: "Word frequency by chapter with color-coded heatmaps.",
  },
  {
    href: "/wordcloud",
    svgIcon: "/word-cloud.svg",
    name: "Word Cloud",
    description: "Most frequent words in any book, chapter, or volume.",
  },
  {
    href: "/sentiment",
    svgIcon: "/sentiment.svg",
    name: "Sentiment Arc",
    description: "How emotional tone shifts across entire books.",
  },
  {
    href: "/parallel",
    svgIcon: "/parallel.svg",
    name: "Parallel Passages",
    description: "Side-by-side texts with differences highlighted.",
  },
  {
    href: "/chiasmus",
    svgIcon: "/chiasmus.svg",
    name: "Chiasmus Detector",
    description: "Find hidden ABBA mirror patterns in chapters.",
  },
  {
    href: "/topics",
    svgIcon: "/topics.svg",
    name: "Topic Map",
    description: "Discover thematically similar chapters.",
  },
  {
    href: "/characters",
    svgIcon: "/people.svg",
    name: "People",
    description: "Every named person with bios and family connections.",
  },
  {
    href: "/bookmarks",
    svgIcon: "/favorite.svg",
    name: "Bookmarks",
    description: "Your saved verses from reading sessions.",
  },
];

export default function HomePage() {
  const isMobile = useIsMobile();
  const [randomVerse, setRandomVerse] = useState<RandomVerse | null>(null);
  const [featuredChars, setFeaturedChars] = useState<ScriptureCharacter[]>([]);

  // Fetch random verse
  useEffect(() => {
    fetch("/api/random-verse")
      .then((r) => r.json())
      .then((data) => setRandomVerse(data))
      .catch(() => {});
  }, []);

  // Fetch featured characters (random selection with portraits)
  useEffect(() => {
    fetch("/api/characters")
      .then((r) => r.json())
      .then((data) => {
        const chars: ScriptureCharacter[] = data.characters || [];
        const withPortraits = chars.filter((c) => c.portraitUrl);
        // Shuffle and pick 3
        const shuffled = withPortraits.sort(() => Math.random() - 0.5);
        setFeaturedChars(shuffled.slice(0, 3));
      })
      .catch(() => {});
  }, []);


  const volColor = randomVerse ? VOLUME_COLORS[randomVerse.volumeAbbrev] || "#3B82F6" : "#3B82F6";
  const isDC = randomVerse?.volumeAbbrev === "D&C";
  const verseRef = randomVerse
    ? isDC
      ? `D&C ${randomVerse.chapter}:${randomVerse.verse}`
      : `${randomVerse.bookName} ${randomVerse.chapter}:${randomVerse.verse}`
    : "";

  const VOLUME_ORDER = ["OT", "NT", "BoM", "D&C", "PoGP"];
  const getCharColor = (c: ScriptureCharacter) => {
    for (const v of VOLUME_ORDER) {
      if (c.volumes.includes(v)) return VOLUME_COLORS[v] || "#8b5cf6";
    }
    return "#8b5cf6";
  };

  return (
    <div className="page-container">
      <Header variant="home" />

      {/* Hero */}
      <div style={{ textAlign: "center", marginTop: isMobile ? "0" : "32px", marginBottom: isMobile ? "28px" : "44px" }}>
        <h2
          style={{
            fontSize: isMobile ? "1.6rem" : "2.2rem",
            fontWeight: 800,
            color: "var(--text)",
            letterSpacing: "-0.02em",
            marginBottom: "12px",
            lineHeight: 1.2,
          }}
        >
          Explore the Scriptures
          <br />
          <span
            style={{
              background: "linear-gradient(135deg, #DC2F4B, #E8532C, #F57B20, #F5A623, #F5C829)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Like Never Before
          </span>
        </h2>
        <p
          style={{
            fontSize: isMobile ? "0.88rem" : "1rem",
            color: "var(--text-secondary)",
            maxWidth: "680px",
            margin: "0 auto",
            lineHeight: 1.6,
          }}
        >
          Search, analyze, and read 41,995 verses across all five volumes of scripture.
        </p>
      </div>

      {/* Main content — two columns on desktop */}
      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "1fr 340px",
        gap: isMobile ? "28px" : "32px",
        marginBottom: "40px",
        alignItems: "start",
      }}>
        {/* Left column — Tools list */}
        <div>
          <div style={{
            display: "flex",
            flexDirection: "column",
            gap: "2px",
          }}>
            {ALL_TOOLS.map((tool) => (
              <Link
                key={tool.href}
                href={tool.href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  padding: "14px 16px",
                  borderRadius: "12px",
                  textDecoration: "none",
                  transition: "all 0.15s ease",
                  border: "1px solid transparent",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--surface)";
                  e.currentTarget.style.borderColor = "var(--border)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.borderColor = "transparent";
                }}
              >
                <div style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "10px",
                  background: "rgba(255,255,255,0.04)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}>
                  <img
                    src={tool.svgIcon}
                    alt=""
                    style={{
                      width: "20px",
                      height: "20px",
                      filter: "invert(1) brightness(0.8)",
                    }}
                  />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: "0.92rem",
                    fontWeight: 600,
                    color: "var(--text)",
                    marginBottom: "2px",
                  }}>
                    {tool.name}
                  </div>
                  <div style={{
                    fontSize: "0.78rem",
                    color: "var(--text-muted)",
                    lineHeight: 1.4,
                  }}>
                    {tool.description}
                  </div>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: 0.4 }}>
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </Link>
            ))}
          </div>
        </div>

        {/* Right column — Featured Characters + Random Verse */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: "20px",
          position: isMobile ? "static" : "sticky",
          top: "24px",
        }}>
          {/* Featured Characters */}
          {featuredChars.length > 0 && (
            <div>
              <div style={{
                fontSize: "0.62rem",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: "var(--text-muted)",
                marginBottom: "12px",
              }}>
                People of the Scriptures
              </div>
              <div style={{
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}>
                {featuredChars.map((c) => {
                  const color = getCharColor(c);
                  return (
                    <Link
                      key={c.id}
                      href="/characters"
                      style={{
                        display: "flex",
                        gap: "14px",
                        alignItems: "center",
                        padding: "12px",
                        borderRadius: "14px",
                        background: "var(--surface)",
                        border: "1px solid var(--border)",
                        textDecoration: "none",
                        transition: "all 0.2s",
                        overflow: "hidden",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = `${color}60`;
                        e.currentTarget.style.transform = "translateY(-1px)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "var(--border)";
                        e.currentTarget.style.transform = "translateY(0)";
                      }}
                    >
                      {/* Portrait */}
                      <div style={{
                        width: "64px",
                        height: "80px",
                        borderRadius: "10px",
                        overflow: "hidden",
                        flexShrink: 0,
                      }}>
                        <img
                          src={c.portraitUrl}
                          alt={c.name}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                          loading="lazy"
                        />
                      </div>
                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: "0.88rem",
                          fontWeight: 700,
                          color: "var(--text)",
                          marginBottom: "3px",
                        }}>
                          {c.name}
                        </div>
                        <div style={{
                          fontSize: "0.72rem",
                          color: "var(--text-muted)",
                          lineHeight: 1.4,
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}>
                          {c.bio}
                        </div>
                        <div style={{ display: "flex", gap: "3px", marginTop: "5px" }}>
                          {c.volumes.map((v) => (
                            <span
                              key={v}
                              style={{
                                fontSize: "0.52rem",
                                fontWeight: 700,
                                color: VOLUME_COLORS[v] || "#888",
                                background: `${VOLUME_COLORS[v] || "#888"}15`,
                                padding: "1px 4px",
                                borderRadius: "3px",
                              }}
                            >
                              {v}
                            </span>
                          ))}
                        </div>
                      </div>
                    </Link>
                  );
                })}
                <Link
                  href="/characters"
                  style={{
                    fontSize: "0.78rem",
                    fontWeight: 500,
                    color: "var(--accent)",
                    textDecoration: "underline",
                    textUnderlineOffset: "3px",
                    textAlign: "center",
                    padding: "4px 0",
                  }}
                >
                  View all {">"}
                </Link>
              </div>
            </div>
          )}

          {/* Random Verse */}
          {randomVerse && (
            <div
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "14px",
                padding: "18px",
                borderLeft: `3px solid ${volColor}`,
              }}
            >
              <div
                style={{
                  fontSize: "0.62rem",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                  color: "var(--text-muted)",
                  marginBottom: "10px",
                }}
              >
                Discover a Verse
              </div>
              <div
                style={{
                  fontSize: "0.88rem",
                  color: "var(--text-secondary)",
                  lineHeight: 1.7,
                  fontStyle: "italic",
                  marginBottom: "10px",
                }}
              >
                {randomVerse.text.length > 200
                  ? randomVerse.text.substring(0, 200) + "..."
                  : randomVerse.text}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "0.78rem", fontWeight: 600, color: volColor }}>
                  — {verseRef}
                </span>
                <a
                  href={`/read?bookId=${randomVerse.bookId}&chapter=${randomVerse.chapter}`}
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: 500,
                    color: "var(--accent)",
                    textDecoration: "underline",
                    textUnderlineOffset: "3px",
                  }}
                >
                  Read →
                </a>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
