"use client";

import { useState } from "react";
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
        style={{ left: "auto", right: 0 }}
      >
        <span className="hamburger-line" style={{ width: "14px", marginLeft: "auto" }} />
        <span className="hamburger-line" style={{ width: "22px" }} />
        <span className="hamburger-line" style={{ width: "18px", marginLeft: "auto" }} />
      </button>

      <NavMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />

      <h1 className="header-title">Scripture Explorer</h1>
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
