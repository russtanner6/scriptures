/**
 * build-speakers-lds.ts
 *
 * Generates speaker attribution data for Book of Mormon, D&C, and Pearl of Great Price
 * by analyzing scripture text patterns directly from the SQLite database.
 *
 * Run: npx tsx scripts/build-speakers-lds.ts
 *
 * Output: data/speakers-lds.json (same format as speakers.json)
 */

import fs from "fs";
import path from "path";
import initSqlJs, { Database } from "sql.js";

const DATA_DIR = path.join(__dirname, "..", "data");
const OUTPUT_PATH = path.join(DATA_DIR, "speakers-lds.json");
const DB_PATH = path.join(DATA_DIR, "scriptures.db");

type SpeakerType = "divine" | "narrator" | "prophet" | "apostle" | "angel" | "other";

interface SpeakerEntry {
  book: string;
  chapter: number;
  verseStart: number;
  verseEnd: number;
  speaker: string;
  speakerType: SpeakerType;
}

interface Verse {
  verse: number;
  text: string;
}

// ── Book metadata: who narrates each book by default ─────────────────────────

interface BookMeta {
  bookId: number;
  name: string;
  defaultNarrator: string;
  narratorType: SpeakerType;
}

const BOM_BOOKS: BookMeta[] = [
  { bookId: 67, name: "1 Nephi", defaultNarrator: "Nephi", narratorType: "prophet" },
  { bookId: 68, name: "2 Nephi", defaultNarrator: "Nephi", narratorType: "prophet" },
  { bookId: 69, name: "Jacob", defaultNarrator: "Jacob", narratorType: "prophet" },
  { bookId: 70, name: "Enos", defaultNarrator: "Enos", narratorType: "prophet" },
  { bookId: 71, name: "Jarom", defaultNarrator: "Jarom", narratorType: "prophet" },
  { bookId: 72, name: "Omni", defaultNarrator: "Omni", narratorType: "other" },
  { bookId: 73, name: "Words of Mormon", defaultNarrator: "Mormon", narratorType: "prophet" },
  { bookId: 74, name: "Mosiah", defaultNarrator: "Mormon", narratorType: "prophet" },
  { bookId: 75, name: "Alma", defaultNarrator: "Mormon", narratorType: "prophet" },
  { bookId: 76, name: "Helaman", defaultNarrator: "Mormon", narratorType: "prophet" },
  { bookId: 77, name: "3 Nephi", defaultNarrator: "Mormon", narratorType: "prophet" },
  { bookId: 78, name: "4 Nephi", defaultNarrator: "Mormon", narratorType: "prophet" },
  { bookId: 79, name: "Mormon", defaultNarrator: "Mormon", narratorType: "prophet" },
  { bookId: 80, name: "Ether", defaultNarrator: "Moroni", narratorType: "prophet" },
  { bookId: 81, name: "Moroni", defaultNarrator: "Moroni", narratorType: "prophet" },
];

const DC_BOOK: BookMeta = {
  bookId: 82,
  name: "Doctrine and Covenants",
  defaultNarrator: "God",
  narratorType: "divine",
};

const POGP_BOOKS: BookMeta[] = [
  { bookId: 83, name: "Moses", defaultNarrator: "Moses", narratorType: "prophet" },
  { bookId: 84, name: "Abraham", defaultNarrator: "Abraham", narratorType: "prophet" },
  { bookId: 85, name: "Joseph Smith—Matthew", defaultNarrator: "Jesus Christ", narratorType: "divine" },
  { bookId: 86, name: "Joseph Smith—History", defaultNarrator: "Joseph Smith", narratorType: "prophet" },
  { bookId: 87, name: "Articles of Faith", defaultNarrator: "Joseph Smith", narratorType: "prophet" },
];

// ── Speaker classification ───────────────────────────────────────────────────

const DIVINE_NAMES = new Set([
  "God", "Jesus Christ", "The Lord", "Holy Spirit", "God the Father",
  "Voice of God", "Voice of the Lord", "The Spirit", "Spirit of the Lord",
]);

const PROPHET_NAMES = new Set([
  "Nephi", "Lehi", "Jacob", "Enos", "Jarom", "Mormon", "Moroni",
  "Alma", "Alma the Elder", "Alma the Younger", "Mosiah", "King Benjamin",
  "Helaman", "Samuel the Lamanite", "Abinadi", "Amulek", "Ammon",
  "Aaron", "King Mosiah", "King Limhi", "Zeniff", "Gideon",
  "Captain Moroni", "Pahoran", "Teancum",
  "Moses", "Abraham", "Joseph Smith", "Enoch", "Noah",
  "Brother of Jared", "Ether",
  "Isaiah", "Zenos", "Zenock", "Neum",
]);

const ANGEL_NAMES = new Set([
  "Angel", "Angel of the Lord", "Moroni (angel)",
]);

function classifySpeaker(name: string): SpeakerType {
  if (DIVINE_NAMES.has(name)) return "divine";
  if (ANGEL_NAMES.has(name)) return "angel";
  if (PROPHET_NAMES.has(name)) return "prophet";
  return "other";
}

// ── Text analysis patterns ───────────────────────────────────────────────────

// Patterns that identify a speaker change in BoM text
// These detect "And X said", "X spake", "saith the Lord", "I, X", etc.

interface SpeakerMatch {
  speaker: string;
  speakerType: SpeakerType;
}

