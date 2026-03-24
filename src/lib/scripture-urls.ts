import { VOLUME_ABBREV_TO_SLUG, bookNameToSlug } from "./scripture-slugs";

// Maps book names to churchofjesuschrist.org URL slugs
// URL format: https://www.churchofjesuschrist.org/study/scriptures/{volume}/{slug}/{chapter}?lang=eng#p{verse}

const BOOK_URL_MAP: Record<string, { volume: string; slug: string }> = {
  // Old Testament
  "Genesis": { volume: "ot", slug: "gen" },
  "Exodus": { volume: "ot", slug: "ex" },
  "Leviticus": { volume: "ot", slug: "lev" },
  "Numbers": { volume: "ot", slug: "num" },
  "Deuteronomy": { volume: "ot", slug: "deut" },
  "Joshua": { volume: "ot", slug: "josh" },
  "Judges": { volume: "ot", slug: "judg" },
  "Ruth": { volume: "ot", slug: "ruth" },
  "1 Samuel": { volume: "ot", slug: "1-sam" },
  "2 Samuel": { volume: "ot", slug: "2-sam" },
  "1 Kings": { volume: "ot", slug: "1-kgs" },
  "2 Kings": { volume: "ot", slug: "2-kgs" },
  "1 Chronicles": { volume: "ot", slug: "1-chr" },
  "2 Chronicles": { volume: "ot", slug: "2-chr" },
  "Ezra": { volume: "ot", slug: "ezra" },
  "Nehemiah": { volume: "ot", slug: "neh" },
  "Esther": { volume: "ot", slug: "esth" },
  "Job": { volume: "ot", slug: "job" },
  "Psalms": { volume: "ot", slug: "ps" },
  "Proverbs": { volume: "ot", slug: "prov" },
  "Ecclesiastes": { volume: "ot", slug: "eccl" },
  "Song of Solomon": { volume: "ot", slug: "song" },
  "Isaiah": { volume: "ot", slug: "isa" },
  "Jeremiah": { volume: "ot", slug: "jer" },
  "Lamentations": { volume: "ot", slug: "lam" },
  "Ezekiel": { volume: "ot", slug: "ezek" },
  "Daniel": { volume: "ot", slug: "dan" },
  "Hosea": { volume: "ot", slug: "hosea" },
  "Joel": { volume: "ot", slug: "joel" },
  "Amos": { volume: "ot", slug: "amos" },
  "Obadiah": { volume: "ot", slug: "obad" },
  "Jonah": { volume: "ot", slug: "jonah" },
  "Micah": { volume: "ot", slug: "micah" },
  "Nahum": { volume: "ot", slug: "nahum" },
  "Habakkuk": { volume: "ot", slug: "hab" },
  "Zephaniah": { volume: "ot", slug: "zeph" },
  "Haggai": { volume: "ot", slug: "hag" },
  "Zechariah": { volume: "ot", slug: "zech" },
  "Malachi": { volume: "ot", slug: "mal" },

  // New Testament
  "Matthew": { volume: "nt", slug: "matt" },
  "Mark": { volume: "nt", slug: "mark" },
  "Luke": { volume: "nt", slug: "luke" },
  "John": { volume: "nt", slug: "john" },
  "Acts": { volume: "nt", slug: "acts" },
  "Romans": { volume: "nt", slug: "rom" },
  "1 Corinthians": { volume: "nt", slug: "1-cor" },
  "2 Corinthians": { volume: "nt", slug: "2-cor" },
  "Galatians": { volume: "nt", slug: "gal" },
  "Ephesians": { volume: "nt", slug: "eph" },
  "Philippians": { volume: "nt", slug: "philip" },
  "Colossians": { volume: "nt", slug: "col" },
  "1 Thessalonians": { volume: "nt", slug: "1-thes" },
  "2 Thessalonians": { volume: "nt", slug: "2-thes" },
  "1 Timothy": { volume: "nt", slug: "1-tim" },
  "2 Timothy": { volume: "nt", slug: "2-tim" },
  "Titus": { volume: "nt", slug: "titus" },
  "Philemon": { volume: "nt", slug: "philem" },
  "Hebrews": { volume: "nt", slug: "heb" },
  "James": { volume: "nt", slug: "james" },
  "1 Peter": { volume: "nt", slug: "1-pet" },
  "2 Peter": { volume: "nt", slug: "2-pet" },
  "1 John": { volume: "nt", slug: "1-jn" },
  "2 John": { volume: "nt", slug: "2-jn" },
  "3 John": { volume: "nt", slug: "3-jn" },
  "Jude": { volume: "nt", slug: "jude" },
  "Revelation": { volume: "nt", slug: "rev" },

  // Book of Mormon
  "1 Nephi": { volume: "bofm", slug: "1-ne" },
  "2 Nephi": { volume: "bofm", slug: "2-ne" },
  "Jacob": { volume: "bofm", slug: "jacob" },
  "Enos": { volume: "bofm", slug: "enos" },
  "Jarom": { volume: "bofm", slug: "jarom" },
  "Omni": { volume: "bofm", slug: "omni" },
  "Words of Mormon": { volume: "bofm", slug: "w-of-m" },
  "Mosiah": { volume: "bofm", slug: "mosiah" },
  "Alma": { volume: "bofm", slug: "alma" },
  "Helaman": { volume: "bofm", slug: "hel" },
  "3 Nephi": { volume: "bofm", slug: "3-ne" },
  "4 Nephi": { volume: "bofm", slug: "4-ne" },
  "Mormon": { volume: "bofm", slug: "morm" },
  "Ether": { volume: "bofm", slug: "ether" },
  "Moroni": { volume: "bofm", slug: "moro" },

  // D&C
  "D&C": { volume: "dc-testament", slug: "dc" },
  "Doctrine and Covenants": { volume: "dc-testament", slug: "dc" },

  // Pearl of Great Price
  "Moses": { volume: "pgp", slug: "moses" },
  "Abraham": { volume: "pgp", slug: "abr" },
  "Joseph Smith\u2014Matthew": { volume: "pgp", slug: "js-m" },
  "Joseph Smith\u2014History": { volume: "pgp", slug: "js-h" },
  "Articles of Faith": { volume: "pgp", slug: "a-of-f" },
};

