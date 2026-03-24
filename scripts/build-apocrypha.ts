#!/usr/bin/env tsx
/**
 * Fetches the 14 KJV Apocrypha books from api.getbible.net
 * and generates .md files in the same format as existing scripture files.
 * Run: npx tsx scripts/build-apocrypha.ts
 */

import fs from "fs";
import path from "path";

const API_BASE = "https://api.getbible.net/v2/kjva";
const OUTPUT_DIR = path.resolve(__dirname, "..");

// The 14 Apocrypha books with their API book numbers
const APOCRYPHA_BOOKS: Array<{ nr: number; name: string; filename: string }> = [
  { nr: 67, name: "1 Esdras", filename: "Apocrypha_-_1_Esdras.md" },
  { nr: 68, name: "2 Esdras", filename: "Apocrypha_-_2_Esdras.md" },
  { nr: 69, name: "Tobit", filename: "Apocrypha_-_Tobit.md" },
  { nr: 70, name: "Judith", filename: "Apocrypha_-_Judith.md" },
  { nr: 71, name: "Additions to Esther", filename: "Apocrypha_-_Additions_to_Esther.md" },
  { nr: 73, name: "Wisdom", filename: "Apocrypha_-_Wisdom.md" },
  { nr: 74, name: "Sirach", filename: "Apocrypha_-_Sirach.md" },
  { nr: 75, name: "Baruch", filename: "Apocrypha_-_Baruch.md" },
  { nr: 76, name: "Prayer of Azariah", filename: "Apocrypha_-_Prayer_of_Azariah.md" },
  { nr: 77, name: "Susanna", filename: "Apocrypha_-_Susanna.md" },
  { nr: 78, name: "Bel and the Dragon", filename: "Apocrypha_-_Bel_and_the_Dragon.md" },
  { nr: 79, name: "Prayer of Manasses", filename: "Apocrypha_-_Prayer_of_Manasses.md" },
  { nr: 80, name: "1 Maccabees", filename: "Apocrypha_-_1_Maccabees.md" },
  { nr: 81, name: "2 Maccabees", filename: "Apocrypha_-_2_Maccabees.md" },
];

interface APIVerse {
  chapter: number;
  verse: number;
  name: string;
  text: string;
}

interface APIChapter {
  chapter: number;
  verses: APIVerse[];
}

async function fetchBook(bookNr: number): Promise<APIChapter[]> {
  const url = `${API_BASE}/${bookNr}.json`;
  console.log(`  Fetching ${url} ...`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch book ${bookNr}: ${res.status}`);
  const data = await res.json();
  // The API returns chapters as an object keyed by chapter number
  const chapters: APIChapter[] = [];
  for (const [, ch] of Object.entries(data.chapters || {})) {
    const chapter = ch as { chapter: number; verses: Record<string, APIVerse> };
    const verses = Object.values(chapter.verses).sort((a, b) => a.verse - b.verse);
    chapters.push({ chapter: chapter.chapter, verses });
  }
  return chapters.sort((a, b) => a.chapter - b.chapter);
}

function cleanText(text: string): string {
  // Remove Strong's numbers and morphology tags (e.g., {H1234} or <12345>)
  return text
    .replace(/\{[A-Z]\d+\}/g, "")
    .replace(/<\d+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function generateMarkdown(bookName: string, chapters: APIChapter[]): string {
  const lines: string[] = [];
  lines.push(`# ${bookName}`);
  lines.push("");

  for (const ch of chapters) {
    if (chapters.length > 1) {
      lines.push(`## Chapter ${ch.chapter}`);
      lines.push("");
    }

    for (const v of ch.verses) {
      lines.push(`## ${v.verse}.`);
      lines.push(cleanText(v.text));
      lines.push("");
    }
  }

  return lines.join("\n");
}

async function main() {
  console.log("Building Apocrypha .md files from api.getbible.net...\n");

  let totalVerses = 0;

  for (const book of APOCRYPHA_BOOKS) {
    console.log(`${book.name} (book #${book.nr}):`);
    try {
      const chapters = await fetchBook(book.nr);
      const verseCount = chapters.reduce((sum, ch) => sum + ch.verses.length, 0);
      totalVerses += verseCount;

      const md = generateMarkdown(book.name, chapters);
      const outPath = path.join(OUTPUT_DIR, book.filename);
      fs.writeFileSync(outPath, md, "utf-8");

      console.log(`  -> ${chapters.length} chapters, ${verseCount} verses -> ${book.filename}`);
    } catch (err) {
      console.error(`  ERROR: ${err}`);
    }

    // Rate limit: small delay between requests
    await new Promise((r) => setTimeout(r, 300));
  }

  console.log(`\nDone! ${totalVerses} total verses across ${APOCRYPHA_BOOKS.length} books.`);
  console.log("Now add entries to scripts/book-order.ts and run: npm run build-db");
}

main().catch(console.error);