// Named speakers we look for in BoM dialogue attribution
const BOM_NAMED_SPEAKERS = [
  // Divine — these patterns indicate God/Lord is actually speaking (not just mentioned)
  { pattern: /\b(?:saith|said|spake)\s+(?:the\s+)?Lord(?:\s+unto|\s*[,:;])/i, speaker: "God", type: "divine" as SpeakerType },
  { pattern: /\bthe\s+Lord\s+(?:said|spake|saith)\s+unto\b/i, speaker: "God", type: "divine" as SpeakerType },
  { pattern: /\bthe\s+voice\s+of\s+the\s+Lord\s+came\b/i, speaker: "God", type: "divine" as SpeakerType },
  { pattern: /\bGod\s+(?:said|spake|saith)\s+unto\b/i, speaker: "God", type: "divine" as SpeakerType },
  { pattern: /\bthus\s+saith\s+the\s+Lord\b/i, speaker: "God", type: "divine" as SpeakerType },
  { pattern: /\bGod\s+spake\s+(?:all\s+)?these\s+words\b/i, speaker: "God", type: "divine" as SpeakerType },
  { pattern: /\bI\s+am\s+Jesus\s+Christ\b/i, speaker: "Jesus Christ", type: "divine" as SpeakerType },
  { pattern: /\bJesus\s+(?:said|spake|saith)\b/i, speaker: "Jesus Christ", type: "divine" as SpeakerType },
  { pattern: /\bChrist\s+(?:said|spake|saith)\b/i, speaker: "Jesus Christ", type: "divine" as SpeakerType },
  { pattern: /\bthe\s+Spirit\s+(?:said|saith)\b/i, speaker: "The Spirit", type: "divine" as SpeakerType },
  { pattern: /\bthe\s+Spirit\s+of\s+the\s+Lord\b.*?\b(?:said|saith)\b/i, speaker: "Spirit of the Lord", type: "divine" as SpeakerType },

  // Angel — only when the angel is directly speaking (not "the angel said unto me" in past tense narration)
  // Use "the angel said unto them/him/her" (addressing someone) as the trigger, not "said unto me" (narrator quoting)
  { pattern: /\bthe\s+angel\s+(?:said|spake|saith)\s+unto\s+(?:them|him|her|the)\b/i, speaker: "Angel", type: "angel" as SpeakerType },
  { pattern: /\b(?:an?\s+)?angel\s+of\s+(?:the\s+)?(?:Lord|God)\s+(?:said|spake|saith)\s+unto\s+(?:them|him|her|the)\b/i, speaker: "Angel", type: "angel" as SpeakerType },

  // BoM prophets/characters — order matters (more specific first)
  { pattern: /\bKing\s+Benjamin\s+(?:said|spake|saith)\b/i, speaker: "King Benjamin", type: "prophet" as SpeakerType },
  { pattern: /\bKing\s+Mosiah\s+(?:said|spake|saith)\b/i, speaker: "King Mosiah", type: "prophet" as SpeakerType },
  { pattern: /\bKing\s+Limhi\s+(?:said|spake|saith)\b/i, speaker: "King Limhi", type: "other" as SpeakerType },
  { pattern: /\bSamuel\s+(?:the\s+Lamanite\s+)?(?:said|spake|saith|prophesied)\b/i, speaker: "Samuel the Lamanite", type: "prophet" as SpeakerType },
  { pattern: /\bCaptain\s+Moroni\s+(?:said|spake|saith|wrote)\b/i, speaker: "Captain Moroni", type: "prophet" as SpeakerType },
  { pattern: /\bAlma\s+(?:said|spake|saith)\b/i, speaker: "Alma", type: "prophet" as SpeakerType },
  { pattern: /\bAmulek\s+(?:said|spake|saith)\b/i, speaker: "Amulek", type: "prophet" as SpeakerType },
  { pattern: /\bAmmon\s+(?:said|spake|saith)\b/i, speaker: "Ammon", type: "prophet" as SpeakerType },
  { pattern: /\bAaron\s+(?:said|spake|saith)\b/i, speaker: "Aaron", type: "prophet" as SpeakerType },
  { pattern: /\bAbinadi\s+(?:said|spake|saith)\b/i, speaker: "Abinadi", type: "prophet" as SpeakerType },
  { pattern: /\bNephi\s+(?:said|spake|saith)\b/i, speaker: "Nephi", type: "prophet" as SpeakerType },
  { pattern: /\bLehi\s+(?:said|spake|saith)\b/i, speaker: "Lehi", type: "prophet" as SpeakerType },
  { pattern: /\bJacob\s+(?:said|spake|saith)\b/i, speaker: "Jacob", type: "prophet" as SpeakerType },
  { pattern: /\bMosiah\s+(?:said|spake|saith)\b/i, speaker: "Mosiah", type: "prophet" as SpeakerType },
  { pattern: /\bHelaman\s+(?:said|spake|saith|wrote)\b/i, speaker: "Helaman", type: "prophet" as SpeakerType },
  { pattern: /\bMoroni\s+(?:said|spake|saith|wrote)\b/i, speaker: "Moroni", type: "prophet" as SpeakerType },
  { pattern: /\bMormon\s+(?:said|spake|saith|wrote)\b/i, speaker: "Mormon", type: "prophet" as SpeakerType },
  { pattern: /\bPahoran\s+(?:said|spake|saith|wrote)\b/i, speaker: "Pahoran", type: "prophet" as SpeakerType },
  { pattern: /\bZeniff\s+(?:said|spake|saith)\b/i, speaker: "Zeniff", type: "other" as SpeakerType },
  { pattern: /\bGideon\s+(?:said|spake|saith)\b/i, speaker: "Gideon", type: "other" as SpeakerType },
  { pattern: /\bGidgiddoni\s+(?:said|spake|saith)\b/i, speaker: "Gidgiddoni", type: "other" as SpeakerType },
  { pattern: /\bLachoneus\s+(?:said|spake|saith)\b/i, speaker: "Lachoneus", type: "other" as SpeakerType },
  { pattern: /\bTeancum\s+(?:said|spake|saith)\b/i, speaker: "Teancum", type: "other" as SpeakerType },

  // First-person narrator identification
  { pattern: /\bI,\s*Nephi\b/i, speaker: "Nephi", type: "prophet" as SpeakerType },
  { pattern: /\bI,\s*Jacob\b/i, speaker: "Jacob", type: "prophet" as SpeakerType },
  { pattern: /\bI,\s*Enos\b/i, speaker: "Enos", type: "prophet" as SpeakerType },
  { pattern: /\bI,\s*Jarom\b/i, speaker: "Jarom", type: "prophet" as SpeakerType },
  { pattern: /\bI,\s*Mormon\b/i, speaker: "Mormon", type: "prophet" as SpeakerType },
  { pattern: /\bI,\s*Moroni\b/i, speaker: "Moroni", type: "prophet" as SpeakerType },
  { pattern: /\bI,\s*Alma\b/i, speaker: "Alma", type: "prophet" as SpeakerType },
  { pattern: /\bI,\s*Amaleki\b/i, speaker: "Amaleki", type: "other" as SpeakerType },
  { pattern: /\bI,\s*Chemish\b/i, speaker: "Chemish", type: "other" as SpeakerType },
  { pattern: /\bI,\s*Amaron\b/i, speaker: "Amaron", type: "other" as SpeakerType },
  { pattern: /\bI,\s*Zeniff\b/i, speaker: "Zeniff", type: "other" as SpeakerType },

  // PoGP speakers
  { pattern: /\bMoses\s+(?:said|spake|saith)\b/i, speaker: "Moses", type: "prophet" as SpeakerType },
  { pattern: /\bAbraham\s+(?:said|spake|saith)\b/i, speaker: "Abraham", type: "prophet" as SpeakerType },
  { pattern: /\bSatan\s+(?:said|spake|saith|came)\b/i, speaker: "Satan", type: "other" as SpeakerType },
  { pattern: /\bI,\s*Moses\b/i, speaker: "Moses", type: "prophet" as SpeakerType },
  { pattern: /\bI,\s*Abraham\b/i, speaker: "Abraham", type: "prophet" as SpeakerType },
  { pattern: /\bEnoch\s+(?:said|spake|saith)\b/i, speaker: "Enoch", type: "prophet" as SpeakerType },
];

