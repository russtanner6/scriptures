"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useBackToClose } from "@/lib/useBackToClose";

/** Mounts only when menu is open — pushes a history entry so back-button closes menu */
function BackButtonHandler({ onClose }: { onClose: () => void }) {
  useBackToClose(onClose);
  return null;
}

interface NavItem {
  href: string;
  label: string;
  svgIcon?: string;
  icon?: string;
  section?: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Home", svgIcon: "/home.svg" },

  // Read — first section after Home
  { href: "/read", label: "Read Scriptures", svgIcon: "/scriptures.svg", section: "Read" },
  { href: "/characters", label: "People", svgIcon: "/people.svg" },
  { href: "/bookmarks", label: "Bookmarks", svgIcon: "/favorite.svg" },

  // Analysis
  { href: "/search", label: "Word Search", svgIcon: "/search.svg", section: "Analyze" },
  { href: "/narrative-arc", label: "Narrative Arc", svgIcon: "/narrative-arc.svg" },
  { href: "/heatmap", label: "Theme Heatmap", svgIcon: "/heatmap.svg" },
  { href: "/wordcloud", label: "Word Cloud", svgIcon: "/word-cloud.svg" },
  { href: "/sentiment", label: "Sentiment Arc", svgIcon: "/sentiment.svg" },

  // Discover
  { href: "/parallel", label: "Parallel Passages", svgIcon: "/parallel.svg", section: "Discover" },
  { href: "/chiasmus", label: "Chiasmus Detector", svgIcon: "/chiasmus.svg" },
  { href: "/topics", label: "Topic Map", svgIcon: "/topics.svg" },
];

export default function NavMenu({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();

  // Build items with section dividers
  const rendered: React.ReactNode[] = [];
  for (let i = 0; i < NAV_ITEMS.length; i++) {
    const item = NAV_ITEMS[i];

    // Section divider
    if (item.section) {
      rendered.push(
        <div
          key={`section-${item.section}`}
          style={{
            fontSize: "0.58rem",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.16em",
            color: "var(--text-muted)",
            padding: "12px 16px 4px",
            marginTop: i > 1 ? "4px" : "0",
          }}
        >
          {item.section}
        </div>
      );
    }

    const isActive = pathname === item.href;
    rendered.push(
      <Link
        key={item.href}
        href={item.href}
        onClick={onClose}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "10px 16px",
          borderRadius: "12px",
          textDecoration: "none",
          fontSize: "0.88rem",
          fontWeight: isActive ? 600 : 500,
          color: isActive ? "#fff" : "var(--text-secondary)",
          background: isActive ? "rgba(255, 255, 255, 0.08)" : "transparent",
          border: isActive ? "1px solid rgba(255, 255, 255, 0.14)" : "1px solid transparent",
          transition: "all 0.15s ease",
        }}
      >
        {item.svgIcon ? (
          <img
            src={item.svgIcon}
            alt=""
            style={{
              width: "18px",
              height: "18px",
              filter: isActive ? "invert(1) brightness(1)" : "invert(1) brightness(0.7)",
              transition: "filter 0.15s",
            }}
          />
        ) : (
          <span style={{ fontSize: "1.1rem" }}>{item.icon}</span>
        )}
        {item.label}
      </Link>
    );
  }

  return (
    <>
      {/* Back-button handler — only mounted when menu is open */}
      {isOpen && <BackButtonHandler onClose={onClose} />}

      {/* Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.6)",
            backdropFilter: "blur(4px)",
            WebkitBackdropFilter: "blur(4px)",
            zIndex: 100,
            transition: "opacity 0.2s",
          }}
        />
      )}

      {/* Slide-in panel */}
      <nav
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "280px",
          background: "rgba(18, 18, 24, 0.97)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          borderLeft: "1px solid var(--border)",
          zIndex: 101,
          transform: isOpen ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
          display: "flex",
          flexDirection: "column",
          padding: "24px 0",
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "0 24px 20px",
            borderBottom: "1px solid var(--border)",
            marginBottom: "8px",
          }}
        >
          <div
            style={{
              fontSize: "0.68rem",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.14em",
              color: "var(--accent)",
              marginBottom: "4px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <img src="/tree-logo.svg" alt="" style={{ height: "20px", width: "auto" }} />
            Scripture Explorer
          </div>
          <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
            Analysis &amp; Discovery Tools
          </div>
        </div>

        {/* Nav links */}
        <div style={{ display: "flex", flexDirection: "column", gap: "2px", padding: "0 12px" }}>
          {rendered}
        </div>

        {/* Footer */}
        <div
          style={{
            marginTop: "auto",
            padding: "16px 24px",
            borderTop: "1px solid var(--border)",
            fontSize: "0.72rem",
            color: "var(--text-muted)",
          }}
        >
          41,995 verses · 87 books · 5 volumes
        </div>
      </nav>
    </>
  );
}
