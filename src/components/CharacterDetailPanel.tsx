"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { ScriptureCharacter } from "@/lib/types";
import { VOLUME_COLORS } from "@/lib/constants";

const VOLUME_ORDER = ["OT", "NT", "BoM", "D&C", "PoGP"];

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

export default function CharacterDetailPanel({
  character,
  allCharacters,
  onClose,
  onSelectCharacter,
}: {
  character: ScriptureCharacter;
  allCharacters: ScriptureCharacter[];
  onClose: () => void;
  onSelectCharacter: (c: ScriptureCharacter) => void;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const isMobile = useIsMobile();
  const panelRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  const touchDeltaX = useRef(0);
  const [swipeOffset, setSwipeOffset] = useState(0);

  useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true));
  }, []);

  // Reset animation on character change
  useEffect(() => {
    setIsVisible(false);
    requestAnimationFrame(() => setIsVisible(true));
  }, [character.id]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );
  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Swipe-to-close
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchDeltaX.current = 0;
  }, []);
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const delta = e.touches[0].clientX - touchStartX.current;
    touchDeltaX.current = delta;
    if (delta > 0) setSwipeOffset(delta);
  }, []);
  const handleTouchEnd = useCallback(() => {
    if (touchDeltaX.current > 80) onClose();
    else setSwipeOffset(0);
    touchDeltaX.current = 0;
  }, [onClose]);

  // Primary volume color
  const color = (() => {
    for (const v of VOLUME_ORDER) {
      if (character.volumes.includes(v)) return VOLUME_COLORS[v] || "#8b5cf6";
    }
    return "#8b5cf6";
  })();

  // Find family members
  const findChar = (id: string) => allCharacters.find((c) => c.id === id);

  const familyEntries: { label: string; char: ScriptureCharacter }[] = [];
  const fam = character.family;
  if (fam) {
    for (const [key, val] of Object.entries(fam)) {
      if (Array.isArray(val)) {
        val.forEach((id) => {
          const c = findChar(id);
          if (c) familyEntries.push({ label: key, char: c });
        });
      } else {
        const c = findChar(val);
        if (c) familyEntries.push({ label: key, char: c });
      }
    }
  }

  const panelWidth = isMobile ? "calc(100vw - 48px)" : "min(100vw, 520px)";

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0, 0, 0, 0.5)",
          backdropFilter: "blur(2px)",
          WebkitBackdropFilter: "blur(2px)",
          zIndex: 200,
          opacity: isVisible ? 1 : 0,
          transition: "opacity 0.3s ease",
        }}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: panelWidth,
          background: "var(--bg, #111116)",
          borderLeft: "1px solid var(--border)",
          zIndex: 201,
          display: "flex",
          flexDirection: "column",
          transform: isVisible
            ? `translateX(${swipeOffset}px)`
            : "translateX(100%)",
          transition: swipeOffset > 0 ? "none" : "transform 0.3s ease",
          boxShadow: "-8px 0 32px rgba(0, 0, 0, 0.3)",
          borderRadius: isMobile ? "12px 0 0 12px" : undefined,
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {/* Swipe handle (mobile) */}
        {isMobile && (
          <div style={{ display: "flex", justifyContent: "center", padding: "8px 0 0" }}>
            <div style={{ width: "36px", height: "4px", borderRadius: "2px", background: "rgba(255,255,255,0.15)" }} />
          </div>
        )}

        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "12px",
            right: "12px",
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "8px",
            width: "32px",
            height: "32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "var(--text-muted)",
            fontSize: "0.9rem",
            fontFamily: "inherit",
            zIndex: 1,
          }}
        >
          ✕
        </button>

        {/* Header with avatar */}
        <div style={{
          padding: isMobile ? "24px 20px 20px" : "32px 28px 24px",
          borderBottom: "1px solid var(--border)",
        }}>
          <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
            {/* Large avatar */}
            <div style={{
              width: "64px",
              height: "64px",
              borderRadius: "50%",
              background: `${color}18`,
              border: `3px solid ${color}40`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}>
              {character.portraitUrl ? (
                <img
                  src={character.portraitUrl}
                  alt={character.name}
                  style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }}
                />
              ) : (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              )}
            </div>

            <div style={{ flex: 1, minWidth: 0, paddingRight: "36px" }}>
              <h2 style={{
                fontSize: "1.3rem",
                fontWeight: 700,
                color: "var(--text)",
                marginBottom: "4px",
              }}>
                {character.name}
              </h2>

              {/* Roles */}
              <div style={{
                fontSize: "0.82rem",
                color: color,
                fontWeight: 600,
                marginBottom: "8px",
              }}>
                {character.roles.join(" · ")}
              </div>

              {/* Volume pills */}
              <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
                {character.volumes.map((v) => (
                  <span
                    key={v}
                    style={{
                      fontSize: "0.62rem",
                      fontWeight: 700,
                      color: VOLUME_COLORS[v] || "#888",
                      background: `${VOLUME_COLORS[v] || "#888"}18`,
                      padding: "2px 8px",
                      borderRadius: "4px",
                      letterSpacing: "0.04em",
                    }}
                  >
                    {v}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: isMobile ? "20px" : "24px 28px", flex: 1 }}>
          {/* Bio */}
          <div style={{ marginBottom: "24px" }}>
            <div style={{ fontSize: "0.68rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: "8px" }}>
              About
            </div>
            <p style={{
              fontSize: "0.9rem",
              color: "var(--text-secondary)",
              lineHeight: 1.7,
              margin: 0,
            }}>
              {character.bio}
            </p>
          </div>

          {/* Aliases */}
          {character.aliases.length > 0 && (
            <div style={{ marginBottom: "24px" }}>
              <div style={{ fontSize: "0.68rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: "8px" }}>
                Also Known As
              </div>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {character.aliases.map((a) => (
                  <span
                    key={a}
                    style={{
                      fontSize: "0.78rem",
                      color: "var(--text-secondary)",
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid var(--border)",
                      padding: "3px 10px",
                      borderRadius: "6px",
                    }}
                  >
                    {a}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Era & Time Period */}
          <div style={{ marginBottom: "24px", display: "flex", gap: "24px", flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: "0.68rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: "6px" }}>
                Era
              </div>
              <div style={{ fontSize: "0.85rem", color: "var(--text)" }}>
                {character.era}
              </div>
            </div>
            {character.timePeriod && character.timePeriod !== "unknown" && (
              <div>
                <div style={{ fontSize: "0.68rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: "6px" }}>
                  Time Period
                </div>
                <div style={{ fontSize: "0.85rem", color: "var(--text)" }}>
                  {character.timePeriod}
                </div>
              </div>
            )}
          </div>

          {/* Family */}
          {familyEntries.length > 0 && (
            <div style={{ marginBottom: "24px" }}>
              <div style={{ fontSize: "0.68rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: "10px" }}>
                Family
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {familyEntries.map(({ label, char: fc }, i) => (
                  <button
                    key={`${fc.id}-${label}-${i}`}
                    onClick={() => onSelectCharacter(fc)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      border: "1px solid var(--border)",
                      background: "transparent",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      textAlign: "left",
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <span style={{
                      fontSize: "0.65rem",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      color: "var(--text-muted)",
                      minWidth: "60px",
                    }}>
                      {label}
                    </span>
                    <span style={{
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      color: "var(--text)",
                    }}>
                      {fc.name}
                    </span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: "auto" }}>
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
