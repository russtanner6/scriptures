"use client";

import Link from "next/link";

const TOOL_LINKS = [
  { href: "/search", label: "Word Search" },
  { href: "/narrative-arc", label: "Narrative Arc" },
  { href: "/heatmap", label: "Heatmap" },
  { href: "/wordcloud", label: "Word Cloud" },
  { href: "/sentiment", label: "Sentiment Arc" },
  { href: "/topics", label: "Topic Map" },
];

const DISCOVER_LINKS = [
  { href: "/parallel", label: "Parallel Passages" },
  { href: "/chiasmus", label: "Chiasmus Detector" },
  { href: "/timeline", label: "Timeline" },
  { href: "/read", label: "Scripture Reader" },
  { href: "/bookmarks", label: "Bookmarks" },
];

const RESOURCE_LINKS = [
  { href: "https://www.churchofjesuschrist.org/study/scriptures", label: "LDS Scriptures Online", external: true },
  { href: "https://www.biblegateway.com", label: "Bible Gateway", external: true },
  { href: "https://www.blueletterbible.org", label: "Blue Letter Bible", external: true },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer
      style={{
        borderTop: "1px solid var(--border)",
        background: "rgba(0, 0, 0, 0.2)",
        marginTop: "64px",
      }}
    >
      {/* Main footer content */}
      <div
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
          padding: "48px 24px 32px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "36px 48px",
        }}
      >
        {/* Brand column */}
        <div>
          <div
            style={{
              fontSize: "1.1rem",
              fontWeight: 700,
              color: "var(--text)",
              marginBottom: "10px",
              letterSpacing: "-0.01em",
            }}
          >
            Scripture Explorer
          </div>
          <p
            style={{
              fontSize: "0.78rem",
              color: "var(--text-muted)",
              lineHeight: 1.6,
              marginBottom: "16px",
              maxWidth: "240px",
            }}
          >
            Interactive visualizations and analysis tools for the Old Testament, New Testament, Book of Mormon, D&C, and Pearl of Great Price.
          </p>
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <a
              href="mailto:russ@scripturexplorer.com"
              style={{
                fontSize: "0.75rem",
                color: "var(--accent)",
                textDecoration: "none",
                transition: "opacity 0.15s",
              }}
            >
              Contact
            </a>
            <span style={{ width: "1px", height: "12px", background: "var(--border)" }} />
            <a
              href="https://github.com/russtanner6/scriptures"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: "0.75rem",
                color: "var(--text-muted)",
                textDecoration: "none",
                transition: "opacity 0.15s",
              }}
            >
              GitHub
            </a>
          </div>
        </div>

        {/* Analyze tools */}
        <div>
          <div
            style={{
              fontSize: "0.68rem",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "var(--text-muted)",
              marginBottom: "12px",
            }}
          >
            Analyze
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {TOOL_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  fontSize: "0.78rem",
                  color: "var(--text-secondary)",
                  textDecoration: "none",
                  transition: "color 0.15s",
                }}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Discover tools */}
        <div>
          <div
            style={{
              fontSize: "0.68rem",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "var(--text-muted)",
              marginBottom: "12px",
            }}
          >
            Discover
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {DISCOVER_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  fontSize: "0.78rem",
                  color: "var(--text-secondary)",
                  textDecoration: "none",
                  transition: "color 0.15s",
                }}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Resources */}
        <div>
          <div
            style={{
              fontSize: "0.68rem",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "var(--text-muted)",
              marginBottom: "12px",
            }}
          >
            Resources
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {RESOURCE_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: "0.78rem",
                  color: "var(--text-secondary)",
                  textDecoration: "none",
                  transition: "color 0.15s",
                }}
              >
                {link.label}
                <span style={{ fontSize: "0.65rem", opacity: 0.4, marginLeft: "4px" }}>↗</span>
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div
        style={{
          borderTop: "1px solid var(--border)",
          padding: "20px 24px",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: "8px",
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            fontSize: "0.72rem",
            color: "var(--text-muted)",
            letterSpacing: "0.02em",
          }}
        >
          © {year} Russ Tanner
        </span>
        <span style={{ fontSize: "0.6rem", color: "var(--border)", margin: "0 4px" }}>•</span>
        <span
          style={{
            fontSize: "0.72rem",
            color: "var(--text-muted)",
            letterSpacing: "0.02em",
          }}
        >
          <strong style={{ color: "var(--text-secondary)" }}>41,995</strong> verses · <strong style={{ color: "var(--text-secondary)" }}>87</strong> books · <strong style={{ color: "var(--text-secondary)" }}>5</strong> volumes
        </span>
      </div>
    </footer>
  );
}
