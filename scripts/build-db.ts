#!/usr/bin/env tsx
/**
 * Parses all scripture .md files and builds a SQLite database.
 * Run: npm run build-db
 */

import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { BOOK_ORDER } from "./book-order";

const SCRIPTURE_DIR = path.resolve(__dirname, "../../");
const DB_PATH = path.resolve(__dirname, "../data/scriptures.db");

function buildDatabase() {
  // Remove existing DB
  if (fs.existsSync(DB_PATH)) {
    fs.unlinkSync(DB_PATH);
  }
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");

  // Create tables
  db.exec(`
    CREATE TABLE volumes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      abbrev TEXT NOT NULL,
      display_order INTEGER NOT NULL
    );

    CREATE TABLE books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      volume_id INTEGER NOT NULL REFERENCES volumes(id),
      name TEXT NOT NULL,
      filename TEXT NOT NULL,
      display_order INTEGER NOT NULL,
      chapter_count INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE verses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book_id INTEGER NOT NULL REFERENCES books(id),
      chapter INTEGER NOT NULL,
      verse INTEGER NOT NULL,
      text TEXT NOT NULL
    );

    CREATE TABLE book_stats (
      book_id INTEGER PRIMARY KEY REFERENCES books(id),
      word_count INTEGER NOT NULL DEFAULT 0,
      verse_count INTEGER NOT NULL DEFAULT 0,
      avg_verse_length REAL NOT NULL DEFAULT 0,
      avg_word_length REAL NOT NULL DEFAULT 0
    );

    CREATE INDEX idx_verses_book_id ON verses(book_id);
    CREATE INDEX idx_books_volume_id ON books(volume_id);
    CREATE INDEX idx_books_display_order ON books(display_order);
  `);

  // Insert volumes (deduplicated, in order)
  const insertVolume = db.prepare(
    "INSERT OR IGNORE INTO volumes (name, abbrev, display_order) VALUES (?, ?, ?)"
  );
  const volumeOrder: Record<string, number> = {};
  let volIdx = 0;
  for (const entry of BOOK_ORDER) {
    if (!(entry.volume in volumeOrder)) {
      volIdx++;
      volumeOrder[entry.volume] = volIdx;
      insertVolume.run(entry.volume, entry.volumeAbbrev, volIdx);
    }
  }

  // Get volume IDs
  const volumeIds: Record<string, number> = {};
  const volRows = db.prepare("SELECT id, name FROM volumes").all() as Array<{
    id: number;
    name: string;
  }>;
  for (const row of volRows) {
    volumeIds[row.name] = row.id;
  }

  // Insert books and verses in a transaction
  const insertBook = db.prepare(
    "INSERT INTO books (volume_id, name, filename, display_order, chapter_count) VALUES (?, ?, ?, ?, ?)"
  );
  const insertVerse = db.prepare(
    "INSERT INTO verses (book_id, chapter, verse, text) VALUES (?, ?, ?, ?)"
  );
  const insertStats = db.prepare(
    "INSERT INTO book_stats (book_id, word_count, verse_count, avg_verse_length, avg_word_length) VALUES (?, ?, ?, ?, ?)"
  );

  const transaction = db.transaction(() => {
    let totalVerses = 0;
    const volumeVerseCounts: Record<string, number> = {};

    for (let i = 0; i < BOOK_ORDER.length; i++) {
      const entry = BOOK_ORDER[i];
      const filepath = path.join(SCRIPTURE_DIR, entry.filename);

      if (!fs.existsSync(filepath)) {
        console.error(`  ERROR: File not found: ${filepath}`);
        continue;
      }

      const content = fs.readFileSync(filepath, "utf-8");
      const lines = content.split("\n");

      // Parse the file
      let currentChapter: number | null = null;
      let currentVerse: number | null = null;
      let expectVerseText = false;
      let chapterCount = 0;
      const verses: Array<{ chapter: number; verse: number; text: string }> =
        [];

      for (const rawLine of lines) {
        const line = rawLine.trim();

        // Skip empty lines and backspace artifacts
        if (!line || line === "\b\b" || /^[\b]+$/.test(line)) {
          continue;
        }

        // Chapter/Section header
        const chapterMatch = line.match(/^## (?:Chapter|Section) (\d+)/);
        if (chapterMatch) {
          currentChapter = parseInt(chapterMatch[1], 10);
          chapterCount = Math.max(chapterCount, currentChapter);
          expectVerseText = false;
          continue;
        }

        // Verse number header
        const verseMatch = line.match(/^## (\d+)\.$/);
        if (verseMatch) {
          currentVerse = parseInt(verseMatch[1], 10);
          expectVerseText = true;
          continue;
        }

        // Skip any other heading lines
        if (line.startsWith("#")) {
          expectVerseText = false;
          continue;
        }

        // Verse text (line after ## N.)
        if (
          expectVerseText &&
          currentChapter !== null &&
          currentVerse !== null
        ) {
          verses.push({
            chapter: currentChapter,
            verse: currentVerse,
            text: line,
          });
          expectVerseText = false;
        }
      }

      // For single-chapter books using Chapter 0, count as 1 chapter
      if (chapterCount === 0 && verses.length > 0) {
        chapterCount = 1;
      }

      // Insert book
      const displayOrder = i + 1;
      const result = insertBook.run(
        volumeIds[entry.volume],
        entry.book,
        entry.filename,
        displayOrder,
        chapterCount
      );
      const bookId = result.lastInsertRowid as number;

      // Insert verses
      for (const v of verses) {
        insertVerse.run(bookId, v.chapter, v.verse, v.text);
      }

      // Compute and insert stats
      let totalWords = 0;
      let totalChars = 0;
      let totalWordChars = 0;
      for (const v of verses) {
        const words = v.text.split(/\s+/).filter((w) => w.length > 0);
        totalWords += words.length;
        totalChars += v.text.length;
        for (const w of words) {
          totalWordChars += w.replace(/[^a-zA-Z]/g, "").length;
        }
      }
      const avgVerseLen =
        verses.length > 0 ? totalChars / verses.length : 0;
      const avgWordLen = totalWords > 0 ? totalWordChars / totalWords : 0;
      insertStats.run(
        bookId,
        totalWords,
        verses.length,
        avgVerseLen,
        avgWordLen
      );

      totalVerses += verses.length;
      volumeVerseCounts[entry.volume] =
        (volumeVerseCounts[entry.volume] || 0) + verses.length;

      console.log(
        `  ${entry.book.padEnd(30)} ${verses.length
          .toString()
          .padStart(6)} verses  ${chapterCount
          .toString()
          .padStart(4)} chapters  ${totalWords
          .toString()
          .padStart(8)} words`
      );
    }

    console.log(`\n${"=".repeat(70)}`);
    console.log(`  TOTALS`);
    console.log(`${"=".repeat(70)}`);
    for (const [vol, count] of Object.entries(volumeVerseCounts)) {
      console.log(`  ${vol.padEnd(30)} ${count.toString().padStart(6)} verses`);
    }
    console.log(`${"─".repeat(70)}`);
    console.log(
      `  ${"Total".padEnd(30)} ${totalVerses.toString().padStart(6)} verses`
    );
  });

  console.log("Building scripture database...\n");
  transaction();

  // Create FTS index
  console.log("\nBuilding full-text search index...");
  db.exec(`
    CREATE VIRTUAL TABLE verses_fts USING fts5(
      text,
      content='verses',
      content_rowid='id'
    );
    INSERT INTO verses_fts(rowid, text) SELECT id, text FROM verses;
  `);

  db.close();
  console.log(`\nDatabase written to: ${DB_PATH}`);

  const stats = fs.statSync(DB_PATH);
  console.log(`Database size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
}

buildDatabase();
