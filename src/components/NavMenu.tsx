"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useBackToClose } from "@/lib/useBackToClose";
import { useIsMobile } from "@/lib/useIsMobile";

/** Mounts only when menu is open — pushes a history entry so back-button closes menu */
function BackButtonHandler({ onClose }: { onClose: () => void }) {
  useBackToClose(onClose);
  return null;
}

interface NavItem {
  href: string;
  label: string;
  svgIcon?: string;
  description?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const HOME_ITEM: NavItem = { href: "/", label: "Home", svgIcon: "/home.svg" };

const SECTIONS: NavSection[] = [
  {
    title: "Read",
    items: [
      { href: "/scriptures", label: "Read Scriptures", svgIcon: "/scriptures.svg", description: "Browse all 5 volumes" },
      { href: "/characters", label: "People", svgIcon: "/people.svg", description: "757 named individuals" },
      { href: "/locations", label: "Places", svgIcon: "/locations.svg", description: "333 scripture locations" },
      { href: "/bookmarks", label: "Bookmarks", svgIcon: "/favorite.svg", description: "Your saved verses" },
    ],
  },
  {
    title: "Analyze",
    items: [
      { href: "/search", label: "Word Search", svgIcon: "/search.svg", description: "Frequency across books" },
      { href: "/narrative-arc", label: "Narrative Arc", svgIcon: "/narrative-arc.svg", description: "Multi-term comparison" },
      { href: "/heatmap", label: "Theme Heatmap", svgIcon: "/heatmap.svg", description: "Chapter-level density" },
      { href: "/wordcloud", label: "Word Cloud", svgIcon: "/word-cloud.svg", description: "Most common words" },
      { href: "/sentiment", label: "Sentiment Arc", svgIcon: "/sentiment.svg", description: "Emotional tone analysis" },
    ],
  },
  {
    title: "Discover",
    items: [
      { href: "/parallel", label: "Parallel Passages", svgIcon: "/parallel.svg", description: "Side-by-side comparison" },
      { href: "/chiasmus", label: "Chiasmus Detector", svgIcon: "/chiasmus.svg", description: "Mirror patterns (ABBA)" },
      { href: "/topics", label: "Topic Map", svgIcon: "/topics.svg", description: "Find similar chapters" },
    ],
  },
];

const SETTINGS_ITEM: NavItem = { href: "/settings", label: "Settings", svgIcon: "/settings.svg" };

function NavLink({
  item,
  isActive,
  onClose,
  showDescription,
}: {
  item: NavItem;
  isActive: boolean;
  onClose: () => void;
  showDescription?: boolean;
}) {
  return (
    <Link
      href={item.href}
      onClick={onClose}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: showDescription ? "8px 12px" : "10px 16px",
        borderRadius: "10px",
        textDecoration: "none",
        color: "#fefefe",
        background: isActive ? "rgba(255, 255, 255, 0.08)" : "transparent",
        border: isActive ? "1px solid rgba(255, 255, 255, 0.14)" : "1px solid transparent",
        transition: "all 0.15s ease",
      }}
    >
      {item.svgIcon && (
        <img
          src={item.svgIcon}
          alt=""
          style={{
            width: "18px",
            height: "18px",
            filter: "invert(1) brightness(1)",
            flexShrink: 0,
          }}
        />
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
        <span style={{ fontSize: "0.88rem", fontWeight: isActive ? 600 : 500 }}>
          {item.label}
        </span>
        {showDescription && item.description && (
          <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", lineHeight: 1.3 }}>
            {item.description}
          </span>
        )}
      </div>
    </Link>
  );
}

export default function NavMenu({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const isMobile = useIsMobile(768);

  // ── Desktop mega menu ──
  const desktopMenu = (
    <nav
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        bottom: 0,
        width: "min(720px, 85vw)",
        background: "rgba(14, 14, 20, 0.97)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderLeft: "1px solid var(--border)",
        zIndex: 101,
        transform: isOpen ? "translateX(0)" : "translateX(100%)",
        transition: "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), visibility 0s linear " + (isOpen ? "0s" : "0.3s"),
        willChange: "transform",
        visibility: isOpen ? "visible" as const : "hidden" as const,
        pointerEvents: isOpen ? "auto" as const : "none" as const,
        display: "flex",
        flexDirection: "column",
        overflowY: "auto",
      }}
    >
      {/* Header */}
      <div style={{
        padding: "28px 32px 20px",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <div>
          <div style={{
            fontSize: "0.78rem",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.14em",
            color: "var(--text)",
            marginBottom: "4px",
          }}>
            Scripture Explorer
          </div>
          <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
            Analysis &amp; Discovery Tools
          </div>
        </div>
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: "8px",
            color: "#fefefe",
            fontSize: "1.2rem",
            cursor: "pointer",
            padding: "6px 10px",
            lineHeight: 1,
          }}
          aria-label="Close menu"
        >
          ✕
        </button>
      </div>

      {/* Home link */}
      <div style={{ padding: "12px 24px 0" }}>
        <NavLink item={HOME_ITEM} isActive={pathname === "/"} onClose={onClose} />
      </div>

      {/* Column grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        gap: "8px",
        padding: "20px 24px",
        flex: 1,
      }}>
        {SECTIONS.map((section) => (
          <div key={section.title}>
            {/* Section heading — left aligned */}
            <div style={{
              fontSize: "0.65rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.14em",
              color: "var(--text-secondary)",
              padding: "0 12px 8px",
              borderBottom: "1px solid var(--border)",
              marginBottom: "8px",
              textAlign: "left",
            }}>
              {section.title}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              {section.items.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  isActive={pathname === item.href}
                  onClose={onClose}
                  showDescription
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Footer: Settings + stats */}
      <div style={{
        padding: "12px 24px 20px",
        borderTop: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <NavLink item={SETTINGS_ITEM} isActive={pathname === "/settings"} onClose={onClose} />
        <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
          41,995 verses · 87 books · 5 volumes
        </span>
      </div>
    </nav>
  );

  // ── Mobile slide-in (single column) ──
  const mobileMenu = (
    <nav
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        bottom: 0,
        width: "280px",
        background: "rgba(14, 14, 20, 0.97)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderLeft: "1px solid var(--border)",
        zIndex: 101,
        transform: isOpen ? "translateX(0)" : "translateX(100%)",
        transition: "transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), visibility 0s linear " + (isOpen ? "0s" : "0.25s"),
        willChange: "transform",
        visibility: isOpen ? "visible" as const : "hidden" as const,
        pointerEvents: isOpen ? "auto" as const : "none" as const,
        display: "flex",
        flexDirection: "column",
        padding: "24px 0",
        overflowY: "auto",
      }}
    >
      {/* Header */}
      <div style={{
        padding: "0 24px 20px",
        borderBottom: "1px solid var(--border)",
        marginBottom: "8px",
      }}>
        <div style={{
          fontSize: "0.75rem",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.14em",
          color: "var(--text)",
          marginBottom: "4px",
        }}>
          Scripture Explorer
        </div>
        <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
          Analysis &amp; Discovery Tools
        </div>
      </div>

      {/* Nav links — single column */}
      <div style={{ display: "flex", flexDirection: "column", gap: "2px", padding: "0 12px" }}>
        <NavLink item={HOME_ITEM} isActive={pathname === "/"} onClose={onClose} />
        {SECTIONS.map((section) => (
          <div key={section.title}>
            <div style={{
              fontSize: "0.58rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.16em",
              color: "var(--text-muted)",
              padding: "12px 16px 4px",
              textAlign: "left",
            }}>
              {section.title}
            </div>
            {section.items.map((item) => (
              <NavLink key={item.href} item={item} isActive={pathname === item.href} onClose={onClose} />
            ))}
          </div>
        ))}
        <div style={{
          fontSize: "0.58rem",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.16em",
          color: "var(--text-muted)",
          padding: "12px 16px 4px",
          textAlign: "left",
        }}>
          Settings
        </div>
        <NavLink item={SETTINGS_ITEM} isActive={pathname === "/settings"} onClose={onClose} />
      </div>

      {/* Footer */}
      <div style={{
        marginTop: "auto",
        padding: "16px 24px",
        borderTop: "1px solid var(--border)",
        fontSize: "0.72rem",
        color: "var(--text-muted)",
      }}>
        41,995 verses · 87 books · 5 volumes
      </div>
    </nav>
  );

  return (
    <>
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

      {isMobile ? mobileMenu : desktopMenu}
    </>
  );
}
