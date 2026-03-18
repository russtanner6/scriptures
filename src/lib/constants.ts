export const VOLUME_COLORS: Record<string, string> = {
  OT: "#DC2F4B",      // crimson
  NT: "#E8532C",      // red-orange
  BoM: "#F57B20",     // orange
  "D&C": "#F5A623",   // amber
  PoGP: "#F5C829",    // golden yellow
};

export const VOLUME_COLORS_SOFT: Record<string, string> = {
  OT: "rgba(220,47,75,0.1)",
  NT: "rgba(232,83,44,0.1)",
  BoM: "rgba(245,123,32,0.1)",
  "D&C": "rgba(245,166,35,0.1)",
  PoGP: "rgba(245,200,41,0.1)",
};

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
