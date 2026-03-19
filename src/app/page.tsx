"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import { VOLUME_COLORS } from "@/lib/constants";

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

const TOOLS = [
  {
    href: "/search",
    svgIcon: "/search.svg",
    name: "Word Search",
    description: "Search any word or phrase and see its frequency across all 87 books with charts and stats.",
    color: "#3B82F6",
  },
  {
    href: "/narrative-arc",
    svgIcon: "/narrative-arc.svg",
    name: "Narrative Arc",
    description: "Compare up to 6 words across volumes to see how themes develop through the scriptures.",
    color: "#8b5cf6",
  },
  {
    href: "/heatmap",
    svgIcon: "/heatmap.svg",
    name: "Theme Heatmap",
    description: "Visualize word frequency by chapter across every book with color-coded heatmaps.",
    color: "#ef4444",
  },
  {
    href: "/wordcloud",
    svgIcon: "/word-cloud.svg",
    name: "Word Cloud",
    description: "See the most frequent words in any book, chapter, or volume as an interactive cloud.",
    color: "#F57B20",
  },
  {
    href: "/read",
    svgIcon: "/scriptures.svg",
    name: "Read Scriptures",
    description: "Read with chapter insights, key themes, verse interactions, and cross-tool links built in.",
    color: "#10b981",
  },
  {
    href: "/bookmarks",
    svgIcon: "/favorite.svg",
    name: "Bookmarks",
    description: "Your saved verses from reading sessions. Tap any verse while reading to bookmark it.",
    color: "#F5A623",
  },
];

const DISCOVER_TOOLS = [
  {
    href: "/sentiment",
    svgIcon: "/sentiment.svg",
    name: "Sentiment Arc",
    description: "See how emotional tone — promises, warnings, praise, lament — shifts across entire books.",
    color: "#10b981",
  },
  {
    href: "/parallel",
    svgIcon: "/parallel.svg",
    name: "Parallel Passages",
    description: "Compare side-by-side texts that appear in multiple books, with differences highlighted.",
    color: "#3B82F6",
  },
  {
    href: "/chiasmus",
    svgIcon: "/chiasmus.svg",
    name: "Chiasmus Detector",
    description: "Find mirror-pattern literary structures (ABBA) hidden in chapters across all volumes.",
    color: "#8b5cf6",
  },
  {
    href: "/topics",
    svgIcon: "/topics.svg",
    name: "Topic Map",
    description: "Pick any chapter and discover thematically similar chapters across all of scripture.",
    color: "#06b6d4",
  },
  {
    href: "/timeline",
    svgIcon: "/timeline.svg",
    name: "Timeline",
    description: "See when scripture events happened and how books overlap across thousands of years.",
    color: "#F5A623",
  },
];

