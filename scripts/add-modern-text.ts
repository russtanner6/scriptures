/**
 * add-modern-text.ts
 *
 * Adds a `text_modern` column to the verses table and populates it with
 * World English Bible (WEB) text for OT + NT books.
 *
 * Source: data/web-bible.json (WEBU — public domain)
 *
 * Mapping strategy:
 * - Most chapters: direct match by book + chapter + verse number
 * - Chapters where KJV/WEB have different verse counts: content-based alignment
 *   using word overlap similarity to handle verse number shifts
 * - Single-chapter books: DB stores ch=0, WEB stores ch=1 — handled automatically
 *
 * Run: npx tsx scripts/add-modern-text.ts
 */

import fs from "fs";
import path from "path";
import initSqlJs from "sql.js";

const DATA_DIR = path.join(__dirname, "..", "data");
const DB_PATH = path.join(DATA_DIR, "scriptures.db");
const WEB_PATH = path.join(DATA_DIR, "web-bible.json");

interface WebVerse {
  translation: string;
  book: string;
  chapter: number;
  verse: number;
  text: string;
}

/**
 * Compute word overlap between two texts (Jaccard-like score).
 * Returns 0-1 where 1 = identical word sets.
 */
function wordOverlap(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().replace(/[.,;:!?"'()]/g, "").split(/\s+/).filter(Boolean));
  const wordsB = new Set(b.toLowerCase().replace(/[.,;:!?"'()]/g, "").split(/\s+/).filter(Boolean));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  let intersection = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) intersection++;
  }
  return intersection / Math.max(wordsA.size, wordsB.size);
}

async function main() {
  // Load WEB data
  console.log("Loading WEB Bible data...");
  const webData: WebVerse[] = JSON.parse(fs.readFileSync(WEB_PATH, "utf-8"));
  console.log(`  ${webData.length} WEB verses loaded`);

  // Build lookup: "BookName:chapter:verse" → text
  const webLookup = new Map<string, string>();
  // Build chapter lookup: "BookName:chapter" → WebVerse[]
  const webByChapter = new Map<string, WebVerse[]>();
  for (const v of webData) {
    webLookup.set(`${v.book}:${v.chapter}:${v.verse}`, v.text);
    const chKey = `${v.book}:${v.chapter}`;
    if (!webByChapter.has(chKey)) webByChapter.set(chKey, []);
    webByChapter.get(chKey)!.push(v);
  }

  // Load DB
  console.log("Loading scripture database...");
  const SQL = await initSqlJs({
    locateFile: (file: string) => path.join(DATA_DIR, file),
  });
  const buf = fs.readFileSync(DB_PATH);
  const db = new SQL.Database(buf);
  console.log("Database loaded.");

  // Check if text_modern column already exists
  const tableInfo = db.exec("PRAGMA table_info(verses)");
  const columns = tableInfo[0].values.map((row) => row[1]);
  const hasModernColumn = columns.includes("text_modern");

  if (!hasModernColumn) {
    console.log("Adding text_modern column...");
    db.run("ALTER TABLE verses ADD COLUMN text_modern TEXT");
    console.log("  Column added.");
  } else {
    console.log("text_modern column already exists — clearing for re-population.");
    db.run("UPDATE verses SET text_modern = NULL WHERE book_id <= 66");
  }

  // Get book name mapping (id → name) for Bible books only (id <= 66)
  const bookRows = db.exec("SELECT id, name FROM books WHERE id <= 66 ORDER BY id");
  const books = bookRows[0].values as [number, string][];

  let matched = 0;
  let unmatched = 0;
  let contentAligned = 0;
  let total = 0;

  // Process each Bible book
  for (const [bookId, bookName] of books) {
    // Get all chapters for this book
    const chapterResult = db.exec(
      "SELECT DISTINCT chapter FROM verses WHERE book_id = ? ORDER BY chapter",
      [bookId]
    );
    if (!chapterResult.length) continue;
    const chapters = chapterResult[0].values.map((r) => r[0] as number);

    let bookMatched = 0;
    let bookUnmatched = 0;
    let bookContentAligned = 0;

    for (const chapter of chapters) {
      // Get KJV verses for this chapter
      const kjvResult = db.exec(
        "SELECT id, verse, text FROM verses WHERE book_id = ? AND chapter = ? ORDER BY verse",
        [bookId, chapter]
      );
      if (!kjvResult.length) continue;
      const kjvVerses = kjvResult[0].values as [number, number, string][];

      // Get WEB verses for this chapter
      const webCh = chapter === 0 ? 1 : chapter;
      const chKey = `${bookName}:${webCh}`;
      const webVerses = webByChapter.get(chKey) || [];

      // Check if verse counts match (simple case)
      const kjvVerseNums = new Set(kjvVerses.map((v) => v[1]));
      const webVerseNums = new Set(webVerses.map((v) => v.verse));
      const verseMismatch =
        kjvVerseNums.size !== webVerseNums.size ||
        [...kjvVerseNums].some((v) => !webVerseNums.has(v));

      if (!verseMismatch) {
        // Simple case: verse numbers match 1:1
        const webMap = new Map(webVerses.map((v) => [v.verse, v.text]));
        for (const [verseId, verse] of kjvVerses) {
          total++;
          const modernText = webMap.get(verse);
          if (modernText) {
            db.run("UPDATE verses SET text_modern = ? WHERE id = ?", [modernText, verseId]);
            matched++;
            bookMatched++;
          } else {
            unmatched++;
            bookUnmatched++;
          }
        }
      } else {
        // Sequential alignment: walk through KJV and WEB in order.
        // When a KJV verse has no good match at the current WEB position,
        // it's a KJV-only verse (textual variant) — skip it and don't advance WEB pointer.
        // When a WEB verse has no good match, it's a WEB-only verse — skip WEB and advance.
        const sortedWeb = [...webVerses].sort((a, b) => a.verse - b.verse);
        let webIdx = 0;

        for (const [verseId, verse, kjvText] of kjvVerses) {
          total++;

          if (webIdx >= sortedWeb.length) {
            // No more WEB verses to match
            unmatched++;
            bookUnmatched++;
            continue;
          }

          // Check if current WEB verse is a good match for this KJV verse
          const currentWeb = sortedWeb[webIdx];
          const score = wordOverlap(kjvText, currentWeb.text);

          if (score >= 0.25) {
            // Good match — use it
            db.run("UPDATE verses SET text_modern = ? WHERE id = ?", [currentWeb.text, verseId]);
            webIdx++;
            matched++;
            bookMatched++;
            if (currentWeb.verse !== verse) {
              contentAligned++;
              bookContentAligned++;
            }
          } else {
            // Poor match — check if the NEXT WEB verse matches better (WEB has extra verse)
            // or if this KJV verse has no WEB equivalent (KJV-only)
            const nextWeb = webIdx + 1 < sortedWeb.length ? sortedWeb[webIdx + 1] : null;
            const nextScore = nextWeb ? wordOverlap(kjvText, nextWeb.text) : 0;

            if (nextScore >= 0.25 && nextScore > score) {
              // Skip current WEB verse (WEB-only) and match with next
              webIdx++; // skip the WEB-only verse
              db.run("UPDATE verses SET text_modern = ? WHERE id = ?", [nextWeb!.text, verseId]);
              webIdx++;
              matched++;
              bookMatched++;
              contentAligned++;
              bookContentAligned++;
            } else if (score >= 0.20) {
              // Marginal match — still use it (some verses are paraphrased heavily)
              db.run("UPDATE verses SET text_modern = ? WHERE id = ?", [currentWeb.text, verseId]);
              webIdx++;
              matched++;
              bookMatched++;
              contentAligned++;
              bookContentAligned++;
            } else {
              // KJV verse with no WEB equivalent — don't advance WEB pointer
              unmatched++;
              bookUnmatched++;
            }
          }
        }

        console.log(
          `  ${bookName} ch${chapter}: content-aligned ${bookContentAligned} verses ` +
          `(${kjvVerses.length} KJV, ${webVerses.length} WEB, ${bookUnmatched} unmatched)`
        );
        // Reset per-chapter counters for next chapter
        bookContentAligned = 0;
      }
    }

    if (bookUnmatched > 0) {
      console.log(`  ${bookName}: ${bookMatched} matched, ${bookUnmatched} unmatched`);
    }
  }

  // Save DB
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
  db.close();

  console.log(`\nComplete!`);
  console.log(`  Total Bible verses: ${total}`);
  console.log(`  Matched with WEB: ${matched}`);
  console.log(`  Content-aligned (verse # mismatch): ${contentAligned}`);
  console.log(`  Unmatched: ${unmatched}`);
  console.log(`  Match rate: ${((matched / total) * 100).toFixed(1)}%`);
  console.log(`\nDatabase saved: ${DB_PATH}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
