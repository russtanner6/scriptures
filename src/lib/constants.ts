export const VOLUME_COLORS: Record<string, string> = {
  OT: "#DC2F4B",      // crimson
  NT: "#E8532C",      // red-orange
  BoM: "#F57B20",     // orange
  "D&C": "#F5A623",   // amber
  PoGP: "#F5C829",    // golden yellow
  Apoc: "#8E7CC3",    // muted purple (non-canonical)
};

export const VOLUME_COLORS_SOFT: Record<string, string> = {
  OT: "rgba(220,47,75,0.1)",
  NT: "rgba(232,83,44,0.1)",
  BoM: "rgba(245,123,32,0.1)",
  "D&C": "rgba(245,166,35,0.1)",
  PoGP: "rgba(245,200,41,0.1)",
  Apoc: "rgba(142,124,195,0.1)",
};

// Short names for tight spaces (tabs, pills, chart labels)
export const VOLUME_SHORT_NAMES: Record<string, string> = {
  "Old Testament": "Old Testament",
  "New Testament": "New Testament",
  "Book of Mormon": "Book of Mormon",
  "D&C": "D&C",
  "Pearl of Great Price": "Pearl of Great Price",
  "Apocrypha": "Apocrypha",
};

// Abbreviated names for very tight spaces (mobile tabs, stat cards)
export const VOLUME_ABBREV_NAMES: Record<string, string> = {
  "Old Testament": "OT",
  "New Testament": "NT",
  "Book of Mormon": "BoM",
  "D&C": "D&C",
  "Pearl of Great Price": "PoGP",
  "Apocrypha": "Apoc",
};

// Get a compact display name — uses abbreviation for Pearl of Great Price
export function compactVolumeName(name: string, isMobile = false): string {
  if (isMobile) {
    return VOLUME_ABBREV_NAMES[name] || name;
  }
  // On desktop, only abbreviate Pearl of Great Price
  if (name === "Pearl of Great Price") return "Pearl of GP";
  return name;
}

/**
 * Returns "#fff" or a dark color based on the perceived luminance
 * of the background color. Uses the W3C relative luminance formula.
 * Works with any hex color — no manual mapping needed.
 */
export function getContrastText(hexColor: string): string {
  const hex = hexColor.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  // sRGB to linear
  const rLin = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
  const gLin = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
  const bLin = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);

  // Relative luminance
  const luminance = 0.2126 * rLin + 0.7152 * gLin + 0.0722 * bLin;

  return luminance > 0.35 ? "#1a1a2e" : "#fff";
}
