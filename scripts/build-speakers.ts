/**
 * build-speakers.ts
 *
 * Downloads speaker-quotation data from Clear-Bible/speaker-quotations on GitHub
 * and transforms it into data/speakers.json for use in Scripture Explorer.
 *
 * Source: https://github.com/Clear-Bible/speaker-quotations
 * Uses the ESV-Aligned-Projections.tsv (verse-level speaker assignments)
 *
 * Run: npx tsx scripts/build-speakers.ts
 */

import fs from "fs";
import path from "path";

const DATA_DIR = path.join(__dirname, "..", "data");
const TSV_PATH = path.join(DATA_DIR, "esv-speaker-projections.tsv");
const OUTPUT_PATH = path.join(DATA_DIR, "speakers.json");
const TSV_URL = "https://raw.githubusercontent.com/Clear-Bible/speaker-quotations/main/tsv/ESV-Aligned-Projections.tsv";

// ── Book abbreviation → our canonical book name ──────────────────────────────

const BOOK_ABBREV_MAP: Record<string, string> = {
  // Old Testament
  GEN: "Genesis",
  EXO: "Exodus",
  LEV: "Leviticus",
  NUM: "Numbers",
  DEU: "Deuteronomy",
  JOS: "Joshua",
  JDG: "Judges",
  RUT: "Ruth",
  "1SA": "1 Samuel",
  "2SA": "2 Samuel",
  "1KI": "1 Kings",
  "2KI": "2 Kings",
  "1CH": "1 Chronicles",
  "2CH": "2 Chronicles",
  EZR: "Ezra",
  NEH: "Nehemiah",
  EST: "Esther",
  JOB: "Job",
  PSA: "Psalms",
  PRO: "Proverbs",
  ECC: "Ecclesiastes",
  SNG: "Song of Solomon",
  ISA: "Isaiah",
  JER: "Jeremiah",
  LAM: "Lamentations",
  EZK: "Ezekiel",
  DAN: "Daniel",
  HOS: "Hosea",
  JOL: "Joel",
  AMO: "Amos",
  OBA: "Obadiah",
  JON: "Jonah",
  MIC: "Micah",
  NAM: "Nahum",
  HAB: "Habakkuk",
  ZEP: "Zephaniah",
  HAG: "Haggai",
  ZEC: "Zechariah",
  MAL: "Malachi",

  // New Testament
  MAT: "Matthew",
  MRK: "Mark",
  LUK: "Luke",
  JHN: "John",
  ACT: "Acts",
  ROM: "Romans",
  "1CO": "1 Corinthians",
  "2CO": "2 Corinthians",
  GAL: "Galatians",
  EPH: "Ephesians",
  PHP: "Philippians",
  COL: "Colossians",
  "1TH": "1 Thessalonians",
  "2TH": "2 Thessalonians",
  "1TI": "1 Timothy",
  "2TI": "2 Timothy",
  TIT: "Titus",
  PHM: "Philemon",
  HEB: "Hebrews",
  JAS: "James",
  "1PE": "1 Peter",
  "2PE": "2 Peter",
  "1JN": "1 John",
  "2JN": "2 John",
  "3JN": "3 John",
  JUD: "Jude",
  REV: "Revelation",
};

// ── Speaker type classification ──────────────────────────────────────────────

type SpeakerType = "divine" | "narrator" | "prophet" | "apostle" | "angel" | "other";

/** Speakers marked with Divinity=Y in character_detail.semantic_data.tsv */
const DIVINE_SPEAKERS = new Set([
  "God",
  "Jesus",
  "Jesus (child)",
  "Holy Spirit, the",
]);

/** Angel-related speaker names (exact or pattern match) */
const ANGEL_PATTERNS = [
  /^angel/i,
  /^angels/i,
  /^Yahweh's angel$/i,
  /^Michael, archangel$/i,
  /^Gabriel$/i,
  /^men dressed in white/i,
  /^angels in white/i,
  /^angels at Sodom/i,
  /^angels?, all the$/i,
  /^angels?, many$/i,
];

/** Known prophets (OT prophets who appear as speakers) */
const PROPHET_NAMES = new Set([
  "Moses",
  "Samuel",
  "Elijah",
  "Elisha",
  "Isaiah",
  "Jeremiah",
  "Ezekiel",
  "Daniel",
  "Hosea",
  "Joel",
  "Amos",
  "Obadiah",
  "Jonah",
  "Micah",
  "Nahum",
  "Habakkuk",
  "Zephaniah",
  "Haggai",
  "Zechariah",
  "Malachi",
  "Nathan the prophet",
  "Gad the seer",
  "Ahijah the prophet",
  "Agabus the prophet",
  "John the Baptist",
]);

