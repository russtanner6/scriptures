"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import { VOLUME_COLORS } from "@/lib/constants";
import VolumeTooltip from "@/components/VolumeTooltip";
import { usePreferencesContext } from "@/components/PreferencesProvider";
import { useIsMobile } from "@/lib/useIsMobile";
import type { ScriptureCharacter } from "@/lib/types";

interface RandomVerse {
  verse: number;
  chapter: number;
  text: string;
  bookId: number;
  bookName: string;
  volumeAbbrev: string;
}

const VOLUME_ORDER = ["OT", "NT", "BoM", "D&C", "PoGP"];

const PRIMARY_TOOLS = [
  {
    href: "/read",
    svgIcon: "/scriptures.svg",
    name: "Scriptures",
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
    description: "750+ named individuals with bios, family trees, and portraits.",
  },
  {
    href: "/locations",
    svgIcon: "/locations.svg",
    name: "Places",
    description: "333 scripture locations with maps, mention stats, and volume coverage.",
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
  const { isVolumeVisible } = usePreferencesContext();
  const [randomVerse, setRandomVerse] = useState<RandomVerse | null>(null);
  const [featuredChars, setFeaturedChars] = useState<ScriptureCharacter[]>([]);
  const [spotlightChar, setSpotlightChar] = useState<ScriptureCharacter | null>(null);

  useEffect(() => {
    fetch("/api/random-verse")
      .then((r) => r.json())
      .then((data) => {
        if (data && data.volumeAbbrev && !isVolumeVisible(data.volumeAbbrev)) {
          setRandomVerse(null);
        } else {
          setRandomVerse(data);
        }
      })
      .catch(() => {});
  }, [isVolumeVisible]);

  useEffect(() => {
    fetch("/api/characters")
      .then((r) => r.json())
      .then((data) => {
        const chars: ScriptureCharacter[] = data.characters || [];
        const visibleChars = chars.filter((c) =>
          c.volumes.some((v: string) => isVolumeVisible(v))
        );
        const withPortraits = visibleChars.filter((c) => c.portraitUrl);
        const shuffled = withPortraits.sort(() => Math.random() - 0.5);
        setSpotlightChar(shuffled[0] || null);
        setFeaturedChars(shuffled.slice(1, 7));
      })
      .catch(() => {});
  }, [isVolumeVisible]);

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
        marginBottom: isMobile ? "28px" : "48px",
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

      {/* ═══ TWO-COLUMN LAYOUT (desktop) / STACKED (mobile) ═══ */}
      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "1fr 340px",
        gap: isMobile ? "28px" : "28px",
        marginBottom: isMobile ? "36px" : "52px",
        alignItems: "start",
      }}>
        {/* ── LEFT COLUMN: Tool Cards ── */}
        <div>
          <div style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(3, 1fr)",
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
                  padding: isMobile ? "16px 14px" : "18px 16px",
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
                  width: "34px",
                  height: "34px",
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
                      width: "17px",
                      height: "17px",
                      filter: "invert(1) brightness(0.7)",
                    }}
                  />
                </div>
                <div>
                  <div style={{
                    fontSize: "0.82rem",
                    fontWeight: 700,
                    color: "var(--text)",
                    marginBottom: "4px",
                  }}>
                    {tool.name}
                  </div>
                  <div style={{
                    fontSize: "0.7rem",
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

        {/* ── RIGHT COLUMN: Spotlight + Random Verse ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Spotlight Character */}
          {spotlightChar && (
            <Link
              href="/characters"
              style={{
                display: "block",
                textDecoration: "none",
              }}
            >
              <div
                style={{
                  borderRadius: "16px",
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
                  aspectRatio: "4 / 3",
                  overflow: "hidden",
                  position: "relative",
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
                  {/* Gradient overlay at bottom of image */}
                  <div style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: "60px",
                    background: "linear-gradient(transparent, var(--surface))",
                  }} />
                </div>
                {/* Info */}
                <div style={{ padding: "14px 18px 18px" }}>
                  <div style={{
                    fontSize: "0.55rem",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.14em",
                    color: getCharColor(spotlightChar),
                    marginBottom: "6px",
                  }}>
                    Spotlight
                  </div>
                  <div style={{
                    fontSize: "1.3rem",
                    fontWeight: 700,
                    color: "var(--text)",
                    marginBottom: "4px",
                    letterSpacing: "-0.02em",
                  }}>
                    {spotlightChar.name}
                  </div>
                  <div style={{
                    fontSize: "0.75rem",
                    color: "var(--text-muted)",
                    fontWeight: 500,
                    marginBottom: "10px",
                  }}>
                    {spotlightChar.roles.slice(0, 3).join(" · ")}
                  </div>
                  <p style={{
                    fontSize: "0.82rem",
                    color: "rgba(255,255,255,0.7)",
                    lineHeight: 1.6,
                    margin: "0 0 12px",
                    display: "-webkit-box",
                    WebkitLineClamp: 3,
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
                          fontSize: "0.55rem",
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

          {/* More People row */}
          {featuredChars.length > 0 && (
            <div style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "14px",
              padding: "14px 16px",
            }}>
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "10px",
              }}>
                <div style={{
                  fontSize: "0.55rem",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                  color: "var(--text-muted)",
                }}>
                  More People
                </div>
                <Link
                  href="/characters"
                  style={{
                    fontSize: "0.68rem",
                    fontWeight: 500,
                    color: "var(--accent)",
                    textDecoration: "underline",
                    textUnderlineOffset: "3px",
                  }}
                >
                  View all 757 →
                </Link>
              </div>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(6, 1fr)",
                gap: "6px",
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
                      borderRadius: "10px",
                      overflow: "hidden",
                      marginBottom: "4px",
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
                      fontSize: "0.6rem",
                      fontWeight: 600,
                      color: "var(--text-secondary)",
                      lineHeight: 1.2,
                    }}>
                      {c.name}
                    </div>
                  </Link>
                ))}
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
                padding: "16px 18px",
                borderLeft: `3px solid ${volColor}`,
              }}
            >
              <div
                style={{
                  fontSize: "0.55rem",
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
                  marginBottom: "12px",
                }}
              >
                &ldquo;{randomVerse.text.length > 200
                  ? randomVerse.text.substring(0, 200) + "..."
                  : randomVerse.text}&rdquo;
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "0.78rem", fontWeight: 600, color: volColor }}>
                  — {verseRef}
                </span>
                <a
                  href={`/read?bookId=${randomVerse.bookId}&chapter=${randomVerse.chapter}&verse=${randomVerse.verse}`}
                  style={{
                    fontSize: "0.72rem",
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
    </div>
  );
}