export function getVerseUrl(
  bookName: string,
  chapter: number,
  verse: number
): string | null {
  const entry = BOOK_URL_MAP[bookName];
  if (!entry) return null;

  // For single-chapter books (chapter 0 in our DB), use chapter 1 in the URL
  const chapterNum = chapter === 0 ? 1 : chapter;

  return `https://www.churchofjesuschrist.org/study/scriptures/${entry.volume}/${entry.slug}/${chapterNum}?lang=eng#p${verse}`;
}

// --- Internal scripture reference linking ---

// Map BOOK_URL_MAP volume codes to our internal volume abbreviations
const VOLUME_CODE_TO_ABBREV: Record<string, string> = {
  ot: "OT",
  nt: "NT",
  bofm: "BoM",
  "dc-testament": "D&C",
  pgp: "PoGP",
};

// Additional book name variants that appear in text but differ from BOOK_URL_MAP keys
const BOOK_NAME_ALIASES: Record<string, string> = {
  Psalm: "Psalms",
  "Song of Songs": "Song of Solomon",
  Revelation: "Revelation",
  Rev: "Revelation",
  "JS\u2014H": "Joseph Smith\u2014History",
  "JS\u2014M": "Joseph Smith\u2014Matthew",
};

/**
 * Get internal app URL for a book name + chapter.
 * Returns `/scriptures/{volume-slug}/{book-slug}/{chapter}` or null if book not found.
 */
export function getInternalScriptureUrl(bookName: string, chapter: number): string | null {
  const resolved = BOOK_NAME_ALIASES[bookName] || bookName;
  const entry = BOOK_URL_MAP[resolved];
  if (!entry) return null;
  const volAbbrev = VOLUME_CODE_TO_ABBREV[entry.volume];
  if (!volAbbrev) return null;
  const volSlug = VOLUME_ABBREV_TO_SLUG[volAbbrev];
  if (!volSlug) return null;
  const bSlug = bookNameToSlug(resolved);
  return `/scriptures/${volSlug}/${bSlug}/${chapter}`;
}

/**
 * Parse text and return segments with scripture references identified.
 * Each segment is either plain text or a scripture reference with a URL.
 */
export interface ScriptureRefSegment {
  type: "text" | "ref";
  text: string;
  url?: string;
}

export function parseScriptureReferences(text: string): ScriptureRefSegment[] {
  // Build book name alternation — longest names first to prevent partial matches
  const allBookNames = [
    ...Object.keys(BOOK_URL_MAP),
    ...Object.keys(BOOK_NAME_ALIASES),
  ].sort((a, b) => b.length - a.length);

  // Escape special chars for regex
  const escaped = allBookNames.map((n) =>
    n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  );
  const bookPattern = escaped.join("|");

  // Match: BookName chapter:verse(-verse)? or BookName chapter
  // Examples: Genesis 1:1, Psalm 121:2, D&C 76:22-24, Alma 32, 1 Nephi 1:1-4
  const refRegex = new RegExp(
    `(?:(?<=\\s|^|\\(|;|,)|^)(${bookPattern})\\s+(\\d+)(?::(\\d+)(?:[\\u2013\\u2014-](\\d+))?)?(?=\\s|$|[.,;:)\\u2019'"])`,
    "g"
  );

  const segments: ScriptureRefSegment[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(refRegex)) {
    const matchStart = match.index!;
    // Add preceding text
    if (matchStart > lastIndex) {
      segments.push({ type: "text", text: text.slice(lastIndex, matchStart) });
    }

    const bookName = match[1];
    const chapter = parseInt(match[2], 10);
    const verse = match[3] ? parseInt(match[3], 10) : null;
    const baseUrl = getInternalScriptureUrl(bookName, chapter);
    const url = baseUrl ? (verse ? `${baseUrl}?verse=${verse}` : baseUrl) : null;

    if (url) {
      segments.push({ type: "ref", text: match[0], url });
    } else {
      segments.push({ type: "text", text: match[0] });
    }

    lastIndex = matchStart + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    segments.push({ type: "text", text: text.slice(lastIndex) });
  }

  return segments.length > 0 ? segments : [{ type: "text", text }];
}
