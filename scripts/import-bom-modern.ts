/**
 * import-bom-modern.ts
 *
 * Imports Book of Mormon modern translations and chapter narrations
 * from JSON data files into the scriptures database.
 *
 * Data sources:
 *   data/bom-modern/*.json  — verse-by-verse modern translations per book
 *   data/bom-narrations.json — chapter narrations (prose summaries)
 *
 * Run: npx tsx scripts/import-bom-modern.ts
 */

import fs from "fs";
import path from "path";
import initSqlJs from "sql.js";

const DATA_DIR = path.join(__dirname, "..", "data");
const DB_PATH = path.join(DATA_DIR, "scriptures.db");
const MODERN_DIR = path.join(DATA_DIR, "bom-modern");
const NARRATIONS_PATH = path.join(DATA_DIR, "bom-narrations.json");

interface ModernVerse {
  verse: number;
  text: string;
}

interface ModernChapter {
  [chapter: string]: ModernVerse[];
}

interface ModernBook {
  [bookName: string]: ModernChapter;
}

interface NarrationData {
  [key: string]: string; // "bookName:chapter" → narration text
}

async function main() {
  console.log("Loading scripture database...");
  const SQL = await initSqlJs({
    locateFile: (file: string) => path.join(DATA_DIR, file),
  });
  const buf = fs.readFileSync(DB_PATH);
  const db = new SQL.Database(buf);
  console.log("Database loaded.");

  // Ensure narrations table exists
  db.run(`CREATE TABLE IF NOT EXISTS narrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id INTEGER NOT NULL,
    chapter INTEGER NOT NULL,
    narration TEXT NOT NULL,
    UNIQUE(book_id, chapter)
  )`);

  // Get book name → id mapping for BoM books (id 67-81)
  const bookRows = db.exec("SELECT id, name FROM books WHERE id >= 67 AND id <= 81 ORDER BY id");
  const bookMap = new Map<string, number>();
  for (const row of bookRows[0].values) {
    bookMap.set(row[1] as string, row[0] as number);
  }
  console.log(`Book of Mormon books: ${[...bookMap.keys()].join(", ")}`);

  // --- Import modern translations ---
  let totalModernVerses = 0;
  let modernFiles = 0;

  if (fs.existsSync(MODERN_DIR)) {
    const files = fs.readdirSync(MODERN_DIR).filter((f) => f.endsWith(".json"));
    console.log(`\nFound ${files.length} modern translation files in ${MODERN_DIR}`);

    for (const file of files) {
      const filePath = path.join(MODERN_DIR, file);
      const bookData: ModernBook = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      modernFiles++;

      for (const [bookName, chapters] of Object.entries(bookData)) {
        const bookId = bookMap.get(bookName);
        if (!bookId) {
          console.error(`  WARNING: Book "${bookName}" not found in database, skipping`);
          continue;
        }

        let bookVerses = 0;
        for (const [chapterStr, verses] of Object.entries(chapters)) {
          const chapter = parseInt(chapterStr);

          for (const { verse, text } of verses) {
            // Check verse exists in DB
            const existing = db.exec(
              "SELECT id FROM verses WHERE book_id = ? AND chapter = ? AND verse = ?",
              [bookId, chapter, verse]
            );
            if (!existing.length || !existing[0].values.length) {
              console.error(`  WARNING: ${bookName} ${chapter}:${verse} not found in DB`);
              continue;
            }
            const verseId = existing[0].values[0][0] as number;
            db.run("UPDATE verses SET text_modern = ? WHERE id = ?", [text, verseId]);
            bookVerses++;
            totalModernVerses++;
          }
        }
        console.log(`  ${bookName}: ${bookVerses} verses updated`);
      }
    }
  } else {
    console.log(`\nNo modern translation directory found at ${MODERN_DIR}, skipping.`);
  }

  // --- Import narrations ---
  let totalNarrations = 0;

  if (fs.existsSync(NARRATIONS_PATH)) {
    const narrations: NarrationData = JSON.parse(fs.readFileSync(NARRATIONS_PATH, "utf-8"));
    console.log(`\nFound narrations file with ${Object.keys(narrations).length} entries`);

    for (const [key, narration] of Object.entries(narrations)) {
      const [bookName, chapterStr] = key.split(":");
      const chapter = parseInt(chapterStr);
      const bookId = bookMap.get(bookName);

      if (!bookId) {
        console.error(`  WARNING: Book "${bookName}" not found for narration, skipping`);
        continue;
      }

      // Upsert narration
      db.run(
        `INSERT INTO narrations (book_id, chapter, narration) VALUES (?, ?, ?)
         ON CONFLICT(book_id, chapter) DO UPDATE SET narration = excluded.narration`,
        [bookId, chapter, narration]
      );
      totalNarrations++;
    }
    console.log(`  ${totalNarrations} narrations imported`);
  } else {
    console.log(`\nNo narrations file found at ${NARRATIONS_PATH}, skipping.`);
  }

  // Save DB
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
  db.close();

  console.log(`\nComplete!`);
  console.log(`  Modern translations: ${totalModernVerses} verses across ${modernFiles} files`);
  console.log(`  Narrations: ${totalNarrations} chapters`);
  console.log(`  Database saved: ${DB_PATH}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