/**
 * Try to detect who is speaking in a verse based on text patterns.
 * Returns a match if found, or null if the verse doesn't have a clear speaker cue.
 *
 * @param text - The verse text to analyze
 * @param currentSpeaker - The currently active speaker (for context-aware detection)
 */
function detectSpeaker(text: string, currentSpeaker?: string): SpeakerMatch | null {
  // Check direct speech attribution patterns
  for (const { pattern, speaker, type } of BOM_NAMED_SPEAKERS) {
    if (pattern.test(text)) {
      // Context guard: if Jesus Christ/divine is the current speaker and we detect
      // "Moses spake/said", this is Jesus quoting/referencing Moses — don't switch speaker.
      // Moses only speaks directly in the book of Moses (PoGP), not in the BoM.
      if (currentSpeaker === "Jesus Christ" && speaker === "Moses") {
        continue; // Jesus is referencing Moses, not yielding the floor to him
      }
      // Context guard: if Samuel the Lamanite is speaking and we detect "angel said",
      // this is Samuel quoting an angel — don't switch
      if (currentSpeaker === "Samuel the Lamanite" && speaker === "Angel") {
        if (/\bangel\s+said\s+unto\s+me\b/i.test(text)) {
          continue; // Samuel quoting what the angel told him
        }
      }
      return { speaker, speakerType: type };
    }
  }
  return null;
}

/**
 * Check if a verse is primarily narrative (description of events, not dialogue)
 */
function isNarrativeVerse(text: string): boolean {
  const narrativePatterns = [
    /^And it came to pass/i,
    /^And now it came to pass/i,
    /^Now it came to pass/i,
    /^And it happened/i,
    /^And thus we see/i,
    /^And thus ended/i,
    /^And now\b/i,
    /^Now\b.*?\byear/i,
    /^And in the.*?\byear/i,
    /^Thus\s+(?:we|the)/i,
  ];
  return narrativePatterns.some(p => p.test(text));
}

/**
 * Check if a verse contains a divine first-person speech (God/Jesus speaking in 1st person)
 * This is common in D&C and quoted speech in BoM/PoGP.
 */
