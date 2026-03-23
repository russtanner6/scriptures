"use client";

import { useState, useEffect, useCallback } from "react";
import { useBackToClose } from "@/lib/useBackToClose";
import type { Resource, ResourceType } from "@/lib/types";
import { getResourceTypeColor } from "./ResourceMarker";

/** Convert YouTube watch URL to embed URL */
function youtubeEmbedUrl(url: string): string | null {
  // youtube.com/watch?v=ID
  const match1 = url.match(/youtube\.com\/watch\?v=([^&]+)/);
  if (match1) return `https://www.youtube.com/embed/${match1[1]}`;
  // youtu.be/ID
  const match2 = url.match(/youtu\.be\/([^?]+)/);
  if (match2) return `https://www.youtube.com/embed/${match2[1]}`;
  return null;
}

const TYPE_LABELS: Record<ResourceType, string> = {
  video: "VIDEO",
  article: "ARTICLE",
  pdf: "PDF",
};

export default function ResourcePanel({
  resources,
  initialIndex,
  bookName,
  volColor,
  lightMode,
  isMobile,
  onClose,
}: {
  resources: Resource[];
  initialIndex: number;
  bookName: string;
  volColor: string;
  lightMode: boolean;
  isMobile: boolean;
  onClose: () => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isVisible, setIsVisible] = useState(false);

  // Mobile back-button closes panel instead of navigating away
  useBackToClose(onClose);

  const resource = resources[currentIndex];
  if (!resource) return null;

  const typeColor = getResourceTypeColor(resource.type);
  const embedUrl = resource.type === "video" ? youtubeEmbedUrl(resource.url) : null;
  const verseLabel =
    resource.verseStart === resource.verseEnd
      ? `${bookName} ${resource.chapter}:${resource.verseStart}`
      : `${bookName} ${resource.chapter}:${resource.verseStart}-${resource.verseEnd}`;

  // Theme colors
  const bg = lightMode ? "#faf9f6" : "#111116";
  const headerBg = lightMode ? "#f0efe8" : "#16171e";
  const text = lightMode ? "#1a1a1a" : "#f0f0f0";
  const textSecondary = lightMode ? "#555" : "#9ca3af";
  const textMuted = lightMode ? "#888" : "#6b7280";
  const border = lightMode ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.06)";
  const surfaceBg = lightMode ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.03)";

  // Slide-in animation
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true));
  }, []);

  // Escape key
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && currentIndex > 0) setCurrentIndex(currentIndex - 1);
      if (e.key === "ArrowRight" && currentIndex < resources.length - 1) setCurrentIndex(currentIndex + 1);
    },
    [onClose, currentIndex, resources.length]
  );
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

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
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: isMobile ? "calc(100vw - 48px)" : "min(85vw, 550px)",
          background: bg,
          borderLeft: isMobile ? "none" : `1px solid ${border}`,
          zIndex: 201,
          display: "flex",
          flexDirection: "column",
          transform: isVisible ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
          willChange: "transform",
          boxShadow: "-8px 0 32px rgba(0, 0, 0, 0.25)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px 16px",
            flexShrink: 0,
            background: headerBg,
            borderBottom: `1px solid ${border}`,
            zIndex: 1,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Type badge */}
              <div style={{ marginBottom: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "3px 10px",
                    borderRadius: "12px",
                    background: `${typeColor}15`,
                    border: `1px solid ${typeColor}30`,
                    color: typeColor,
                    fontSize: "0.65rem",
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                  }}
                >
                  {TYPE_LABELS[resource.type]}
                </span>
                <span style={{ fontSize: "0.78rem", color: textMuted }}>
                  {verseLabel}
                </span>
              </div>
              {/* Title */}
              <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: text, marginBottom: "0", lineHeight: 1.3 }}>
                {resource.title}
              </h3>
            </div>
            {/* Close button */}
            <button
              onClick={onClose}
              style={{
                background: lightMode ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.06)",
                border: `1px solid ${border}`,
                borderRadius: "8px",
                width: "36px",
                height: "36px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: textMuted,
                fontSize: "1.1rem",
                fontFamily: "inherit",
                transition: "all 0.15s",
                flexShrink: 0,
                marginLeft: "12px",
              }}
            >
              ✕
            </button>
          </div>

          {/* Navigation (if multiple resources) */}
          {resources.length > 1 && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "12px" }}>
              <button
                onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                disabled={currentIndex === 0}
                style={{
                  background: "none",
                  border: `1px solid ${border}`,
                  borderRadius: "6px",
                  padding: "4px 10px",
                  color: currentIndex === 0 ? textMuted : text,
                  fontSize: "0.75rem",
                  fontFamily: "inherit",
                  cursor: currentIndex === 0 ? "default" : "pointer",
                  opacity: currentIndex === 0 ? 0.4 : 1,
                }}
              >
                ←
              </button>
              <span style={{ fontSize: "0.72rem", color: textMuted, fontWeight: 500 }}>
                {currentIndex + 1} of {resources.length}
              </span>
              <button
                onClick={() => setCurrentIndex(Math.min(resources.length - 1, currentIndex + 1))}
                disabled={currentIndex === resources.length - 1}
                style={{
                  background: "none",
                  border: `1px solid ${border}`,
                  borderRadius: "6px",
                  padding: "4px 10px",
                  color: currentIndex === resources.length - 1 ? textMuted : text,
                  fontSize: "0.75rem",
                  fontFamily: "inherit",
                  cursor: currentIndex === resources.length - 1 ? "default" : "pointer",
                  opacity: currentIndex === resources.length - 1 ? 0.4 : 1,
                }}
              >
                →
              </button>
            </div>
          )}
        </div>

        {/* Content */}
        <div
          style={{
            overflowY: "auto",
            WebkitOverflowScrolling: "touch",
            padding: "20px 24px 24px",
            flex: 1,
            minHeight: 0,
          }}
        >
          {/* Video embed */}
          {resource.type === "video" && embedUrl && (
            <div
              style={{
                position: "relative",
                width: "100%",
                aspectRatio: "16/9",
                borderRadius: "10px",
                overflow: "hidden",
                marginBottom: "20px",
                background: "#000",
              }}
            >
              <iframe
                src={embedUrl}
                title={resource.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  border: "none",
                }}
              />
            </div>
          )}

          {/* Video thumbnail fallback (non-YouTube) */}
          {resource.type === "video" && !embedUrl && resource.thumbnailUrl && (
            <a href={resource.url} target="_blank" rel="noopener noreferrer">
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  aspectRatio: "16/9",
                  borderRadius: "10px",
                  overflow: "hidden",
                  marginBottom: "20px",
                  background: `url(${resource.thumbnailUrl}) center/cover`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div
                  style={{
                    width: "60px",
                    height: "60px",
                    borderRadius: "50%",
                    background: "rgba(0,0,0,0.6)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>
            </a>
          )}

          {/* Description */}
          <p style={{ fontSize: "0.88rem", color: textSecondary, lineHeight: 1.8, marginBottom: "20px" }}>
            {resource.description}
          </p>

          {/* Action button */}
          <a
            href={resource.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              width: "100%",
              padding: "12px",
              borderRadius: "10px",
              background: `${typeColor}15`,
              border: `1px solid ${typeColor}30`,
              color: typeColor,
              fontSize: "0.85rem",
              fontWeight: 600,
              fontFamily: "inherit",
              textDecoration: "none",
              transition: "all 0.15s",
              cursor: "pointer",
              marginBottom: "8px",
            }}
          >
            {resource.type === "video" && "Open on YouTube"}
            {resource.type === "article" && "Read Article"}
            {resource.type === "pdf" && "Download PDF"}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </a>

          {/* URL display */}
          <div
            style={{
              fontSize: "0.68rem",
              color: textMuted,
              textAlign: "center",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              marginBottom: "24px",
            }}
          >
            {resource.url}
          </div>

          {/* Tags */}
          {resource.tags && resource.tags.length > 0 && (
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "24px" }}>
              {resource.tags.map((tag) => (
                <span
                  key={tag}
                  style={{
                    padding: "3px 10px",
                    borderRadius: "12px",
                    background: `${volColor}12`,
                    border: `1px solid ${volColor}25`,
                    color: volColor,
                    fontSize: "0.68rem",
                    fontWeight: 500,
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Verse reference info */}
          <div
            style={{
              padding: "16px",
              borderRadius: "10px",
              background: surfaceBg,
              border: `1px solid ${border}`,
            }}
          >
            <div
              style={{
                fontSize: "0.68rem",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: textMuted,
                marginBottom: "8px",
              }}
            >
              Covers {verseLabel}
            </div>
            <div style={{ fontSize: "0.78rem", color: textSecondary, lineHeight: 1.5 }}>
              {resource.verseStart === resource.verseEnd
                ? "This resource relates to a single verse."
                : `This resource covers ${resource.verseEnd - resource.verseStart + 1} verses.`}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
