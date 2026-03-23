"use client";

import type { Resource, ResourceType } from "@/lib/types";

const TYPE_COLORS: Record<ResourceType, string> = {
  video: "#8b5cf6",   // purple
  article: "#3B82F6", // blue
  pdf: "#10B981",     // green
};

const TYPE_ICONS: Record<ResourceType, React.ReactNode> = {
  video: (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  ),
  article: (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  ),
  pdf: (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  ),
};

export function getResourceTypeColor(type: ResourceType): string {
  return TYPE_COLORS[type];
}

/** Single resource pill per verse — shows type icon and count if multiple */
export default function ResourceMarker({
  resource,
  lightMode,
  count,
  onClick,
}: {
  resource: Resource;
  lightMode: boolean;
  count?: number;
  onClick: () => void;
}) {
  const color = TYPE_COLORS[resource.type];
  const icon = TYPE_ICONS[resource.type];
  const typeLabel = resource.type === "video" ? "VIDEO" : resource.type === "article" ? "LINK" : "FILE";
  const pluralLabel = resource.type === "video" ? "VIDEOS" : resource.type === "article" ? "LINKS" : "FILES";
  const label = count && count > 1 ? `${pluralLabel} (${count})` : typeLabel;

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      title={count && count > 1 ? `${count} resources on this verse` : resource.title}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        padding: "3px 9px",
        height: "22px",
        borderRadius: "5px",
        border: `1px solid ${color}35`,
        background: lightMode ? `${color}10` : `${color}15`,
        color: color,
        fontSize: "0.68rem",
        fontWeight: 600,
        fontFamily: "inherit",
        cursor: "pointer",
        transition: "all 0.15s",
        verticalAlign: "middle",
        marginLeft: "0",
        lineHeight: 1,
        whiteSpace: "nowrap",
        flexShrink: 0,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = lightMode ? `${color}20` : `${color}25`;
        e.currentTarget.style.transform = "scale(1.05)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = lightMode ? `${color}10` : `${color}15`;
        e.currentTarget.style.transform = "scale(1)";
      }}
    >
      {icon}
      <span style={{ letterSpacing: "0.02em", textTransform: "uppercase" }}>
        {label}
      </span>
    </button>
  );
}