export default function HomePage() {
  const isMobile = useIsMobile();
  const [randomVerse, setRandomVerse] = useState<RandomVerse | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Fetch random verse
  useEffect(() => {
    fetch("/api/random-verse")
      .then((r) => r.json())
      .then((data) => setRandomVerse(data))
      .catch(() => {});
  }, []);

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem("recent-searches");
      if (raw) {
        const parsed = JSON.parse(raw);
        setRecentSearches(
          Array.isArray(parsed)
            ? parsed.map((s: { word?: string } | string) => (typeof s === "string" ? s : s.word || "")).filter(Boolean).slice(0, 8)
            : []
        );
      }
    } catch {}
  }, []);

  const volColor = randomVerse ? VOLUME_COLORS[randomVerse.volumeAbbrev] || "#3B82F6" : "#3B82F6";
  const isDC = randomVerse?.volumeAbbrev === "D&C";
  const verseRef = randomVerse
    ? isDC
      ? `D&C ${randomVerse.chapter}:${randomVerse.verse}`
      : `${randomVerse.bookName} ${randomVerse.chapter}:${randomVerse.verse}`
    : "";

  return (
    <div className="page-container">
      <Header showSubtitle />

      {/* Hero */}
      <div style={{ textAlign: "center", marginBottom: isMobile ? "32px" : "48px" }}>
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
            maxWidth: "540px",
            margin: "0 auto",
            lineHeight: 1.6,
          }}
        >
          Interactive analysis tools, visualizations, and a beautiful reading experience
          for the Old Testament, New Testament, Book of Mormon, D&C, and Pearl of Great Price.
        </p>
      </div>

      {/* Tool Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
          gap: isMobile ? "12px" : "16px",
          marginBottom: "40px",
        }}
      >
        {TOOLS.map((tool) => (
          <Link
            key={tool.href}
            href={tool.href}
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "12px",
              padding: isMobile ? "18px" : "24px",
              textDecoration: "none",
              transition: "all 0.2s ease",
              position: "relative",
              overflow: "hidden",
              display: "block",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = tool.color;
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = `0 8px 24px ${tool.color}15`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            {/* Top color accent */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: "2px",
                background: tool.color,
              }}
            />
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
              <img
                src={tool.svgIcon}
                alt=""
                style={{
                  width: "22px",
                  height: "22px",
                  filter: "invert(1) brightness(0.85)",
                }}
              />
              <span
                style={{
                  fontSize: "1rem",
                  fontWeight: 700,
                  color: "var(--text)",
                }}
              >
                {tool.name}
              </span>
            </div>
            <p
              style={{
                fontSize: "0.82rem",
                color: "var(--text-muted)",
                lineHeight: 1.5,
                margin: 0,
              }}
            >
              {tool.description}
            </p>
          </Link>
        ))}
      </div>

      {/* Discover Tools */}
      <div style={{ marginBottom: "32px" }}>
        <div
          style={{
            fontSize: "0.65rem",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            color: "var(--text-muted)",
            marginBottom: "12px",
          }}
        >
          Discovery Tools
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
            gap: isMobile ? "12px" : "16px",
          }}
        >
          {DISCOVER_TOOLS.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "12px",
                padding: isMobile ? "18px" : "24px",
                textDecoration: "none",
                transition: "all 0.2s ease",
                position: "relative",
                overflow: "hidden",
                display: "block",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = tool.color;
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = `0 8px 24px ${tool.color}15`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border)";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: "2px",
                  background: tool.color,
                }}
              />
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                <img
                  src={tool.svgIcon}
                  alt=""
                  style={{
                    width: "22px",
                    height: "22px",
                    filter: "invert(1) brightness(0.85)",
                  }}
                />
                <span
                  style={{
                    fontSize: "1rem",
                    fontWeight: 700,
                    color: "var(--text)",
                  }}
                >
                  {tool.name}
                </span>
              </div>
              <p
                style={{
                  fontSize: "0.82rem",
                  color: "var(--text-muted)",
                  lineHeight: 1.5,
                  margin: 0,
                }}
              >
                {tool.description}
              </p>
            </Link>
          ))}
        </div>
      </div>

      {/* Random Verse */}
      {randomVerse && (
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "12px",
            padding: isMobile ? "20px" : "28px",
            marginBottom: "32px",
            borderLeft: `3px solid ${volColor}`,
          }}
        >
          <div
            style={{
              fontSize: "0.65rem",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              color: "var(--text-muted)",
              marginBottom: "12px",
            }}
          >
            Discover a Verse
          </div>
          <div
            style={{
              fontSize: isMobile ? "0.95rem" : "1.05rem",
              color: "var(--text)",
              lineHeight: 1.8,
              fontStyle: "italic",
              marginBottom: "12px",
            }}
          >
            {randomVerse.text.length > 300
              ? randomVerse.text.substring(0, 300) + "..."
              : randomVerse.text}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 600, color: volColor }}>
              — {verseRef}
            </span>
            <a
              href={`/read?bookId=${randomVerse.bookId}&chapter=${randomVerse.chapter}`}
              style={{
                fontSize: "0.78rem",
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

      {/* Recent Searches */}
      {recentSearches.length > 0 && (
        <div style={{ marginBottom: "32px" }}>
          <div
            style={{
              fontSize: "0.65rem",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              color: "var(--text-muted)",
              marginBottom: "10px",
            }}
          >
            Recent Searches
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {recentSearches.map((word) => (
              <a
                key={word}
                href={`/search?word=${encodeURIComponent(word)}`}
                style={{
                  display: "inline-block",
                  padding: "6px 14px",
                  borderRadius: "20px",
                  background: "rgba(255, 255, 255, 0.06)",
                  border: "1px solid var(--border)",
                  color: "var(--text-secondary)",
                  fontSize: "0.82rem",
                  fontWeight: 500,
                  textDecoration: "none",
                  transition: "all 0.15s",
                }}
              >
                {word}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Stats footer */}
      <div
        style={{
          textAlign: "center",
          padding: "24px 0 48px",
          fontSize: "0.78rem",
          color: "var(--text-muted)",
          borderTop: "1px solid var(--border)",
        }}
      >
        <strong style={{ color: "var(--text-secondary)" }}>41,995</strong> verses across{" "}
        <strong style={{ color: "var(--text-secondary)" }}>87</strong> books &bull;{" "}
        <strong style={{ color: "var(--text-secondary)" }}>5</strong> volumes &bull; Scripture Explorer
      </div>
    </div>
  );
}