function isDivineSpeech(text: string): boolean {
  const divinePatterns = [
    /\bI\s+(?:the\s+)?Lord\b/i,
    /\bI\s+am\s+(?:the\s+)?(?:Lord|God|Alpha|Omega|Christ|Jesus)\b/i,
    /\bmine\s+(?:anger|wrath|arm|hand|eyes|servants|people|church|elect)\b/i,
    /\bmy\s+(?:servant|servants|people|church|gospel|commandments|work|glory|spirit|son|children|disciples|word|words|kingdom|anger|wrath)\b/i,
    /\bsaith\s+(?:the\s+)?(?:Lord|your\s+God|your\s+Redeemer)\b/i,
    /\bthus\s+saith\s+the\s+Lord\b/i,
    /\bI\s+have\s+(?:spoken|commanded|decreed|said)\b/i,
    /\beverlasting\s+covenant\b/i,
  ];
  return divinePatterns.some(p => p.test(text));
}

// ── D&C section analysis ─────────────────────────────────────────────────────

// D&C sections that are primarily Joseph Smith narrating or other speakers
const DC_NARRATOR_SECTIONS = new Set([
  // Official Declarations
  // Section 134 (government), 135 (martyrdom by John Taylor)
  134, 135,
]);

const DC_JOHN_TAYLOR_SECTIONS = new Set([135]);

// Most D&C sections are divine revelation — God/Jesus speaking
// A few have specific other patterns

/**
 * For D&C, determine the primary speaker of a section.
 * The vast majority is God/Jesus Christ speaking in first person.
 */
function getDCSpeaker(section: number, verses: Verse[]): { speaker: string; speakerType: SpeakerType } {
  if (DC_JOHN_TAYLOR_SECTIONS.has(section)) {
    return { speaker: "John Taylor", speakerType: "other" };
  }
  if (section === 134) {
    // Declaration of belief about government — collective/narrator
    return { speaker: "Joseph Smith", speakerType: "prophet" };
  }

  // Check first few verses for divine first-person indicators
  const firstVerses = verses.slice(0, 5).map(v => v.text).join(" ");
  if (isDivineSpeech(firstVerses) ||
      /\bsaith\s+the\s+Lord\b/i.test(firstVerses) ||
      /\bI\s+the\s+Lord\b/i.test(firstVerses) ||
      /\bmy\s+servant/i.test(firstVerses) ||
      /\bHearken/i.test(firstVerses) ||
      /\bVerily.*?I\s+say\b/i.test(firstVerses)) {
    return { speaker: "Jesus Christ", speakerType: "divine" };
  }

  // Default D&C to divine
  return { speaker: "Jesus Christ", speakerType: "divine" };
}

// D&C sections with known speaker splits (not just one speaker throughout)
interface DCSectionOverride {
  /** Verse ranges with their speakers, in order. Verses not covered use getDCSpeaker default. */
  ranges: { verseStart: number; verseEnd: number; speaker: string; speakerType: SpeakerType }[];
}

const DC_SECTION_OVERRIDES: Record<number, DCSectionOverride> = {
  // D&C 121: Joseph Smith's prayer (1-6), then God answers (7-46)
  121: {
    ranges: [
      { verseStart: 1, verseEnd: 6, speaker: "Joseph Smith", speakerType: "prophet" },
      { verseStart: 7, verseEnd: 46, speaker: "Jesus Christ", speakerType: "divine" },
    ],
  },
  // D&C 122: Continuation of God's answer to Joseph in Liberty Jail
  122: {
    ranges: [
      { verseStart: 1, verseEnd: 9, speaker: "Jesus Christ", speakerType: "divine" },
    ],
  },
  // D&C 123: Joseph Smith's instructions to the Saints
  123: {
    ranges: [
      { verseStart: 1, verseEnd: 17, speaker: "Joseph Smith", speakerType: "prophet" },
    ],
  },
  // D&C 135: John Taylor's account of the martyrdom (entire section)
  135: {
    ranges: [
      { verseStart: 1, verseEnd: 7, speaker: "John Taylor", speakerType: "other" },
    ],
  },
};

// ── Main processing functions ────────────────────────────────────────────────

function getChapterVerses(db: Database, bookId: number, chapter: number): Verse[] {
  const results = db.exec(
    `SELECT verse, text FROM verses WHERE book_id = ? AND chapter = ? ORDER BY verse`,
    [bookId, chapter]
  );
  if (!results.length) return [];
  return results[0].values.map((row) => ({
    verse: row[0] as number,
    text: row[1] as string,
  }));
}

/**
 * Get the number of chapters for a book.
 */
function getBookChapterCount(db: Database, bookId: number): number {
  const chapters = getBookChapters(db, bookId);
  return chapters.length;
}

/**
 * Get distinct chapter numbers for a book from the DB.
 * Single-chapter books store verses with chapter=0, so we return actual values.
 */
function getBookChapters(db: Database, bookId: number): number[] {
  const results = db.exec(
    `SELECT DISTINCT chapter FROM verses WHERE book_id = ? ORDER BY chapter`,
    [bookId]
  );
  if (!results.length) return [];
  return results[0].values.map((row) => row[0] as number);
}

/**
 * Get the "display chapter" for output — single-chapter books (chapter=0 in DB)
 * should output chapter=1 in the JSON.
 */
function displayChapter(dbChapter: number): number {
  return dbChapter === 0 ? 1 : dbChapter;
}

/**
 * Process a Book of Mormon book — analyze each chapter for speaker attribution.
 */
