"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import { VOLUME_COLORS } from "@/lib/constants";
import VolumeTooltip from "@/components/VolumeTooltip";
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

const VOLUME_ORDER = ["OT", "NT", "BoM", "D&C", "PoGP"];

const PRIMARY_TOOLS = [
  {
    href: "/read",
    svgIcon: "/scriptures.svg",
    name: "Read",
    description: "Beautiful reading with insights, themes, and verse interactions.",
  },
  {
    href: "/search",
    svgIcon: "/search.svg",
    name: "Word Search",
    description: "Frequency analysis across all 87 books with charts and stats.",
  },
  {
    href: "/narrative-arc",
    svgIcon: "/narrative-arc.svg",
    name: "Narrative Arc",
    description: "Trace up to 6 themes across all volumes simultaneously.",
  },
  {
    href: "/heatmap",
    svgIcon: "/heatmap.svg",
    name: "Heatmap",
    description: "Word frequency by chapter as color-coded heatmaps.",
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
    description: "Emotional tone across books — praise, warning, lament, promise.",
  },
  {
    href: "/characters",
    svgIcon: "/people.svg",
    name: "People",
    description: "302 named individuals with bios, family trees, and portraits.",
  },
  {
    href: "/parallel",
    svgIcon: "/parallel.svg",
    name: "Parallel Passages",
    description: "Side-by-side texts with word-level differences highlighted.",
  },
  {
    href: "/chiasmus",
    svgIcon: "/chiasmus.svg",
    name: "Chiasmus",
    description: "Discover hidden ABBA mirror patterns in scripture chapters.",
  },
  {
    href: "/topics",
    svgIcon: "/topics.svg",
    name: "Topic Map",
    description: "Find thematically similar chapters across all scripture.",
  },
];

