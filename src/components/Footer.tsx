"use client";

import Link from "next/link";
import { analytics } from "@/lib/analytics";

const TOOL_LINKS = [
  { href: "/search", label: "Word Search" },
  { href: "/narrative-arc", label: "Narrative Arc" },
  { href: "/heatmap", label: "Heatmap" },
  { href: "/wordcloud", label: "Word Cloud" },
  { href: "/sentiment", label: "Sentiment Arc" },
  { href: "/topics", label: "Topic Map" },
];

const DISCOVER_LINKS = [
  { href: "/chiasmus", label: "Chiasmus Detector" },
  { href: "/scriptures", label: "Scripture Reader" },
  { href: "/people", label: "People" },
  { href: "/locations", label: "Places" },
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
        borderTop: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(0, 0, 0, 0.35)",
        marginTop: "auto",
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
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "10px",
            }}
          >
            <img
              src="/logo-full.svg"
              alt=""
              style={{
                height: "24px",
                width: "auto",
                opacity: 0.4,
                filter: "grayscale(100%)",
              }}
            />
            <span style={{
              fontSize: "1rem",
              fontWeight: 700,
              color: "rgba(255,255,255,0.5)",
              letterSpacing: "-0.01em",
            }}>
              Scripture Explorer
            </span>
          </div>
          <p
            style={{
              fontSize: "0.78rem",
              color: "rgba(255,255,255,0.45)",
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
                color: "rgba(255,255,255,0.5)",
                textDecoration: "none",
                transition: "color 0.15s",
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
              color: "rgba(255,255,255,0.4)",
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
                onClick={() => analytics.footerLinkClick(link.label, link.href)}
                style={{
                  fontSize: "0.78rem",
                  color: "rgba(255,255,255,0.55)",
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
              color: "rgba(255,255,255,0.4)",
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
                onClick={() => analytics.footerLinkClick(link.label, link.href)}
                style={{
                  fontSize: "0.78rem",
                  color: "rgba(255,255,255,0.55)",
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
              color: "rgba(255,255,255,0.4)",
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
                onClick={() => analytics.footerLinkClick(link.label, link.href)}
                style={{
                  fontSize: "0.78rem",
                  color: "rgba(255,255,255,0.55)",
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
          borderTop: "1px solid rgba(255,255,255,0.06)",
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
            color: "rgba(255,255,255,0.4)",
            letterSpacing: "0.02em",
          }}
        >
          © {year} Russ Tanner
        </span>
        <span style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.2)", margin: "0 4px" }}>•</span>
        <span
          style={{
            fontSize: "0.72rem",
            color: "rgba(255,255,255,0.4)",
            letterSpacing: "0.02em",
          }}
        >
          <strong style={{ color: "rgba(255,255,255,0.6)" }}>41,995</strong> verses · <strong style={{ color: "rgba(255,255,255,0.6)" }}>87</strong> books · <strong style={{ color: "rgba(255,255,255,0.6)" }}>5</strong> volumes
        </span>
      </div>
    </footer>
  );
}
