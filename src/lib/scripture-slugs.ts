/**
 * URL slug mappings for SEO-friendly scripture URLs.
 * Maps between volume abbreviations/book names and URL-safe slugs.
 */

// Volume slug ↔ abbreviation
export const VOLUME_SLUG_TO_ABBREV: Record<string, string> = {
  "old-testament": "OT",
  "new-testament": "NT",
  "book-of-mormon": "BoM",
  "d-and-c": "D&C",
  "pearl-of-great-price": "PoGP",
};

export const VOLUME_ABBREV_TO_SLUG: Record<string, string> = {
  "OT": "old-testament",
  "NT": "new-testament",
  "BoM": "book-of-mormon",
  "D&C": "d-and-c",
  "PoGP": "pearl-of-great-price",
};

/** Convert a book name to a URL slug: "1 Samuel" → "1-samuel", "Song of Solomon" → "song-of-solomon" */
export function bookNameToSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

/** Convert a URL slug back to a normalized form for matching: "1-samuel" → "1 samuel" */
export function slugToBookSearch(slug: string): string {
  return slug.replace(/-/g, " ");
}

/** Build the full scripture URL path */
export function scriptureUrl(volumeAbbrev: string, bookName?: string, chapter?: number): string {
  const volSlug = VOLUME_ABBREV_TO_SLUG[volumeAbbrev];
  if (!volSlug) return "/scriptures";
  if (!bookName) return `/scriptures/${volSlug}`;
  const bookSlug = bookNameToSlug(bookName);
  if (!chapter) return `/scriptures/${volSlug}/${bookSlug}`;
  return `/scriptures/${volSlug}/${bookSlug}/${chapter}`;
}
