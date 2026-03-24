#!/usr/bin/env tsx
/**
 * Adds Apocrypha books to the EXISTING scriptures.db without rebuilding.
 * Run: npx tsx scripts/add-apocrypha.ts
 */

import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const DB_PATH = path.resolve(__dirname, "../data/scriptures.db");
const PROJECT_DIR = path.resolve(__dirname, "..");

const APOCRYPHA_BOOKS = [
  { book: "1 Esdras", filename: "Apocrypha_-_1_Esdras.md" },
  { book: "2 Esdras", filename: "Apocrypha_-_2_Esdras.md" },
  { book: "Tobit", filename: "Apocrypha_-_Tobit.md" },
  { book: "Judith", filename: "Apocrypha_-_Judith.md" },
  { book: "Additions to Esther", filename: "Apocrypha_-_Additions_to_Esther.md" },
  { book: "Wisdom", filename: "Apocrypha_-_Wisdom.md" },
  { book: "Sirach", filename: "Apocrypha_-_Sirach.md" },
  { book: "Baruch", filename: "Apocrypha_-_Baruch.md" },
  { book: "Prayer of Azariah", filename: "Apocrypha_-_Prayer_of_Azariah.md" },
  { book: "Susanna", filename: "Apocrypha_-_Susanna.md" },
  { book: "Bel and the Dragon", filename: "Apocrypha_-_Bel_and_the_Dragon.md" },
  { book: "Prayer of Manasses", filename: "Apocrypha_-_Prayer_of_Manasses.md" },
  { book: "1 Maccabees", filename: "Apocrypha_-_1_Maccabees.md" },
  { book: "2 Maccabees", filename: "Apocrypha_-_2_Maccabees.md" },
];

function parseMarkdown(content: string): Array<{ chapter: number; verse: number; text: string }> {
  const lines = content.split("\n");
  let currentChapter: number | null = null;
  let currentVerse: number | null = null;
  let expectVerseText = false;
  const verses: Array<{ chapter: number; verse: number; text: string }> = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const chapterMatch = line.match(/^## Chapter (\d+)/);
    if (chapterMatch) {
      currentChapter = parseInt(chapterMatch[1], 10);
      expectVerseText = false;
      continue;
    }

    const verseMatch = line.match(/^## (\d+)\.$/);
    if (verseMatch) {
      currentVerse = parseInt(verseMatch[1], 10);
      expectVerseText = true;
      // For single-chapter books (no ## Chapter header), default to chapter 1
      if (currentChapter === null) currentChapter = 1;
      continue;
    }

    if (line.startsWith("#")) {
      expectVerseText = false;
      continue;
    }

    if (expectVerseText && currentChapter !== null && currentVerse !== null) {
      verses.push({ chapter: currentChapter, verse: currentVerse, text: line });
      expectVerseText = false;
    }
  }

  return verses;
}

function main() {
  const db = new Database(DB_PATH);

  // Check if Apocrypha volume already exists
  const existing = db.prepare("SELECT id FROM volumes WHERE abbrev = ?").get("Apoc") as { id: number } | undefined;
  if (existing) {
    console.log("Apocrypha volume already exists (id=" + existing.id + "). Removing old data first...");
    // Remove old data
    const bookIds = db.prepare("SELECT id FROM books WHERE volume_id = ?").all(existing.id) as Array<{ id: number }>;
    for (const b of bookIds) {
      db.prepare("DELETE FROM verses WHERE book_id = ?").run(b.id);
      db.prepare("DELETE FROM book_stats WHERE book_id = ?").run(b.id);
    }
    db.prepare("DELETE FROM books WHERE volume_id = ?").run(existing.id);
    db.prepare("DELETE FROM volumes WHERE id = ?").run(existing.id);
  }

  // Get max display_order from existing volumes
  const maxOrder = (db.prepare("SELECT MAX(display_order) as m FROM volumes").get() as { m: number }).m;

  // Insert Apocrypha volume
  const volResult = db.prepare(
    "INSERT INTO volumes (name, abbrev, display_order) VALUES (?, ?, ?)"
  ).run("Apocrypha", "Apoc", maxOrder + 1);
  const volumeId = volResult.lastInsertRowid as number;
  console.log(`Created Apocrypha volume (id=${volumeId}, display_order=${maxOrder + 1})`);

  // Get max display_order from existing books
  const maxBookOrder = (db.prepare("SELECT MAX(display_order) as m FROM books").get() as { m: number }).m;

  const insertBook = db.prepare(
    "INSERT INTO books (volume_id, name, filename, display_order, chapter_count) VALUES (?, ?, ?, ?, ?)"
  );
  const insertVerse = db.prepare(
    "INSERT INTO verses (book_id, chapter, verse, text) VALUES (?, ?, ?, ?)"
  );
  const insertStats = db.prepare(
    "INSERT INTO book_stats (book_id, word_count, verse_count, avg_verse_length, avg_word_length) VALUES (?, ?, ?, ?, ?)"
  );

  let totalVerses = 0;
  const transaction = db.transaction(() => {
    for (let i = 0; i < APOCRYPHA_BOOKS.length; i++) {
      const entry = APOCRYPHA_BOOKS[i];
      const filepath = path.join(PROJECT_DIR, entry.filename);

      if (!fs.existsSync(filepath)) {
        console.error(`  ERROR: File not found: ${filepath}`);
        continue;
      }

      const content = fs.readFileSync(filepath, "utf-8");
      const verses = parseMarkdown(content);
      const chapterCount = Math.max(...verses.map((v) => v.chapter), 0);

      // Insert book
      const displayOrder = maxBookOrder + i + 1;
      const result = insertBook.run(volumeId, entry.book, entry.filename, displayOrder, chapterCount === 0 ? 1 : chapterCount);
      const bookId = result.lastInsertRowid as number;

      // Insert verses
      for (const v of verses) {
        insertVerse.run(bookId, v.chapter, v.verse, v.text);
      }
      totalVerses += verses.length;

      // Compute stats
      let totalWords = 0;
      let totalWordChars = 0;
      for (const v of verses) {
        const words = v.text.split(/\s+/).filter((w) => w.length > 0);
        totalWords += words.length;
        for (const w of words) {
          totalWordChars += w.replace(/[^a-zA-Z]/g, "").length;
        }
      }
      const avgVerseLength = verses.length > 0 ? totalWords / verses.length : 0;
      const avgWordLength = totalWords > 0 ? totalWordChars / totalWords : 0;
      insertStats.run(bookId, totalWords, verses.length, avgVerseLength, avgWordLength);

      console.log(`  ${entry.book}: ${chapterCount} chapters, ${verses.length} verses`);
    }
  });

  transaction();
  console.log(`\nDone! Added ${totalVerses} Apocrypha verses to database.`);
  db.close();
}

main();
