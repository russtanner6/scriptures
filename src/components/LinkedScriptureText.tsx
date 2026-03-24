"use client";

import React from "react";
import { parseScriptureReferences } from "@/lib/scripture-urls";

/**
 * Renders text with scripture references auto-linked to internal reader URLs.
 * e.g., "See Genesis 1:1 and Alma 32:21" → "See <a>Genesis 1:1</a> and <a>Alma 32:21</a>"
 */
export function LinkedScriptureText({
  text,
  linkColor = "#2CC1E8",
  style,
}: {
  text: string;
  linkColor?: string;
  style?: React.CSSProperties;
}) {
  const segments = parseScriptureReferences(text);

  // If no references found, just return plain text
  if (segments.length === 1 && segments[0].type === "text") {
    return <span style={style}>{text}</span>;
  }

  return (
    <span style={style}>
      {segments.map((seg, i) =>
        seg.type === "ref" && seg.url ? (
          <a
            key={i}
            href={seg.url}
            style={{
              color: linkColor,
              textDecoration: "underline",
              textDecorationColor: `${linkColor}40`,
              textUnderlineOffset: "2px",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.textDecorationColor = linkColor;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.textDecorationColor = `${linkColor}40`;
            }}
          >
            {seg.text}
          </a>
        ) : (
          <React.Fragment key={i}>{seg.text}</React.Fragment>
        )
      )}
    </span>
  );
}
