"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import type { ScriptureCharacter } from "@/lib/types";
import { VOLUME_COLORS } from "@/lib/constants";
import CharacterDetailPanel from "./CharacterDetailPanel";

const VOLUME_ORDER = ["OT", "NT", "BoM", "D&C", "PoGP"];
const VOLUME_LABELS: Record<string, string> = {
  OT: "Old Testament",
  NT: "New Testament",
  BoM: "Book of Mormon",
  "D&C": "D&C",
  PoGP: "Pearl of Great Price",
};

const ERA_ORDER = [
  "Eternal",
  "Creation",
  "Antediluvian",
  "Patriarchal",
  "Exodus",
  "Conquest",
  "Judges",
  "United Monarchy",
  "Divided Kingdom",
  "Exile & Return",
  "Jaredite",
  "New Testament",
  "Book of Mormon - Early",
  "Book of Mormon - Middle",
  "Book of Mormon - Late",
  "Restoration",
];

const ROLE_ICONS: Record<string, string> = {
  Prophet: "prophet",
  King: "king",
  Apostle: "apostle",
  Judge: "judge",
  Priest: "priest",
  Mother: "mother",
  Wife: "wife",
  Warrior: "warrior",
};

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

export default function CharacterDirectory() {
  const [characters, setCharacters] = useState<ScriptureCharacter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [volumeFilter, setVolumeFilter] = useState<string | null>(null);
  const [eraFilter, setEraFilter] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  const [genderFilter, setGenderFilter] = useState<string | null>(null);
  const [selectedCharacter, setSelectedCharacter] = useState<ScriptureCharacter | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    fetch("/api/characters")
      .then((r) => r.json())
      .then((data) => {
        setCharacters(data.characters || []);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  // Extract unique values for filters
  const eras = useMemo(() => {
    const set = new Set(characters.map((c) => c.era));
    return ERA_ORDER.filter((e) => set.has(e));
  }, [characters]);

  const roles = useMemo(() => {
    const counts: Record<string, number> = {};
    characters.forEach((c) => c.roles.forEach((r) => { counts[r] = (counts[r] || 0) + 1; }));
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([r]) => r);
  }, [characters]);

  // Filtered characters
  const filtered = useMemo(() => {
    let list = characters;

    if (searchTerm.length >= 2) {
      const term = searchTerm.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(term) ||
          c.aliases.some((a) => a.toLowerCase().includes(term)) ||
          c.bio.toLowerCase().includes(term)
      );
    }

    if (volumeFilter) {
      list = list.filter((c) => c.volumes.includes(volumeFilter));
    }

    if (eraFilter) {
      list = list.filter((c) => c.era === eraFilter);
    }

    if (roleFilter) {
      list = list.filter((c) => c.roles.includes(roleFilter));
    }

    if (genderFilter) {
      list = list.filter((c) => c.gender === genderFilter);
    }

    // Sort: tier 1 first, then alphabetical
    return list.sort((a, b) => {
      if (a.tier !== b.tier) return a.tier - b.tier;
      return a.name.localeCompare(b.name);
    });
  }, [characters, searchTerm, volumeFilter, eraFilter, roleFilter, genderFilter]);

  const clearFilters = useCallback(() => {
    setSearchTerm("");
    setVolumeFilter(null);
    setEraFilter(null);
    setRoleFilter(null);
    setGenderFilter(null);
  }, []);

  const hasActiveFilters = volumeFilter || eraFilter || roleFilter || genderFilter || searchTerm.length >= 2;

  // Volume color for a character (first volume)
  const getCharColor = (c: ScriptureCharacter) => {
    for (const v of VOLUME_ORDER) {
      if (c.volumes.includes(v)) return VOLUME_COLORS[v] || "#8b5cf6";
    }
    return "#8b5cf6";
  };

  if (isLoading) {
    return (
      <div style={{ padding: "60px", textAlign: "center", color: "var(--text-muted)" }}>
        Loading characters...
      </div>
    );
  }

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: "24px" }}>
        <h2 style={{ fontSize: "1.4rem", fontWeight: 700, color: "var(--text)", marginBottom: "6px" }}>
          People of the Scriptures
        </h2>
        <p style={{ color: "var(--text-secondary)", fontSize: isMobile ? "0.85rem" : "0.92rem", marginBottom: "4px" }}>
          Every named person across all five volumes of scripture.
        </p>
        <p style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>
          {characters.length} people identified
        </p>
      </div>

      {/* Search + filter bar */}
      <div style={{
        display: "flex",
        gap: "10px",
        alignItems: "center",
        marginBottom: "16px",
        flexWrap: "wrap",
      }}>
        <div style={{
          flex: 1,
          minWidth: "200px",
          position: "relative",
        }}>
          <svg
            width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }}
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, alias, or description..."
            className="search-bar-glow"
            style={{
              width: "100%",
              padding: "10px 12px 10px 36px",
              borderRadius: "10px",
              border: "1px solid var(--border)",
              background: "var(--surface)",
              color: "var(--text)",
              fontSize: "0.88rem",
              fontFamily: "inherit",
              outline: "none",
            }}
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "10px 16px",
            borderRadius: "10px",
            border: `1px solid ${hasActiveFilters ? "var(--accent)" : "var(--border)"}`,
            background: hasActiveFilters ? "rgba(139, 92, 246, 0.1)" : "var(--surface)",
            color: hasActiveFilters ? "var(--accent)" : "var(--text-secondary)",
            fontSize: "0.82rem",
            fontWeight: 600,
            fontFamily: "inherit",
            cursor: "pointer",
            transition: "all 0.15s",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" />
            <line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" />
            <line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" />
            <line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" />
            <line x1="17" y1="16" x2="23" y2="16" />
          </svg>
          Filters
          {hasActiveFilters && (
            <span style={{
              background: "var(--accent)",
              color: "#fff",
              borderRadius: "50%",
              width: "16px",
              height: "16px",
              fontSize: "0.6rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
            }}>
              {[volumeFilter, eraFilter, roleFilter, genderFilter].filter(Boolean).length}
            </span>
          )}
        </button>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div style={{
          padding: "16px",
          marginBottom: "20px",
          borderRadius: "12px",
          border: "1px solid var(--border)",
          background: "var(--surface)",
          display: "flex",
          flexDirection: "column",
          gap: "14px",
        }}>
          {/* Volume filter */}
          <div>
            <div style={{ fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: "8px" }}>
              Volume
            </div>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {VOLUME_ORDER.map((v) => (
                <button
                  key={v}
                  onClick={() => setVolumeFilter(volumeFilter === v ? null : v)}
                  style={{
                    padding: "5px 12px",
                    borderRadius: "6px",
                    border: `1px solid ${volumeFilter === v ? VOLUME_COLORS[v] : "var(--border)"}`,
                    background: volumeFilter === v ? `${VOLUME_COLORS[v]}20` : "transparent",
                    color: volumeFilter === v ? VOLUME_COLORS[v] : "var(--text-secondary)",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    fontFamily: "inherit",
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* Era filter */}
          <div>
            <div style={{ fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: "8px" }}>
              Era
            </div>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {eras.map((e) => (
                <button
                  key={e}
                  onClick={() => setEraFilter(eraFilter === e ? null : e)}
                  style={{
                    padding: "5px 10px",
                    borderRadius: "6px",
                    border: `1px solid ${eraFilter === e ? "var(--accent)" : "var(--border)"}`,
                    background: eraFilter === e ? "rgba(139,92,246,0.15)" : "transparent",
                    color: eraFilter === e ? "var(--accent)" : "var(--text-secondary)",
                    fontSize: "0.72rem",
                    fontWeight: 500,
                    fontFamily: "inherit",
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* Role filter */}
          <div>
            <div style={{ fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: "8px" }}>
              Role
            </div>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {roles.slice(0, 15).map((r) => (
                <button
                  key={r}
                  onClick={() => setRoleFilter(roleFilter === r ? null : r)}
                  style={{
                    padding: "5px 10px",
                    borderRadius: "6px",
                    border: `1px solid ${roleFilter === r ? "var(--accent)" : "var(--border)"}`,
                    background: roleFilter === r ? "rgba(139,92,246,0.15)" : "transparent",
                    color: roleFilter === r ? "var(--accent)" : "var(--text-secondary)",
                    fontSize: "0.72rem",
                    fontWeight: 500,
                    fontFamily: "inherit",
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Gender filter */}
          <div>
            <div style={{ fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: "8px" }}>
              Gender
            </div>
            <div style={{ display: "flex", gap: "6px" }}>
              {(["male", "female"] as const).map((g) => (
                <button
                  key={g}
                  onClick={() => setGenderFilter(genderFilter === g ? null : g)}
                  style={{
                    padding: "5px 12px",
                    borderRadius: "6px",
                    border: `1px solid ${genderFilter === g ? "var(--accent)" : "var(--border)"}`,
                    background: genderFilter === g ? "rgba(139,92,246,0.15)" : "transparent",
                    color: genderFilter === g ? "var(--accent)" : "var(--text-secondary)",
                    fontSize: "0.72rem",
                    fontWeight: 500,
                    fontFamily: "inherit",
                    cursor: "pointer",
                    transition: "all 0.15s",
                    textTransform: "capitalize",
                  }}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              style={{
                alignSelf: "flex-start",
                padding: "5px 14px",
                borderRadius: "6px",
                border: "none",
                background: "rgba(255,255,255,0.06)",
                color: "var(--text-muted)",
                fontSize: "0.72rem",
                fontWeight: 500,
                fontFamily: "inherit",
                cursor: "pointer",
              }}
            >
              Clear all filters
            </button>
          )}
        </div>
      )}

      {/* Results count */}
      <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "16px" }}>
        {filtered.length === characters.length
          ? `${characters.length} people`
          : `${filtered.length} of ${characters.length} people`}
      </div>

      {/* Character grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(320px, 1fr))",
          gap: "12px",
        }}
      >
        {filtered.map((c) => {
          const color = getCharColor(c);
          return (
            <button
              key={c.id}
              onClick={() => setSelectedCharacter(c)}
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "10px",
                padding: "14px 16px",
                textAlign: "left",
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "all 0.15s",
                display: "flex",
                gap: "12px",
                alignItems: "flex-start",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = color;
                e.currentTarget.style.background = `${color}08`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border)";
                e.currentTarget.style.background = "var(--surface)";
              }}
            >
              {/* Avatar */}
              <div style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                background: `${color}18`,
                border: `2px solid ${color}30`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}>
                {c.portraitUrl ? (
                  <img
                    src={c.portraitUrl}
                    alt={c.name}
                    style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }}
                  />
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                )}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "3px",
                }}>
                  <span style={{
                    fontSize: "0.92rem",
                    fontWeight: 700,
                    color: "var(--text)",
                  }}>
                    {c.name}
                  </span>
                  {/* Volume pills */}
                  <div style={{ display: "flex", gap: "3px" }}>
                    {c.volumes.map((v) => (
                      <span
                        key={v}
                        style={{
                          fontSize: "0.55rem",
                          fontWeight: 700,
                          color: VOLUME_COLORS[v] || "#888",
                          background: `${VOLUME_COLORS[v] || "#888"}15`,
                          padding: "1px 4px",
                          borderRadius: "3px",
                          letterSpacing: "0.03em",
                        }}
                      >
                        {v}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Roles */}
                <div style={{
                  fontSize: "0.72rem",
                  color: color,
                  fontWeight: 600,
                  marginBottom: "4px",
                }}>
                  {c.roles.slice(0, 3).join(" · ")}
                </div>

                {/* Bio preview */}
                <div style={{
                  fontSize: "0.78rem",
                  color: "var(--text-muted)",
                  lineHeight: 1.4,
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}>
                  {c.bio}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "48px", color: "var(--text-muted)" }}>
          No characters match your search.
        </div>
      )}

      {/* Detail panel */}
      {selectedCharacter && (
        <CharacterDetailPanel
          character={selectedCharacter}
          allCharacters={characters}
          onClose={() => setSelectedCharacter(null)}
          onSelectCharacter={setSelectedCharacter}
        />
      )}
    </div>
  );
}
