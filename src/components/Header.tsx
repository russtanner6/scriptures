"use client";

import { useState } from "react";
import NavMenu from "./NavMenu";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="header-wrapper">
      {/* Hamburger menu */}
      <button
        className="hamburger-btn"
        type="button"
        title="Menu"
        onClick={() => setMenuOpen(true)}
      >
        <span className="hamburger-line" style={{ width: "14px" }} />
        <span className="hamburger-line" style={{ width: "22px" }} />
        <span className="hamburger-line" style={{ width: "18px" }} />
      </button>

      <NavMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />

      <div className="header-eyebrow">
        <span
          style={{
            display: "inline-block",
            width: "18px",
            height: "2px",
            background: "var(--accent)",
            borderRadius: "1px",
          }}
        />
        Scripture Analysis Dashboard
      </div>
      <h1 className="header-title">Scripture Explorer</h1>
      <div className="header-subtitle">
        Search and analyze word frequencies across the LDS Standard Works.{" "}
        <strong style={{ color: "var(--text)", fontWeight: 700 }}>
          41,995
        </strong>{" "}
        verses across{" "}
        <strong style={{ color: "var(--text)", fontWeight: 700 }}>87</strong>{" "}
        books.
      </div>
    </div>
  );
}
