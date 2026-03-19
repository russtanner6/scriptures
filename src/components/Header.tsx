"use client";

import { useState } from "react";
import Link from "next/link";
import NavMenu from "./NavMenu";

export default function Header({ showSubtitle = false }: { showSubtitle?: boolean }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="header-wrapper">
      {/* Hamburger menu — right side */}
      <button
        className="hamburger-btn"
        type="button"
        title="Menu"
        onClick={() => setMenuOpen(true)}
        style={{ left: "auto", right: 0, flexDirection: "row", alignItems: "center", gap: "10px" }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          <span className="hamburger-line" style={{ width: "14px", marginLeft: "auto" }} />
          <span className="hamburger-line" style={{ width: "22px" }} />
          <span className="hamburger-line" style={{ width: "18px", marginLeft: "auto" }} />
        </div>
        <span className="hamburger-label" style={{ fontSize: "0.6rem", fontWeight: 600, letterSpacing: "0.12em", color: "#ffffff", textTransform: "uppercase" }}>Menu</span>
      </button>

      <NavMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />

      <h1 className="header-title" style={{ display: "flex", justifyContent: "center", alignItems: "center", width: "100%", gap: "12px", margin: 0 }}>
        <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: "0.65rem",
            fontWeight: 500,
            letterSpacing: "0.18em",
            color: "#ffffff",
            textTransform: "uppercase",
          }}>
            Scripture
          </span>
          <img
            src="/tree-logo.svg"
            alt="Scripture Explorer"
            style={{ height: "36px", width: "auto" }}
          />
          <span style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: "0.65rem",
            fontWeight: 500,
            letterSpacing: "0.18em",
            color: "#ffffff",
            textTransform: "uppercase",
          }}>
            Explorer
          </span>
        </Link>
      </h1>
      {showSubtitle && (
        <div className="header-subtitle">
          Search and analyze word frequencies across the LDS Standard Works.{" "}
          <strong style={{ color: "var(--text)", fontWeight: 700 }}>
            41,995
          </strong>{" "}
          verses across{" "}
          <strong style={{ color: "var(--text)", fontWeight: 700 }}>87</strong>{" "}
          books.
        </div>
      )}
    </div>
  );
}
