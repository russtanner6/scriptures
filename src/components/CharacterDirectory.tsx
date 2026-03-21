"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import type { ScriptureCharacter } from "@/lib/types";
import { VOLUME_COLORS } from "@/lib/constants";
import VolumeTooltip from "./VolumeTooltip";
import CharacterDetailPanel from "./CharacterDetailPanel";
import RelationshipWeb from "./RelationshipWeb";
import { usePreferencesContext } from "@/components/PreferencesProvider";
import { useIsMobile } from "@/lib/useIsMobile";

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

export default function CharacterDirectory() {
  const { isVolumeVisible } = usePreferencesContext();
  const searchParams = useSearchParams();
  const [characters, setCharacters] = useState<ScriptureCharacter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [volumeFilter, setVolumeFilter] = useState<string | null>(null);
  const [eraFilter, setEraFilter] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  const [genderFilter, setGenderFilter] = useState<string | null>(null);
  const [selectedCharacter, setSelectedCharacter] = useState<ScriptureCharacter | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showRelationshipWeb, setShowRelationshipWeb] = useState(false);
  const [webInitialCharacter, setWebInitialCharacter] = useState<ScriptureCharacter | null>(null);
  const isMobile = useIsMobile();
  const [deepLinkHandled, setDeepLinkHandled] = useState(false);

  useEffect(() => {
    fetch("/api/characters")
      .then((r) => r.json())
      .then((data) => {
        setCharacters(data.characters || []);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  // Deep-link: auto-open character panel from ?person=characterId
  useEffect(() => {
    if (deepLinkHandled || characters.length === 0) return;
    const personId = searchParams.get("person");
    if (personId) {
      const found = characters.find((c) => c.id === personId);
      if (found) {
        setSelectedCharacter(found);
      }
      setDeepLinkHandled(true);
    }
  }, [characters, searchParams, deepLinkHandled]);

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
    // First filter by user's volume visibility preferences
    let list = characters.filter((c) => c.volumes.some((v: string) => isVolumeVisible(v)));

    if (searchTerm.length >= 2) {
      const term = searchTerm.toLowerCase();
      // Search names and aliases only — bio search creates too much noise
      // (e.g., searching "Paul" would return 100+ people whose bios mention Paul)
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(term) ||
          c.aliases.some((a) => a.toLowerCase().includes(term))
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
    <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
      {/* Page header */}
      <div style={{ marginBottom: "28px", textAlign: "center" }}>
        <h2 style={{ fontSize: "1.6rem", fontWeight: 700, color: "var(--text)", marginBottom: "8px" }}>
          People of the Scriptures
        </h2>
        <p style={{ color: "var(--text-secondary)", fontSize: isMobile ? "0.85rem" : "0.95rem", maxWidth: "500px", margin: "0 auto 14px" }}>
          {characters.length} named individuals across all five volumes
        </p>
        <p style={{ color: "var(--text-muted)", fontSize: "0.78rem", maxWidth: "440px", margin: "0 auto 14px", lineHeight: 1.5 }}>
          Color labels show which volumes a person appears in:
        </p>
        {/* Volume legend */}
        <div style={{
          display: "flex",
          gap: "10px",
          justifyContent: "center",
          flexWrap: "wrap",
        }}>
          {VOLUME_ORDER.filter(isVolumeVisible).map((v) => (
            <div key={v} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <span style={{
                fontSize: "0.65rem",
                fontWeight: 700,
                color: VOLUME_COLORS[v],
                background: `${VOLUME_COLORS[v]}18`,
                padding: "2px 6px",
                borderRadius: "3px",
                letterSpacing: "0.03em",
              }}>
                {v}
              </span>
              <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>
                {VOLUME_LABELS[v]}
              </span>
            </div>
          ))}
        </div>

        {/* Relationship Web button */}
        <button
          onClick={() => { setWebInitialCharacter(null); setShowRelationshipWeb(true); }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "8px 18px",
            borderRadius: "10px",
            border: "1px solid rgba(139, 92, 246, 0.3)",
            background: "rgba(139, 92, 246, 0.08)",
            color: "#8b5cf6",
            fontSize: "0.78rem",
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "inherit",
            marginTop: "16px",
            transition: "all 0.2s",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="5" r="3" />
            <circle cx="5" cy="19" r="3" />
            <circle cx="19" cy="19" r="3" />
            <line x1="12" y1="8" x2="5" y2="16" />
            <line x1="12" y1="8" x2="19" y2="16" />
          </svg>
          View Relationship Web
        </button>
      </div>

      {/* Search + filter bar */}
      <div style={{
        display: "flex",
        gap: "10px",
        alignItems: "center",
        marginBottom: "16px",
        maxWidth: "600px",
        margin: "0 auto 16px",
      }}>
        <div style={{
          flex: 1,
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
            enterKeyHint="search"
            autoCapitalize="none"
            autoCorrect="off"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name..."
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
          maxWidth: "600px",
          margin: "0 auto 20px",
        }}>
          {/* Volume filter */}
          <div>
            <div style={{ fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: "8px" }}>
              Volume
            </div>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {VOLUME_ORDER.filter(isVolumeVisible).map((v) => (
                <VolumeTooltip key={v} abbrev={v}>
                  <button
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
                </VolumeTooltip>
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
      <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "20px", textAlign: "center" }}>
        {filtered.length === characters.length
          ? `Showing all ${characters.length}`
          : `${filtered.length} of ${characters.length}`}
      </div>

      {/* Character grid — portrait cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile
            ? "repeat(2, 1fr)"
            : "repeat(auto-fill, minmax(180px, 1fr))",
          gap: isMobile ? "12px" : "20px",
        }}
      >
        {filtered.map((c) => {
          const color = getCharColor(c);
          const hasPortrait = !!c.portraitUrl;
          return (
            <button
              key={c.id}
              onClick={() => setSelectedCharacter(c)}
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "14px",
                padding: "0",
                textAlign: "center",
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "all 0.2s",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = color;
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = `0 8px 24px ${color}20`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border)";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              {/* Portrait area */}
              <div style={{
                width: "100%",
                aspectRatio: "3 / 4",
                background: hasPortrait ? "transparent" : `linear-gradient(135deg, ${color}15, ${color}08)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
              }}>
                {hasPortrait ? (
                  <img
                    src={c.portraitUrl}
                    alt={c.name}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                    loading="lazy"
                  />
                ) : (
                  <div style={{
                    width: "72px",
                    height: "72px",
                    borderRadius: "50%",
                    background: `${color}18`,
                    border: `2px solid ${color}30`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity={0.5}>
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Info section */}
              <div style={{
                padding: "12px 10px 14px",
                display: "flex",
                flexDirection: "column",
                gap: "4px",
              }}>
                <div style={{
                  fontSize: isMobile ? "0.82rem" : "0.9rem",
                  fontWeight: 700,
                  color: "var(--text)",
                  lineHeight: 1.2,
                }}>
                  {c.name}
                </div>

                {/* Volume pills */}
                <div style={{ display: "flex", gap: "3px", justifyContent: "center", marginTop: "2px" }}>
                  {c.volumes.map((v) => (
                    <span
                      key={v}
                      style={{
                        fontSize: "0.55rem",
                        fontWeight: 700,
                        color: VOLUME_COLORS[v] || "#888",
                        background: `${VOLUME_COLORS[v] || "#888"}15`,
                        padding: "1px 5px",
                        borderRadius: "3px",
                        letterSpacing: "0.03em",
                      }}
                    >
                      {v}
                    </span>
                  ))}
                </div>

                {/* Role - one line */}
                <div style={{
                  fontSize: "0.7rem",
                  color: "var(--text-muted)",
                  fontWeight: 500,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}>
                  {c.roles.slice(0, 2).join(" · ")}
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

      {/* Relationship Web */}
      {showRelationshipWeb && (
        <RelationshipWeb
          characters={characters}
          initialCharacter={webInitialCharacter}
          onClose={() => setShowRelationshipWeb(false)}
          onSelectCharacter={(c) => {
            setShowRelationshipWeb(false);
            setSelectedCharacter(c);
          }}
        />
      )}
    </div>
  );
}