/** Known apostles */
const APOSTLE_NAMES = new Set([
  "Peter (Simon)",
  "Paul (Saul)",
  "John",
  "James, brother of Jesus",
  "Andrew",
  "Philip",
  "Thomas",
  "Bartholomew",
  "Matthew (Levi)",
  "James, son of Zebedee",
  "James, son of Alphaeus",
  "Judas (not Iscariot)",
  "Matthias",
  "Barnabas",
]);

/** Patterns that indicate narrator/voice-from-heaven type speakers */
const VOICE_PATTERNS = [
  /^voice from heaven/i,
  /^voice from throne/i,
  /^voice from temple/i,
  /^voice from altar/i,
  /^voice from among/i,
  /^voice in heaven/i,
  /^voices in heaven/i,
  /^voice of great crowd/i,
  /^voice of one calling/i,
];

function classifySpeaker(speaker: string): SpeakerType {
  // Divine speakers
  if (DIVINE_SPEAKERS.has(speaker)) return "divine";

  // Voice from heaven — often God or divine
  for (const pat of VOICE_PATTERNS) {
    if (pat.test(speaker)) return "divine";
  }

  // Angels
  for (const pat of ANGEL_PATTERNS) {
    if (pat.test(speaker)) return "angel";
  }

  // Prophets
  if (PROPHET_NAMES.has(speaker)) return "prophet";
  if (/^man of God/i.test(speaker)) return "prophet";

  // Apostles
  if (APOSTLE_NAMES.has(speaker)) return "apostle";

  return "other";
}

// ── Verse reference parsing ──────────────────────────────────────────────────

interface VerseRef {
  book: string;
  chapter: number;
  verse: number;
}

/**
 * Parse "GEN 1:3" → { book: "Genesis", chapter: 1, verse: 3 }
 */
function parseVerseRef(ref: string): VerseRef | null {
  // Format: "ABBR CH:VS" e.g. "GEN 1:3" or "1SA 1:8"
  const match = ref.match(/^(\d?[A-Z]{2,3})\s+(\d+):(\d+)$/);
  if (!match) return null;
  const [, abbrev, ch, vs] = match;
  const book = BOOK_ABBREV_MAP[abbrev];
  if (!book) return null;
  return { book, chapter: parseInt(ch, 10), verse: parseInt(vs, 10) };
}

// ── Main ─────────────────────────────────────────────────────────────────────

interface SpeakerEntry {
  book: string;
  chapter: number;
  verseStart: number;
  verseEnd: number;
  speaker: string;
  speakerType: SpeakerType;
}

async function downloadTsv(): Promise<string> {
  if (fs.existsSync(TSV_PATH)) {
    console.log(`Using cached TSV: ${TSV_PATH}`);
    return fs.readFileSync(TSV_PATH, "utf-8");
  }
  console.log(`Downloading from ${TSV_URL} ...`);
  const resp = await fetch(TSV_URL);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
  const text = await resp.text();
  fs.writeFileSync(TSV_PATH, text, "utf-8");
  console.log(`Saved to ${TSV_PATH} (${text.length} bytes)`);
  return text;
}