export default function HomePage() {
  const isMobile = useIsMobile();
  const [randomVerse, setRandomVerse] = useState<RandomVerse | null>(null);
  const [featuredChars, setFeaturedChars] = useState<ScriptureCharacter[]>([]);
  const [spotlightChar, setSpotlightChar] = useState<ScriptureCharacter | null>(null);

  useEffect(() => {
    fetch("/api/random-verse")
      .then((r) => r.json())
      .then((data) => setRandomVerse(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/characters")
      .then((r) => r.json())
      .then((data) => {
        const chars: ScriptureCharacter[] = data.characters || [];
        const withPortraits = chars.filter((c) => c.portraitUrl);
        const shuffled = withPortraits.sort(() => Math.random() - 0.5);
        setSpotlightChar(shuffled[0] || null);
        setFeaturedChars(shuffled.slice(1, 7));
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
      <div style={{
        textAlign: "center",
        marginTop: isMobile ? "8px" : "40px",
        marginBottom: isMobile ? "36px" : "56px",
      }}>
        <h2
          style={{
            fontSize: isMobile ? "1.6rem" : "2.4rem",
            fontWeight: 800,
            color: "var(--text)",
            letterSpacing: "-0.025em",
            marginBottom: "14px",
            lineHeight: 1.15,
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
            fontSize: isMobile ? "0.9rem" : "1.05rem",
            color: "var(--text-secondary)",
            maxWidth: "680px",
            margin: "0 auto",
            lineHeight: 1.6,
          }}
        >
          Search, analyze, and read 41,995 verses across all five volumes of scripture.
        </p>
      </div>

      {/* Character Spotlight — full-width visual banner */}
      {spotlightChar && (
        <Link
          href="/characters"
          style={{
            display: "block",
            textDecoration: "none",
            marginBottom: isMobile ? "36px" : "52px",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "280px 1fr",
              borderRadius: "18px",
              overflow: "hidden",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              transition: "all 0.3s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = `${getCharColor(spotlightChar)}50`;
              e.currentTarget.style.boxShadow = `0 12px 40px ${getCharColor(spotlightChar)}15`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            {/* Portrait */}
            <div style={{
              aspectRatio: isMobile ? "16 / 9" : "3 / 4",
              overflow: "hidden",
            }}>
              <img
                src={spotlightChar.portraitUrl}
                alt={spotlightChar.name}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  objectPosition: "center 20%",
                }}
              />
            </div>
            {/* Info */}
            <div style={{
              padding: isMobile ? "20px" : "32px 36px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}>
              <div style={{
                fontSize: "0.6rem",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.14em",
                color: getCharColor(spotlightChar),
                marginBottom: "10px",
              }}>
                Featured Person
              </div>
              <div style={{
                fontSize: isMobile ? "1.4rem" : "1.8rem",
                fontWeight: 700,
                color: "var(--text)",
                marginBottom: "8px",
                letterSpacing: "-0.02em",
              }}>
                {spotlightChar.name}
              </div>
              <div style={{
                fontSize: "0.82rem",
                color: "var(--text-muted)",
                fontWeight: 500,
                marginBottom: "14px",
              }}>
                {spotlightChar.roles.slice(0, 3).join(" · ")}
              </div>
              <p style={{
                fontSize: "0.9rem",
                color: "rgba(255,255,255,0.8)",
                lineHeight: 1.7,
                margin: "0 0 16px",
                display: "-webkit-box",
                WebkitLineClamp: isMobile ? 3 : 4,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}>
                {spotlightChar.bio}
              </p>
              <div style={{ display: "flex", gap: "5px" }}>
                {spotlightChar.volumes.map((v) => (
                  <VolumeTooltip
                    key={v}
                    abbrev={v}
                    style={{
                      fontSize: "0.58rem",
                      fontWeight: 700,
                      color: VOLUME_COLORS[v] || "#888",
                      background: `${VOLUME_COLORS[v] || "#888"}15`,
                      padding: "2px 7px",
                      borderRadius: "4px",
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </Link>
      )}

      {/* Tools Grid */}
      <div style={{ marginBottom: isMobile ? "36px" : "52px" }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(5, 1fr)",
          gap: isMobile ? "10px" : "12px",
        }}>
          {PRIMARY_TOOLS.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "14px",
                padding: isMobile ? "16px 14px" : "20px 18px",
                textDecoration: "none",
                transition: "all 0.2s ease",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
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
              <div style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "rgba(255,255,255,0.04)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}>
                <img
                  src={tool.svgIcon}
                  alt=""
                  style={{
                    width: "18px",
                    height: "18px",
                    filter: "invert(1) brightness(0.7)",
                  }}
                />
              </div>
              <div>
                <div style={{
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  color: "var(--text)",
                  marginBottom: "4px",
                }}>
                  {tool.name}
                </div>
                <div style={{
                  fontSize: "0.72rem",
                  color: "var(--text-muted)",
                  lineHeight: 1.45,
                }}>
                  {tool.description}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Bottom section — Character portraits row + Random verse */}
      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
        gap: isMobile ? "28px" : "24px",
        marginBottom: "20px",
      }}>
        {/* More characters */}
        {featuredChars.length > 0 && (
          <div>
            <div style={{
              fontSize: "0.6rem",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              color: "var(--text-muted)",
              marginBottom: "14px",
            }}>
              More People
            </div>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(6, 1fr)",
              gap: "8px",
            }}>
              {featuredChars.map((c) => (
                <Link
                  key={c.id}
                  href="/characters"
                  style={{
                    textDecoration: "none",
                    textAlign: "center",
                    transition: "transform 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  <div style={{
                    width: "100%",
                    aspectRatio: "1",
                    borderRadius: "12px",
                    overflow: "hidden",
                    marginBottom: "6px",
                    border: "1px solid var(--border)",
                  }}>
                    <img
                      src={c.portraitUrl}
                      alt={c.name}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        objectPosition: "center 20%",
                      }}
                      loading="lazy"
                    />
                  </div>
                  <div style={{
                    fontSize: "0.68rem",
                    fontWeight: 600,
                    color: "var(--text-secondary)",
                    lineHeight: 1.2,
                  }}>
                    {c.name}
                  </div>
                </Link>
              ))}
            </div>
            <div style={{ textAlign: "center", marginTop: "12px" }}>
              <Link
                href="/characters"
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 500,
                  color: "var(--accent)",
                  textDecoration: "underline",
                  textUnderlineOffset: "3px",
                }}
              >
                View all 302 people →
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
              padding: isMobile ? "20px" : "24px",
              borderLeft: `3px solid ${volColor}`,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                fontSize: "0.6rem",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: "var(--text-muted)",
                marginBottom: "14px",
              }}
            >
              Discover a Verse
            </div>
            <div
              style={{
                fontSize: isMobile ? "0.92rem" : "1rem",
                color: "var(--text-secondary)",
                lineHeight: 1.8,
                fontStyle: "italic",
                marginBottom: "14px",
              }}
            >
              &ldquo;{randomVerse.text.length > 250
                ? randomVerse.text.substring(0, 250) + "..."
                : randomVerse.text}&rdquo;
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "0.82rem", fontWeight: 600, color: volColor }}>
                — {verseRef}
              </span>
              <a
                href={`/read?bookId=${randomVerse.bookId}&chapter=${randomVerse.chapter}&verse=${randomVerse.verse}`}
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 500,
                  color: "var(--accent)",
                  textDecoration: "underline",
                  textUnderlineOffset: "3px",
                }}
              >
                Read in context →
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
