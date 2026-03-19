"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS: { href: string; label: string; icon?: string; svgIcon?: string }[] = [
  { href: "/", label: "Home", svgIcon: "/home.svg" },
  { href: "/search", label: "Word Search", svgIcon: "/search.svg" },
  { href: "/narrative-arc", label: "Narrative Arc", icon: "📈" },
  { href: "/heatmap", label: "Theme Heatmap", svgIcon: "/heatmap.svg" },
  { href: "/wordcloud", label: "Word Cloud", svgIcon: "/word-cloud.svg" },
  { href: "/read", label: "Read Scriptures", svgIcon: "/scriptures.svg" },
  { href: "/bookmarks", label: "Bookmarks", icon: "★" },
];

export default function NavMenu({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();

  return (
    <>
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
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "0 24px 24px",
            borderBottom: "1px solid var(--border)",
            marginBottom: "16px",
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
            }}
          >
            Scripture Explorer
          </div>
          <div
            style={{
              fontSize: "0.78rem",
              color: "var(--text-muted)",
            }}
          >
            Analysis Tools
          </div>
        </div>

        {/* Nav links */}
        <div style={{ display: "flex", flexDirection: "column", gap: "4px", padding: "0 12px" }}>
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "12px 16px",
                  borderRadius: "12px",
                  textDecoration: "none",
                  fontSize: "0.92rem",
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? "#fff" : "var(--text-secondary)",
                  background: isActive
                    ? "rgba(255, 255, 255, 0.08)"
                    : "transparent",
                  border: isActive
                    ? "1px solid rgba(255, 255, 255, 0.14)"
                    : "1px solid transparent",
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
                      filter: isActive ? "invert(1) brightness(1)" : "invert(1) brightness(0.55)",
                      transition: "filter 0.15s",
                    }}
                  />
                ) : (
                  <span style={{ fontSize: "1.1rem" }}>{item.icon}</span>
                )}
                {item.label}
              </Link>
            );
          })}
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
          41,995 verses · 87 books
        </div>
      </nav>
    </>
  );
}
