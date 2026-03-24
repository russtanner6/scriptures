"use client";

import { useState } from "react";
import Link from "next/link";
import NavMenu from "./NavMenu";
import HamburgerIcon from "./HamburgerIcon";

export default function Header({
  showMenuLabel = false,
}: {
  showMenuLabel?: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <div
        style={{
          background: "rgba(17, 17, 22, 0.95)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          padding: "10px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          zIndex: 50,
          width: "100%",
        }}
      >
        {/* Left spacer for balance */}
        <div style={{ width: "36px", height: "36px", flexShrink: 0 }} />

        {/* Center: logo links to home */}
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            textDecoration: "none",
          }}
        >
          <img
            src="/logo.svg"
            alt="Scripture Explorer"
            style={{ height: "28px", width: "auto" }}
          />
        </Link>

        {/* Right: hamburger menu */}
        <button
          type="button"
          title="Menu"
          onClick={() => setMenuOpen(true)}
          style={{
            background: "none",
            border: "none",
            width: "36px",
            height: "36px",
            display: "flex",
            flexDirection: showMenuLabel ? "row" : "column",
            alignItems: "center",
            justifyContent: "center",
            gap: showMenuLabel ? "8px" : "4px",
            cursor: "pointer",
            color: "#fff",
            padding: 0,
          }}
        >
          <HamburgerIcon />
          {showMenuLabel && (
            <span
              style={{
                fontSize: "0.55rem",
                fontWeight: 600,
                letterSpacing: "0.12em",
                color: "#ffffff",
                textTransform: "uppercase",
              }}
            >
              Menu
            </span>
          )}
        </button>
      </div>

      <NavMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
