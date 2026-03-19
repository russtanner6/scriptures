/**
 * add-modern-text.ts
 *
 * Adds a `text_modern` column to the verses table and populates it with
 * World English Bible (WEB) text for OT + NT books.
 *
 * Source: data/web-bible.json (WEBU — public domain)
 * Maps WEB verses to existing KJV verses by book name + chapter + verse number.
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

async function main() {
  // Load WEB data
  console.log("Loading WEB Bible data...");
  const webData: WebVerse[] = JSON.parse(fs.readFileSync(WEB_PATH, "utf-8"));
  console.log(`  ${webData.length} WEB verses loaded`);

  // Build lookup: "BookName:chapter:verse" → text
  const webLookup = new Map<string, string>();
  for (const v of webData) {
    const key = `${v.book}:${v.chapter}:${v.verse}`;
    webLookup.set(key, v.text);
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
    console.log("text_modern column already exists — updating values.");
  }

  // Get book name mapping (id → name) for Bible books only (id <= 66)
  const bookRows = db.exec("SELECT id, name FROM books WHERE id <= 66 ORDER BY id");
  const books = bookRows[0].values as [number, string][];

  let matched = 0;
  let unmatched = 0;
  let total = 0;

  // Process each Bible book
  for (const [bookId, bookName] of books) {
    const verses = db.exec(
      "SELECT id, chapter, verse FROM verses WHERE book_id = ? ORDER BY chapter, verse",
      [bookId]
    );
    if (!verses.length) continue;

    let bookMatched = 0;
    let bookUnmatched = 0;

    for (const row of verses[0].values) {
      const [verseId, chapter, verse] = row as [number, number, number];
      total++;

      // Try exact match first, then handle single-chapter books (DB uses ch=0, WEB uses ch=1)
      let key = `${bookName}:${chapter}:${verse}`;
      let modernText = webLookup.get(key);
      if (!modernText && chapter === 0) {
        key = `${bookName}:1:${verse}`;
        modernText = webLookup.get(key);
      }

      if (modernText) {
        db.run("UPDATE verses SET text_modern = ? WHERE id = ?", [modernText, verseId]);
        matched++;
        bookMatched++;
      } else {
        unmatched++;
        bookUnmatched++;
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
  console.log(`  Unmatched: ${unmatched}`);
  console.log(`  Match rate: ${((matched / total) * 100).toFixed(1)}%`);
  console.log(`\nDatabase saved: ${DB_PATH}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
