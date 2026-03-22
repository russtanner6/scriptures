"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import type { ScriptureLocation, LocationType } from "@/lib/types";
import { VOLUME_COLORS } from "@/lib/constants";
import VolumeTooltip from "./VolumeTooltip";
import { usePreferencesContext } from "@/components/PreferencesProvider";
import { useIsMobile } from "@/lib/useIsMobile";
import LocationDetailPanel from "./LocationDetailPanel";

const VOLUME_ORDER = ["OT", "NT", "BoM", "D&C", "PoGP"];
const VOLUME_LABELS: Record<string, string> = {
  OT: "Old Testament",
  NT: "New Testament",
  BoM: "Book of Mormon",
  "D&C": "D&C",
  PoGP: "Pearl of Great Price",
};

const LOCATION_TYPE_EMOJI: Record<LocationType, string> = {
  city: "\u{1F3D9}",       // cityscape
  mountain: "\u26F0",       // mountain
  river: "\u{1F30A}",       // water wave
  sea: "\u{1F30A}",         // water wave
  desert: "\u{1F3DC}",      // desert
  region: "\u{1F30D}",      // globe
  valley: "\u{1F3DE}",      // national park
  well: "\u{1F4A7}",        // droplet
  plain: "\u{1F33E}",       // rice plant
  island: "\u{1F3DD}",      // desert island
  garden: "\u{1F33F}",      // herb
  land: "\u{1F30E}",        // globe americas
  hill: "\u26F0",            // mountain
  wilderness: "\u{1F332}",  // evergreen tree
  waters: "\u{1F4A7}",      // droplet
};

const LOCATION_TYPE_LABELS: Record<LocationType, string> = {
  city: "City",
  mountain: "Mountain",
  river: "River",
  sea: "Sea",
  desert: "Desert",
  region: "Region",
  valley: "Valley",
  well: "Well",
  plain: "Plain",
  island: "Island",
  garden: "Garden",
  land: "Land",
  hill: "Hill",
  wilderness: "Wilderness",
  waters: "Waters",
};

const ALL_LOCATION_TYPES: LocationType[] = [
  "city", "mountain", "river", "sea", "region", "desert",
  "valley", "island", "garden", "well", "plain", "land",
  "hill", "wilderness", "waters",
];