async function main() {
  const tsv = await downloadTsv();
  const lines = tsv.split("\n").filter((l) => l.trim());

  // Skip header
  const header = lines[0];
  console.log(`Header: ${header.substring(0, 120)}...`);
  console.log(`Total data rows: ${lines.length - 1}`);

  const entries: SpeakerEntry[] = [];
  const unmappedBooks = new Set<string>();
  let skippedRows = 0;

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split("\t");
    // Columns: KEY, START VS, END VS, SPEAKER (FCBH), ALT SPEAKER, ...
    const startVsRaw = cols[1]?.trim();
    const endVsRaw = cols[2]?.trim();
    const speaker = cols[3]?.trim();

    if (!startVsRaw || !endVsRaw || !speaker) {
      skippedRows++;
      continue;
    }

    const startRef = parseVerseRef(startVsRaw);
    const endRef = parseVerseRef(endVsRaw);

    if (!startRef) {
      // Extract abbreviation for debugging
      const abbrevMatch = startVsRaw.match(/^(\d?[A-Z]{2,3})/);
      if (abbrevMatch) unmappedBooks.add(abbrevMatch[1]);
      skippedRows++;
      continue;
    }

    if (!endRef) {
      skippedRows++;
      continue;
    }

    // Normalize speaker name for display (remove parenthetical clarifications for cleaner output)
    const displaySpeaker = normalizeSpeakerName(speaker);

    // If the quotation spans multiple chapters, split into per-chapter entries
    if (startRef.book === endRef.book && startRef.chapter === endRef.chapter) {
      entries.push({
        book: startRef.book,
        chapter: startRef.chapter,
        verseStart: startRef.verse,
        verseEnd: endRef.verse,
        speaker: displaySpeaker,
        speakerType: classifySpeaker(speaker),
      });
    } else if (startRef.book === endRef.book) {
      // Same book, different chapters — create one entry per chapter
      // First chapter: from start verse to end of chapter (use 200 as max)
      entries.push({
        book: startRef.book,
        chapter: startRef.chapter,
        verseStart: startRef.verse,
        verseEnd: 200, // sentinel for "end of chapter"
        speaker: displaySpeaker,
        speakerType: classifySpeaker(speaker),
      });
      // Middle chapters (if any)
      for (let ch = startRef.chapter + 1; ch < endRef.chapter; ch++) {
        entries.push({
          book: startRef.book,
          chapter: ch,
          verseStart: 1,
          verseEnd: 200,
          speaker: displaySpeaker,
          speakerType: classifySpeaker(speaker),
        });
      }
      // Last chapter: verse 1 to end verse
      entries.push({
        book: endRef.book,
        chapter: endRef.chapter,
        verseStart: 1,
        verseEnd: endRef.verse,
        speaker: displaySpeaker,
        speakerType: classifySpeaker(speaker),
      });
    } else {
      // Cross-book quotations (very rare) — just use start ref
      entries.push({
        book: startRef.book,
        chapter: startRef.chapter,
        verseStart: startRef.verse,
        verseEnd: startRef.verse,
        speaker: displaySpeaker,
        speakerType: classifySpeaker(speaker),
      });
    }
  }

  if (unmappedBooks.size > 0) {
    console.warn(`Unmapped book abbreviations: ${[...unmappedBooks].join(", ")}`);
  }
  console.log(`Skipped rows: ${skippedRows}`);

  // Sort by book order, chapter, verse
  const bookOrder = new Map<string, number>();
  Object.values(BOOK_ABBREV_MAP).forEach((name, idx) => bookOrder.set(name, idx));

  entries.sort((a, b) => {
    const bookDiff = (bookOrder.get(a.book) ?? 999) - (bookOrder.get(b.book) ?? 999);
    if (bookDiff !== 0) return bookDiff;
    if (a.chapter !== b.chapter) return a.chapter - b.chapter;
    return a.verseStart - b.verseStart;
  });

  // Write output
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(entries, null, 2), "utf-8");

  // Stats
  const byType: Record<string, number> = {};
  for (const e of entries) {
    byType[e.speakerType] = (byType[e.speakerType] || 0) + 1;
  }
  const uniqueSpeakers = new Set(entries.map((e) => e.speaker)).size;
  const uniqueBooks = new Set(entries.map((e) => e.book)).size;

  console.log(`\nOutput: ${OUTPUT_PATH}`);
  console.log(`Total entries: ${entries.length}`);
  console.log(`Unique speakers: ${uniqueSpeakers}`);
  console.log(`Unique books: ${uniqueBooks}`);
  console.log(`By type:`, byType);
  console.log(`\nSample entries:`);
  entries.slice(0, 5).forEach((e) => console.log(`  ${e.book} ${e.chapter}:${e.verseStart}-${e.verseEnd} "${e.speaker}" [${e.speakerType}]`));
}

/**
 * Clean up speaker names for display.
 * Keep them recognizable but trim very long clarifications.
 */
function normalizeSpeakerName(raw: string): string {
  // Common patterns to simplify
  const simplifications: [RegExp, string][] = [
    [/^Abraham \(Abram\)$/, "Abraham"],
    [/^Peter \(Simon\)$/, "Peter"],
    [/^Paul \(Saul\)$/, "Paul"],
    [/^Matthew \(Levi\)$/, "Matthew"],
    [/^Jacob \(Israel\)$/, "Jacob"],
    [/^Gideon \(Jerubbaal\)$/, "Gideon"],
    [/^Joshua \(Moses' aide\)$/, "Joshua"],
    [/^Holy Spirit, the$/, "Holy Spirit"],
    [/^Jesus \(child\)$/, "Jesus"],
    [/^Judas Iscariot$/, "Judas Iscariot"],
    [/^Judas \(not Iscariot\)$/, "Judas (not Iscariot)"],
    [/^James, brother of Jesus$/, "James"],
    [/^James, son of Zebedee$/, "James son of Zebedee"],
  ];

  for (const [pat, replacement] of simplifications) {
    if (pat.test(raw)) return replacement;
  }

  // Trim very long names: if over 40 chars, try to cut at first comma or parenthesis
  if (raw.length > 40) {
    const commaIdx = raw.indexOf(",");
    const parenIdx = raw.indexOf("(");
    const cutIdx = Math.min(
      commaIdx > 0 ? commaIdx : 999,
      parenIdx > 0 ? parenIdx : 999
    );
    if (cutIdx < 999 && cutIdx > 3) {
      return raw.substring(0, cutIdx).trim();
    }
  }

  return raw;
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
