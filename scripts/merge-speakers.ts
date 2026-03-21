/**
 * merge-speakers.ts
 *
 * Merges data/speakers.json (Bible — OT + NT) with data/speakers-lds.json
 * (Book of Mormon, D&C, Pearl of Great Price) into a single speakers.json.
 *
 * Run: npx tsx scripts/merge-speakers.ts
 */

import fs from "fs";
import path from "path";

const DATA_DIR = path.join(__dirname, "..", "data");
const BIBLE_PATH = path.join(DATA_DIR, "speakers.json");
const LDS_PATH = path.join(DATA_DIR, "speakers-lds.json");
const OUTPUT_PATH = path.join(DATA_DIR, "speakers.json");
const BACKUP_PATH = path.join(DATA_DIR, "speakers-bible-backup.json");

interface SpeakerEntry {
  book: string;
  chapter: number;
  verseStart: number;
  verseEnd: number;
  speaker: string;
  speakerType: string;
}

// Canonical book order for sorting (all 87 books)
const BOOK_ORDER: string[] = [
  // OT (39 books)
  "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy",
  "Joshua", "Judges", "Ruth", "1 Samuel", "2 Samuel",
  "1 Kings", "2 Kings", "1 Chronicles", "2 Chronicles",
  "Ezra", "Nehemiah", "Esther", "Job", "Psalms", "Proverbs",
  "Ecclesiastes", "Song of Solomon", "Isaiah", "Jeremiah", "Lamentations",
  "Ezekiel", "Daniel", "Hosea", "Joel", "Amos",
  "Obadiah", "Jonah", "Micah", "Nahum", "Habakkuk",
  "Zephaniah", "Haggai", "Zechariah", "Malachi",
  // NT (27 books)
  "Matthew", "Mark", "Luke", "John", "Acts",
  "Romans", "1 Corinthians", "2 Corinthians", "Galatians", "Ephesians",
  "Philippians", "Colossians", "1 Thessalonians", "2 Thessalonians",
  "1 Timothy", "2 Timothy", "Titus", "Philemon", "Hebrews",
  "James", "1 Peter", "2 Peter", "1 John", "2 John", "3 John",
  "Jude", "Revelation",
  // BoM (15 books)
  "1 Nephi", "2 Nephi", "Jacob", "Enos", "Jarom", "Omni",
  "Words of Mormon", "Mosiah", "Alma", "Helaman",
  "3 Nephi", "4 Nephi", "Mormon", "Ether", "Moroni",
  // D&C (1 book)
  "Doctrine and Covenants",
  // PoGP (5 books)
  "Moses", "Abraham", "Joseph Smith\u2014Matthew", "Joseph Smith\u2014History", "Articles of Faith",
];

function main() {
  // Read both files
  if (!fs.existsSync(BIBLE_PATH)) {
    console.error(`Bible speakers file not found: ${BIBLE_PATH}`);
    process.exit(1);
  }
  if (!fs.existsSync(LDS_PATH)) {
    console.error(`LDS speakers file not found: ${LDS_PATH}`);
    console.error("Run: npx tsx scripts/build-speakers-lds.ts");
    process.exit(1);
  }

  const bible: SpeakerEntry[] = JSON.parse(fs.readFileSync(BIBLE_PATH, "utf-8"));
  const lds: SpeakerEntry[] = JSON.parse(fs.readFileSync(LDS_PATH, "utf-8"));

  // Check if speakers.json already has LDS data (idempotent merge)
  const bibleBooks = new Set(bible.map(e => e.book));
  const ldsBooks = new Set(lds.map(e => e.book));
  const overlap = [...ldsBooks].filter(b => bibleBooks.has(b));

  let combined: SpeakerEntry[];
  if (overlap.length > 0) {
    console.warn(`Warning: ${overlap.length} books appear in both files: ${overlap.join(", ")}`);
    console.warn("Filtering out LDS books from Bible data to avoid duplicates.");
    // Remove any LDS books that already exist in Bible data
    const filteredBible = bible.filter(e => !ldsBooks.has(e.book));
    console.log(`Bible entries: ${filteredBible.length} (was ${bible.length})`);
    combined = [...filteredBible, ...lds];
  } else {
    // Back up the original Bible-only speakers.json
    if (!fs.existsSync(BACKUP_PATH)) {
      fs.copyFileSync(BIBLE_PATH, BACKUP_PATH);
      console.log(`Backed up original to ${BACKUP_PATH}`);
    }
    combined = [...bible, ...lds];
  }

  // Build order map
  const orderMap = new Map<string, number>();
  BOOK_ORDER.forEach((name, idx) => orderMap.set(name, idx));

  // Deduplicate exact duplicates (same book, chapter, verseStart, verseEnd, speaker)
  const seen = new Set<string>();
  const deduped: SpeakerEntry[] = [];
  for (const e of combined) {
    const key = `${e.book}|${e.chapter}|${e.verseStart}|${e.verseEnd}|${e.speaker}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(e);
    }
  }
  const dupeCount = combined.length - deduped.length;
  if (dupeCount > 0) {
    console.log(`  Removed ${dupeCount} exact duplicates`);
  }
  combined = deduped;

  // Sort by book order, chapter, verse
  combined.sort((a, b) => {
    const bookDiff = (orderMap.get(a.book) ?? 999) - (orderMap.get(b.book) ?? 999);
    if (bookDiff !== 0) return bookDiff;
    if (a.chapter !== b.chapter) return a.chapter - b.chapter;
    return a.verseStart - b.verseStart;
  });

  // Write merged output
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(combined, null, 2), "utf-8");

  // Stats
  const byType: Record<string, number> = {};
  for (const e of combined) {
    byType[e.speakerType] = (byType[e.speakerType] || 0) + 1;
  }
  const uniqueSpeakers = new Set(combined.map(e => e.speaker)).size;
  const uniqueBooks = new Set(combined.map(e => e.book)).size;

  console.log(`\nMerge complete!`);
  console.log(`  Bible entries: ${bible.length}`);
  console.log(`  LDS entries: ${lds.length}`);
  console.log(`  Total combined: ${combined.length}`);
  console.log(`  Unique speakers: ${uniqueSpeakers}`);
  console.log(`  Unique books: ${uniqueBooks}`);
  console.log(`  By type:`, byType);
  console.log(`\nOutput: ${OUTPUT_PATH}`);
}

main();