function processBomBook(db: Database, meta: BookMeta): SpeakerEntry[] {
  const entries: SpeakerEntry[] = [];
  const chapters = getBookChapters(db, meta.bookId);

  for (const ch of chapters) {
    const verses = getChapterVerses(db, meta.bookId, ch);
    if (!verses.length) continue;

    const chapterEntries = analyzeChapterSpeakers(verses, meta);
    for (const entry of chapterEntries) {
      entries.push({
        book: meta.name,
        chapter: displayChapter(ch),
        ...entry,
      });
    }
  }

  return entries;
}

interface VerseRange {
  verseStart: number;
  verseEnd: number;
  speaker: string;
  speakerType: SpeakerType;
}

/**
 * Analyze a chapter's verses to identify speaker ranges.
 * Groups consecutive verses by the same speaker into ranges.
 */
function analyzeChapterSpeakers(
  verses: Verse[],
  meta: BookMeta
): VerseRange[] {
  const assignments: { verse: number; speaker: string; speakerType: SpeakerType }[] = [];

  let currentSpeaker = meta.defaultNarrator;
  let currentType = meta.narratorType;
  // Track if we're inside a quoted speech block
  let inDivineSpeech = false;

  for (const v of verses) {
    const text = v.text;

    // Try to detect an explicit speaker attribution in this verse
    const detected = detectSpeaker(text, currentSpeaker);

    if (detected) {
      currentSpeaker = detected.speaker;
      currentType = detected.speakerType;
      inDivineSpeech = detected.speakerType === "divine";
    } else if (inDivineSpeech && isDivineSpeech(text)) {
      // Continue divine speech
    } else if (inDivineSpeech && !isDivineSpeech(text) && isNarrativeVerse(text)) {
      // Back to narrator
      currentSpeaker = meta.defaultNarrator;
      currentType = meta.narratorType;
      inDivineSpeech = false;
    }
    // Otherwise keep the current speaker (speech continues across verses)

    assignments.push({
      verse: v.verse,
      speaker: currentSpeaker,
      speakerType: currentType,
    });
  }

  // Merge consecutive same-speaker verses into ranges
  return mergeRanges(assignments);
}

function mergeRanges(
  assignments: { verse: number; speaker: string; speakerType: SpeakerType }[]
): VerseRange[] {
  if (!assignments.length) return [];

  const ranges: VerseRange[] = [];
  let start = assignments[0];
  let end = assignments[0];

  for (let i = 1; i < assignments.length; i++) {
    const curr = assignments[i];
    if (curr.speaker === end.speaker && curr.speakerType === end.speakerType) {
      end = curr;
    } else {
      ranges.push({
        verseStart: start.verse,
        verseEnd: end.verse,
        speaker: start.speaker,
        speakerType: start.speakerType,
      });
      start = curr;
      end = curr;
    }
  }
  // Push last range
  ranges.push({
    verseStart: start.verse,
    verseEnd: end.verse,
    speaker: start.speaker,
    speakerType: start.speakerType,
  });

  return ranges;
}

/**
 * Process D&C — each section is mostly one speaker (usually divine).
 * Still do verse-level analysis for sections with mixed speakers.
 */
function processDC(db: Database): SpeakerEntry[] {
  const entries: SpeakerEntry[] = [];
  const chapters = getBookChapters(db, DC_BOOK.bookId);

  for (const section of chapters) {
    const verses = getChapterVerses(db, DC_BOOK.bookId, section);
    if (!verses.length) continue;

    // Check for explicit section overrides first
    const override = DC_SECTION_OVERRIDES[displayChapter(section)];
    if (override) {
      for (const range of override.ranges) {
        entries.push({
          book: "Doctrine and Covenants",
          chapter: displayChapter(section),
          ...range,
        });
      }
      continue;
    }

    const primary = getDCSpeaker(section, verses);

    // For most D&C sections, do verse-level analysis to find narrator interruptions
    const assignments: { verse: number; speaker: string; speakerType: SpeakerType }[] = [];
    let currentSpeaker = primary.speaker;
    let currentType = primary.speakerType;

    for (const v of verses) {
      const text = v.text;
      const detected = detectSpeaker(text, currentSpeaker);

      if (detected) {
        currentSpeaker = detected.speaker;
        currentType = detected.speakerType;
      } else if (currentType === "divine" && !isDivineSpeech(text) && isNarrativeVerse(text)) {
        // Narrator interlude in otherwise divine speech
        // Keep as narrator briefly
        currentSpeaker = "Joseph Smith";
        currentType = "prophet";
      } else if (currentType === "prophet" && isDivineSpeech(text)) {
        // Return to divine speech
        currentSpeaker = primary.speaker;
        currentType = primary.speakerType;
      }

      assignments.push({ verse: v.verse, speaker: currentSpeaker, speakerType: currentType });
    }

    const ranges = mergeRanges(assignments);
    for (const range of ranges) {
      entries.push({
        book: "Doctrine and Covenants",
        chapter: displayChapter(section),
        ...range,
      });
    }
  }

  return entries;
}

/**
 * Process Pearl of Great Price books.
 */
