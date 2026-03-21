"use client";

import { useState, useEffect } from "react";
import { getBookmarks, removeBookmark, type Bookmark } from "@/lib/bookmarks";
import { VOLUME_COLORS } from "@/lib/constants";
import { usePreferencesContext } from "@/components/PreferencesProvider";
import { useIsMobile } from "@/lib/useIsMobile";

export default function BookmarksList() {
  const { isVolumeVisible } = usePreferencesContext();
  const isMobile = useIsMobile();
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);

  useEffect(() => {
    setBookmarks(getBookmarks());
  }, []);

  const handleRemove = (bm: Bookmark) => {
    removeBookmark(bm.bookId, bm.chapter, bm.verse);
    setBookmarks(getBookmarks());
  };

  // Group by volume — only show visible volumes
  const volumeOrder = ["OT", "NT", "BoM", "D&C", "PoGP"].filter(isVolumeVisible);
  const grouped = new Map<string, Bookmark[]>();
  for (const bm of bookmarks) {
    if (!isVolumeVisible(bm.volumeAbbrev)) continue; // hide bookmarks from hidden volumes
    const key = bm.volumeAbbrev;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(bm);
  }

  return (
    <div>
      <div style={{ marginBottom: "24px" }}>
        <h2
          style={{
            fontSize: "1.4rem",
            fontWeight: 700,
            color: "var(--text)",
            marginBottom: "6px",
          }}
        >
          Bookmarks
        </h2>
        <p style={{ color: "var(--text-secondary)", fontSize: isMobile ? "0.85rem" : "0.92rem" }}>
          {bookmarks.length === 0
            ? "No bookmarks yet. Tap any verse while reading to bookmark it."
            : `${bookmarks.length} saved verse${bookmarks.length !== 1 ? "s" : ""}`}
        </p>
      </div>

      {bookmarks.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text-muted)" }}>
          <div style={{ marginBottom: "12px" }}><img src="/favorite.svg" alt="" style={{ width: "44px", height: "44px", filter: "invert(1) brightness(0.4)" }} /></div>
          <div style={{ fontSize: "0.92rem", marginBottom: "16px" }}>
            Tap any verse text while reading to bookmark it
          </div>
          <a
            href="/read"
            style={{
              display: "inline-block",
              padding: "10px 24px",
              borderRadius: "8px",
              background: "var(--accent)",
              color: "#fff",
              fontSize: "0.88rem",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Start Reading
          </a>
        </div>
      )}

      {volumeOrder.map((volAbbrev) => {
        const vbms = grouped.get(volAbbrev);
        if (!vbms || vbms.length === 0) return null;
        const color = VOLUME_COLORS[volAbbrev] || "#3B82F6";

        return (
          <div key={volAbbrev} style={{ marginBottom: "24px" }}>
            <div
              style={{
                fontSize: "0.72rem",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color,
                marginBottom: "10px",
              }}
            >
              {volAbbrev === "OT" ? "Old Testament" : volAbbrev === "NT" ? "New Testament" : volAbbrev === "BoM" ? "Book of Mormon" : volAbbrev === "PoGP" ? "Pearl of Great Price" : volAbbrev}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {vbms.map((bm) => {
                const isDC = bm.volumeAbbrev === "D&C";
                const ref = isDC
                  ? `D&C ${bm.chapter}:${bm.verse}`
                  : `${bm.bookName} ${bm.chapter}:${bm.verse}`;

                return (
                  <div
                    key={`${bm.bookId}-${bm.chapter}-${bm.verse}`}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "12px",
                      padding: "12px 16px",
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: "10px",
                      borderLeft: `3px solid ${color}`,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <a
                        href={`/read?bookId=${bm.bookId}&chapter=${bm.chapter}&verse=${bm.verse}`}
                        style={{
                          fontSize: "0.88rem",
                          fontWeight: 600,
                          color: "var(--text)",
                          textDecoration: "none",
                        }}
                      >
                        {ref}
                      </a>
                      <div
                        style={{
                          fontSize: "0.82rem",
                          color: "var(--text-secondary)",
                          marginTop: "4px",
                          lineHeight: 1.5,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                        }}
                      >
                        {bm.text}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemove(bm)}
                      title="Remove bookmark"
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--text-muted)",
                        fontSize: "0.85rem",
                        cursor: "pointer",
                        padding: "4px",
                        opacity: 0.6,
                        transition: "opacity 0.15s",
                        fontFamily: "inherit",
                        flexShrink: 0,
                      }}
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