export default function LocationDirectory() {
  const { isVolumeVisible } = usePreferencesContext();
  const searchParams = useSearchParams();
  const [locations, setLocations] = useState<ScriptureLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(() => searchParams.get("q") || "");
  const [volumeFilter, setVolumeFilter] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<LocationType | null>(null);
  const [regionFilter, setRegionFilter] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<ScriptureLocation | null>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    fetch("/api/locations")
      .then((r) => r.json())
      .then((data) => {
        setLocations(data.locations || []);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  // Sync search term to URL (deep linking)
  useEffect(() => {
    const current = searchParams.get("q") || "";
    if (searchTerm !== current) {
      const url = new URL(window.location.href);
      if (searchTerm) {
        url.searchParams.set("q", searchTerm);
      } else {
        url.searchParams.delete("q");
      }
      window.history.replaceState({}, "", url.toString());
    }
  }, [searchTerm, searchParams]);

  // Extract unique regions from data, sorted by frequency
  const regions = useMemo(() => {
    const counts: Record<string, number> = {};
    locations.forEach((l) => {
      if (l.region) counts[l.region] = (counts[l.region] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([r]) => r);
  }, [locations]);

  // Extract which location types are actually present
  const presentTypes = useMemo(() => {
    const set = new Set(locations.map((l) => l.locationType));
    return ALL_LOCATION_TYPES.filter((t) => set.has(t));
  }, [locations]);

  // Filtered locations
  const filtered = useMemo(() => {
    // First filter by user's volume visibility preferences
    let list = locations.filter((l) => l.volumes.some((v: string) => isVolumeVisible(v)));

    if (searchTerm.length >= 2) {
      const term = searchTerm.toLowerCase();
      list = list.filter(
        (l) =>
          l.name.toLowerCase().includes(term) ||
          l.aliases.some((a) => a.toLowerCase().includes(term))
      );
    }

    if (volumeFilter) {
      list = list.filter((l) => l.volumes.includes(volumeFilter));
    }

    if (typeFilter) {
      list = list.filter((l) => l.locationType === typeFilter);
    }

    if (regionFilter) {
      list = list.filter((l) => l.region === regionFilter);
    }

    // Sort: tier 1 first, then alphabetical
    return list.sort((a, b) => {
      if (a.tier !== b.tier) return a.tier - b.tier;
      return a.name.localeCompare(b.name);
    });
  }, [locations, searchTerm, volumeFilter, typeFilter, regionFilter, isVolumeVisible]);

  const clearFilters = useCallback(() => {
    setSearchTerm("");
    setVolumeFilter(null);
    setTypeFilter(null);
    setRegionFilter(null);
  }, []);

  const hasActiveFilters = volumeFilter || typeFilter || regionFilter || searchTerm.length >= 2;

  // Volume color for a location (first volume)
  const getLocColor = (l: ScriptureLocation) => {
    for (const v of VOLUME_ORDER) {
      if (l.volumes.includes(v)) return VOLUME_COLORS[v] || "#8b5cf6";
    }
    return "#8b5cf6";
  };

  const truncate = (text: string, max: number) => {
    if (!text || text.length <= max) return text;
    return text.slice(0, max).trimEnd() + "...";
  };

  if (isLoading) {
    return (
      <div style={{ padding: "60px", textAlign: "center", color: "var(--text-muted)" }}>
        Loading locations...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
      {/* Page header */}
      <div style={{ marginBottom: "28px", textAlign: "center" }}>
        <h1 style={{ fontSize: "1.6rem", fontWeight: 700, color: "var(--text)", marginBottom: "8px" }}>
          Places of the Scriptures
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: isMobile ? "0.85rem" : "0.95rem", maxWidth: "500px", margin: "0 auto 14px" }}>
          {locations.length} named locations across all five volumes
        </p>
        <p style={{ color: "var(--text-muted)", fontSize: "0.78rem", maxWidth: "440px", margin: "0 auto 14px", lineHeight: 1.5 }}>
          Color labels show which volumes a location appears in:
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
              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                {VOLUME_LABELS[v]}
              </span>
            </div>
          ))}
        </div>
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
            placeholder="Search by name or alias..."
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
              {[volumeFilter, typeFilter, regionFilter].filter(Boolean).length}
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

          {/* Location type filter */}
          <div>
            <div style={{ fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: "8px" }}>
              Type
            </div>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {presentTypes.map((t) => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(typeFilter === t ? null : t)}
                  style={{
                    padding: "5px 10px",
                    borderRadius: "6px",
                    border: `1px solid ${typeFilter === t ? "var(--accent)" : "var(--border)"}`,
                    background: typeFilter === t ? "rgba(139,92,246,0.15)" : "transparent",
                    color: typeFilter === t ? "var(--accent)" : "var(--text-secondary)",
                    fontSize: "0.72rem",
                    fontWeight: 500,
                    fontFamily: "inherit",
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  {LOCATION_TYPE_EMOJI[t]} {LOCATION_TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          {/* Region filter */}
          <div>
            <div style={{ fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: "8px" }}>
              Region
            </div>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {regions.slice(0, 20).map((r) => (
                <button
                  key={r}
                  onClick={() => setRegionFilter(regionFilter === r ? null : r)}
                  style={{
                    padding: "5px 10px",
                    borderRadius: "6px",
                    border: `1px solid ${regionFilter === r ? "var(--accent)" : "var(--border)"}`,
                    background: regionFilter === r ? "rgba(139,92,246,0.15)" : "transparent",
                    color: regionFilter === r ? "var(--accent)" : "var(--text-secondary)",
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
        {filtered.length === locations.length
          ? `Showing all ${locations.length}`
          : `${filtered.length} of ${locations.length}`}
      </div>

      {/* Location grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile
            ? "repeat(2, 1fr)"
            : "repeat(auto-fill, minmax(200px, 1fr))",
          gap: isMobile ? "12px" : "20px",
        }}
      >
        {filtered.map((l) => {
          const color = getLocColor(l);
          return (
            <button
              key={l.id}
              onClick={() => setSelectedLocation(l)}
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
              {/* Icon area */}
              <div style={{
                width: "100%",
                aspectRatio: "4 / 3",
                background: `linear-gradient(135deg, ${color}15, ${color}08)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
              }}>
                <span style={{ fontSize: isMobile ? "2.2rem" : "2.8rem" }}>
                  {LOCATION_TYPE_EMOJI[l.locationType] || "\u{1F30D}"}
                </span>
                {/* Known location pin */}
                {l.knownLocation && (
                  <span
                    title="Known location"
                    style={{
                      position: "absolute",
                      top: "8px",
                      right: "8px",
                      fontSize: "0.85rem",
                      opacity: 0.7,
                    }}
                  >
                    {"\u{1F4CD}"}
                  </span>
                )}
              </div>

              {/* Info section */}
              <div style={{
                padding: "12px 10px 14px",
                display: "flex",
                flexDirection: "column",
                gap: "4px",
                flex: 1,
              }}>
                {/* Location type badge */}
                <div style={{
                  fontSize: "0.58rem",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "var(--text-muted)",
                  marginBottom: "1px",
                }}>
                  {LOCATION_TYPE_LABELS[l.locationType] || l.locationType}
                </div>

                {/* Name */}
                <div style={{
                  fontSize: isMobile ? "0.82rem" : "0.9rem",
                  fontWeight: 700,
                  color: "var(--text)",
                  lineHeight: 1.2,
                }}>
                  {l.name}
                </div>

                {/* Volume pills */}
                <div style={{ display: "flex", gap: "3px", justifyContent: "center", marginTop: "2px" }}>
                  {l.volumes.map((v) => (
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

                {/* Region label */}
                {l.region && (
                  <div style={{
                    fontSize: "0.68rem",
                    color: "var(--text-muted)",
                    fontWeight: 500,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}>
                    {l.region}
                  </div>
                )}

                {/* Significance text (truncated) */}
                {l.significance && (
                  <div style={{
                    fontSize: "0.66rem",
                    color: "var(--text-secondary)",
                    fontWeight: 400,
                    lineHeight: 1.35,
                    marginTop: "2px",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}>
                    {truncate(l.significance, 80)}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "48px", color: "var(--text-muted)" }}>
          No locations match your search.
        </div>
      )}

      {/* Location detail slide-in panel */}
      {selectedLocation && (
        <LocationDetailPanel
          location={selectedLocation}
          onClose={() => setSelectedLocation(null)}
          onSelectLocation={(l) => setSelectedLocation(l)}
        />
      )}
    </div>
  );
}