function processPogp(db: Database): SpeakerEntry[] {
  const entries: SpeakerEntry[] = [];

  for (const meta of POGP_BOOKS) {
    const chapterCount = getBookChapterCount(db, meta.bookId);

    for (let ch = 1; ch <= chapterCount; ch++) {
      const verses = getChapterVerses(db, meta.bookId, ch);
      if (!verses.length) continue;

      let chapterEntries: VerseRange[];

      if (meta.name === "Articles of Faith") {
        // All Joseph Smith
        chapterEntries = [{
          verseStart: 1,
          verseEnd: verses[verses.length - 1].verse,
          speaker: "Joseph Smith",
          speakerType: "prophet",
        }];
      } else if (meta.name === "Joseph Smith—Matthew") {
        // Jesus speaking to his disciples (JS-Matthew is Joseph Smith's translation of Matthew 24)
        chapterEntries = analyzeChapterSpeakers(verses, {
          ...meta,
          defaultNarrator: "Jesus Christ",
          narratorType: "divine",
        });
      } else {
        // Moses, Abraham, JS-History — use standard analysis
        chapterEntries = analyzeChapterSpeakers(verses, meta);
      }

      for (const entry of chapterEntries) {
        entries.push({
          book: meta.name,
          chapter: ch,
          ...entry,
        });
      }
    }
  }

  return entries;
}

// ── Omni special handling ────────────────────────────────────────────────────
// Omni has multiple narrators in a single chapter: Omni, Amaron, Chemish, Abinadom, Amaleki

function processOmni(db: Database): SpeakerEntry[] {
  // Omni is single-chapter; DB stores as chapter=0
  const chapters = getBookChapters(db, 72);
  const chVal = chapters[0] ?? 0;
  const verses = getChapterVerses(db, 72, chVal);
  if (!verses.length) return [];

  const assignments: { verse: number; speaker: string; speakerType: SpeakerType }[] = [];
  let currentSpeaker = "Omni";
  let currentType: SpeakerType = "other";

  for (const v of verses) {
    const text = v.text;
    // Check for narrator switches in Omni
    if (/\bI(?:,\s*|\s+am\s+)Omni\b/i.test(text)) {
      currentSpeaker = "Omni";
      currentType = "other";
    } else if (/\bI(?:,\s*|\s+am\s+)Amaron\b/i.test(text)) {
      currentSpeaker = "Amaron";
      currentType = "other";
    } else if (/\bI(?:,\s*|\s+am\s+)Chemish\b/i.test(text)) {
      currentSpeaker = "Chemish";
      currentType = "other";
    } else if (/\bI(?:,\s*|\s+am\s+)Abinadom\b/i.test(text)) {
      currentSpeaker = "Abinadom";
      currentType = "other";
    } else if (/\bI(?:,\s*|\s+am\s+)Amaleki\b/i.test(text)) {
      currentSpeaker = "Amaleki";
      currentType = "other";
    } else {
      const detected = detectSpeaker(text);
      if (detected) {
        currentSpeaker = detected.speaker;
        currentType = detected.speakerType;
      }
    }

    assignments.push({ verse: v.verse, speaker: currentSpeaker, speakerType: currentType });
  }

  const ranges = mergeRanges(assignments);
  return ranges.map(r => ({
    book: "Omni",
    chapter: 1,
    ...r,
  }));
}

// ── King Benjamin speech detection ───────────────────────────────────────────
// Mosiah 2-5 is King Benjamin's address

function isKingBenjaminChapter(bookName: string, chapter: number): boolean {
  return bookName === "Mosiah" && chapter >= 2 && chapter <= 5;
}

// ── Alma speech chapters ─────────────────────────────────────────────────────
// Alma speaks extensively in many chapters of Alma

function getAlmaSpecialNarrator(chapter: number): BookMeta | null {
  // Alma 5-16: Alma the Younger preaches
  if (chapter >= 5 && chapter <= 16) {
    return { bookId: 75, name: "Alma", defaultNarrator: "Alma", narratorType: "prophet" };
  }
  // Alma 17-26: Story of sons of Mosiah (Ammon etc.), narrated by Mormon
  // Alma 29: Alma's psalm
  if (chapter === 29) {
    return { bookId: 75, name: "Alma", defaultNarrator: "Alma", narratorType: "prophet" };
  }
  // Alma 32-33: Alma preaches to Zoramites
  if (chapter >= 32 && chapter <= 33) {
    return { bookId: 75, name: "Alma", defaultNarrator: "Alma", narratorType: "prophet" };
  }
  // Alma 34: Amulek preaches to Zoramites
  if (chapter === 34) {
    return { bookId: 75, name: "Alma", defaultNarrator: "Amulek", narratorType: "prophet" };
  }
  // Alma 36-42: Alma's counsel to his sons
  if (chapter >= 36 && chapter <= 42) {
    return { bookId: 75, name: "Alma", defaultNarrator: "Alma", narratorType: "prophet" };
  }
  return null;
}

// ── 3 Nephi Jesus Christ chapters ────────────────────────────────────────────
// 3 Nephi 11-28: Jesus Christ visits the Nephites

function is3NephiJesusChapter(chapter: number): boolean {
  return chapter >= 11 && chapter <= 28;
}

// ── Explicit chapter overrides for tricky BoM/PoGP chapters ─────────────────
// When text-pattern detection can't correctly identify the speaker (e.g., "I, Nephi"
// appearing in a verse that introduces Lehi's speech), use explicit verse-range overrides.

interface ChapterOverride {
  ranges: { verseStart: number; verseEnd: number; speaker: string; speakerType: SpeakerType }[];
}

/**
 * Returns explicit verse-range overrides for chapters where automated detection fails.
 * Returns null if no override is needed (automated detection should be used).
 */
function getChapterOverride(bookName: string, chapter: number): ChapterOverride | null {
  const key = `${bookName}:${chapter}`;
  switch (key) {
    // 2 Nephi 1: Verse 1 is Nephi's brief intro, then Lehi speaks for the rest
    case "2 Nephi:1":
      return { ranges: [
        { verseStart: 1, verseEnd: 1, speaker: "Nephi", speakerType: "prophet" },
        { verseStart: 2, verseEnd: 32, speaker: "Lehi", speakerType: "prophet" },
      ]};
    // 2 Nephi 4: Verses 1-2 Nephi introduces, 3-11 Lehi blesses, 12+ Nephi (Psalm of Nephi)
    case "2 Nephi:4":
      return { ranges: [
        { verseStart: 1, verseEnd: 2, speaker: "Nephi", speakerType: "prophet" },
        { verseStart: 3, verseEnd: 11, speaker: "Lehi", speakerType: "prophet" },
        { verseStart: 12, verseEnd: 35, speaker: "Nephi", speakerType: "prophet" },
      ]};
    // 2 Nephi 11: Verse 1 = Nephi narrating (he refers to Jacob in 3rd person)
    // The pattern "Jacob spake" in verse 1 should not make Jacob the speaker of the verse
    case "2 Nephi:11":
      return { ranges: [
        { verseStart: 1, verseEnd: 8, speaker: "Nephi", speakerType: "prophet" },
      ]};
    default:
      return null;
  }
}

// ── Enhanced BoM processing with special chapter handling ────────────────────

function processBomBookEnhanced(db: Database, meta: BookMeta): SpeakerEntry[] {
  const entries: SpeakerEntry[] = [];
  const chapters = getBookChapters(db, meta.bookId);

  // Special case: Omni
  if (meta.bookId === 72) {
    return processOmni(db);
  }

  for (const ch of chapters) {
    const verses = getChapterVerses(db, meta.bookId, ch);
    if (!verses.length) continue;

    // Use display chapter for all chapter-based logic (single-chapter books use 0 in DB)
    const dch = displayChapter(ch);

    // Check for explicit chapter overrides first (bypasses automated detection)
    const override = getChapterOverride(meta.name, dch);
    if (override) {
      for (const range of override.ranges) {
        entries.push({ book: meta.name, chapter: dch, ...range });
      }
      continue;
    }

    let effectiveMeta = { ...meta };

    // King Benjamin's speech (Mosiah 2-5)
    if (isKingBenjaminChapter(meta.name, dch)) {
      effectiveMeta.defaultNarrator = "King Benjamin";
      effectiveMeta.narratorType = "prophet";
    }

    // 3 Nephi: Jesus Christ visits
    if (meta.name === "3 Nephi" && is3NephiJesusChapter(dch)) {
      effectiveMeta.defaultNarrator = "Jesus Christ";
      effectiveMeta.narratorType = "divine";
    }

    // Alma special chapters
    if (meta.name === "Alma") {
      const special = getAlmaSpecialNarrator(dch);
      if (special) {
        effectiveMeta.defaultNarrator = special.defaultNarrator;
        effectiveMeta.narratorType = special.narratorType;
      }
    }

    // Helaman 13-15: Samuel the Lamanite
    if (meta.name === "Helaman" && dch >= 13 && dch <= 15) {
      effectiveMeta.defaultNarrator = "Samuel the Lamanite";
      effectiveMeta.narratorType = "prophet";
    }

    // Mosiah 9-10: Zeniff narrates
    if (meta.name === "Mosiah" && (dch === 9 || dch === 10)) {
      effectiveMeta.defaultNarrator = "Zeniff";
      effectiveMeta.narratorType = "other";
    }

    // Mosiah 11-17: Abinadi's trial and preaching
    if (meta.name === "Mosiah" && dch >= 12 && dch <= 16) {
      effectiveMeta.defaultNarrator = "Abinadi";
      effectiveMeta.narratorType = "prophet";
    }

    // 2 Nephi 1-4: Lehi's farewell speech and blessings to his sons
    if (meta.name === "2 Nephi" && dch >= 1 && dch <= 4) {
      effectiveMeta.defaultNarrator = "Lehi";
      effectiveMeta.narratorType = "prophet";
    }

    // 2 Nephi 6-10: Jacob's sermon (includes Isaiah quotations in ch 7-8)
    if (meta.name === "2 Nephi" && dch >= 6 && dch <= 10) {
      effectiveMeta.defaultNarrator = "Jacob";
      effectiveMeta.narratorType = "prophet";
    }

    // 2 Nephi 12-24: Isaiah quotation
    if (meta.name === "2 Nephi" && dch >= 12 && dch <= 24) {
      effectiveMeta.defaultNarrator = "Isaiah";
      effectiveMeta.narratorType = "prophet";
    }

    // Ether 12: Moroni inserts his own commentary
    if (meta.name === "Ether" && dch === 12) {
      effectiveMeta.defaultNarrator = "Moroni";
      effectiveMeta.narratorType = "prophet";
    }

    // Mormon 8-9: Moroni writes (Mormon 7 is still Mormon's final address)
    if (meta.name === "Mormon" && dch >= 8 && dch <= 9) {
      effectiveMeta.defaultNarrator = "Moroni";
      effectiveMeta.narratorType = "prophet";
    }

    const chapterEntries = analyzeChapterSpeakers(verses, effectiveMeta);
    for (const entry of chapterEntries) {
      entries.push({
        book: meta.name,
        chapter: dch,
        ...entry,
      });
    }
  }

  return entries;
}

// ── Moses special handling ───────────────────────────────────────────────────
// Moses 1: God speaks to Moses, then Satan, then God again
// Moses 2-5: God speaks (creation account, narrated as God speaking)
// Moses 6-7: Enoch narrative + God/Enoch dialogue
// Moses 8: Noah narrative

function processMoses(db: Database): SpeakerEntry[] {
  const meta: BookMeta = { bookId: 83, name: "Moses", defaultNarrator: "Moses", narratorType: "prophet" };
  const entries: SpeakerEntry[] = [];
  const chapters = getBookChapters(db, meta.bookId);

  for (const ch of chapters) {
    const verses = getChapterVerses(db, meta.bookId, ch);
    if (!verses.length) continue;

    const dch = displayChapter(ch);
    let effectiveMeta = { ...meta };

    // Moses 2-3: Creation account — God speaking
    if (dch >= 2 && dch <= 3) {
      effectiveMeta.defaultNarrator = "God";
      effectiveMeta.narratorType = "divine";
    }
    // Moses 6-7: Enoch sections
    if (dch === 6 || dch === 7) {
      effectiveMeta.defaultNarrator = "Enoch";
      effectiveMeta.narratorType = "prophet";
    }

    const chapterEntries = analyzeChapterSpeakers(verses, effectiveMeta);
    for (const entry of chapterEntries) {
      entries.push({
        book: meta.name,
        chapter: dch,
        ...entry,
      });
    }
  }

  return entries;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("Loading scripture database...");
  const SQL = await initSqlJs({
    locateFile: (file: string) => path.join(DATA_DIR, file),
  });
  const buf = fs.readFileSync(DB_PATH);
  const db = new SQL.Database(buf);
  console.log("Database loaded.");

  const allEntries: SpeakerEntry[] = [];

  // ── Book of Mormon ──
  console.log("\n=== Book of Mormon ===");
  for (const meta of BOM_BOOKS) {
    const entries = processBomBookEnhanced(db, meta);
    allEntries.push(...entries);
    console.log(`  ${meta.name}: ${entries.length} speaker ranges`);
  }

  // ── D&C ──
  console.log("\n=== Doctrine & Covenants ===");
  const dcEntries = processDC(db);
  allEntries.push(...dcEntries);
  console.log(`  D&C: ${dcEntries.length} speaker ranges (${getBookChapters(db, 82).length} sections)`);

  // ── Pearl of Great Price ──
  console.log("\n=== Pearl of Great Price ===");
  // Moses gets special handling
  const mosesEntries = processMoses(db);
  allEntries.push(...mosesEntries);
  console.log(`  Moses: ${mosesEntries.length} speaker ranges`);

  // Other PoGP books
  for (const meta of POGP_BOOKS.filter(b => b.bookId !== 83)) {
    const chapters = getBookChapters(db, meta.bookId);
    let bookEntries: SpeakerEntry[] = [];

    for (const ch of chapters) {
      const verses = getChapterVerses(db, meta.bookId, ch);
      if (!verses.length) continue;

      const dch = displayChapter(ch);
      let effectiveMeta = { ...meta };

      // JS-Matthew: Jesus speaking
      if (meta.name === "Joseph Smith\u2014Matthew") {
        effectiveMeta.defaultNarrator = "Jesus Christ";
        effectiveMeta.narratorType = "divine";
      }

      if (meta.name === "Articles of Faith") {
        bookEntries.push({
          book: meta.name,
          chapter: dch,
          verseStart: 1,
          verseEnd: verses[verses.length - 1].verse,
          speaker: "Joseph Smith",
          speakerType: "prophet",
        });
        continue;
      }

      const chapterEntries = analyzeChapterSpeakers(verses, effectiveMeta);
      for (const entry of chapterEntries) {
        bookEntries.push({
          book: meta.name,
          chapter: dch,
          ...entry,
        });
      }
    }

    allEntries.push(...bookEntries);
    console.log(`  ${meta.name}: ${bookEntries.length} speaker ranges`);
  }

  // Write output
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(allEntries, null, 2), "utf-8");

  // Stats
  const byType: Record<string, number> = {};
  for (const e of allEntries) {
    byType[e.speakerType] = (byType[e.speakerType] || 0) + 1;
  }
  const uniqueSpeakers = new Set(allEntries.map(e => e.speaker)).size;
  const uniqueBooks = new Set(allEntries.map(e => e.book)).size;

  console.log(`\nOutput: ${OUTPUT_PATH}`);
  console.log(`Total entries: ${allEntries.length}`);
  console.log(`Unique speakers: ${uniqueSpeakers}`);
  console.log(`Unique books: ${uniqueBooks}`);
  console.log(`By type:`, byType);
  console.log(`\nSample entries:`);
  allEntries.slice(0, 10).forEach(e =>
    console.log(`  ${e.book} ${e.chapter}:${e.verseStart}-${e.verseEnd} "${e.speaker}" [${e.speakerType}]`)
  );

  db.close();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
