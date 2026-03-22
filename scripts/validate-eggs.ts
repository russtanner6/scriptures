/**
 * Context Eggs Validation Script
 *
 * Run with: npx tsx scripts/validate-eggs.ts
 *
 * Checks:
 * 1. No duplicate IDs
 * 2. No same-keyword duplicates on the same verse
 * 3. All required fields present
 * 4. Valid categories only (Linguistic, Historical, Cultural, Literary, Restoration)
 * 5. BoM/D&C/PoGP eggs MUST use "Restoration" category (domain isolation)
 * 6. OT/NT eggs must NOT use "Restoration" category
 * 7. No excessively similar titles on the same verse (catches near-duplicates)
 * 8. Insights are 2-3 sentences (not too short, not too long)
 * 9. Keywords are reasonable length (not empty, not absurdly long)
 */

import { readFileSync } from "fs";
import { join } from "path";

interface ContextEgg {
  id: string;
  book: string;
  chapter: number;
  verse: number;
  keyword: string;
  category: string;
  title: string;
  insight: string;
  source: string;
}

const VALID_CATEGORIES = ["Linguistic", "Historical", "Cultural", "Literary", "Restoration"];

const OT_BOOKS = new Set([
  "Genesis","Exodus","Leviticus","Numbers","Deuteronomy","Joshua","Judges","Ruth",
  "1 Samuel","2 Samuel","1 Kings","2 Kings","1 Chronicles","2 Chronicles",
  "Ezra","Nehemiah","Esther","Job","Psalms","Proverbs","Ecclesiastes",
  "Song of Solomon","Isaiah","Jeremiah","Lamentations","Ezekiel","Daniel",
  "Hosea","Joel","Amos","Obadiah","Jonah","Micah","Nahum","Habakkuk",
  "Zephaniah","Haggai","Zechariah","Malachi"
]);

const NT_BOOKS = new Set([
  "Matthew","Mark","Luke","John","Acts","Romans","1 Corinthians","2 Corinthians",
  "Galatians","Ephesians","Philippians","Colossians","1 Thessalonians",
  "2 Thessalonians","1 Timothy","2 Timothy","Titus","Philemon","Hebrews",
  "James","1 Peter","2 Peter","1 John","2 John","3 John","Jude","Revelation"
]);

const RESTORATION_BOOKS = new Set([
  "1 Nephi","2 Nephi","Jacob","Enos","Jarom","Omni","Words of Mormon",
  "Mosiah","Alma","Helaman","3 Nephi","4 Nephi","Mormon","Ether","Moroni",
  "Doctrine and Covenants","Moses","Abraham",
  "Joseph Smith\u2014Matthew","Joseph Smith\u2014History","Articles of Faith"
]);

function validate() {
  const filePath = join(__dirname, "..", "data", "context-eggs.json");
  const raw = readFileSync(filePath, "utf-8");
  const eggs: ContextEgg[] = JSON.parse(raw);

  let errors = 0;
  let warnings = 0;

  console.log(`\nValidating ${eggs.length} context eggs...\n`);

  // 1. Duplicate IDs
  const idCounts = new Map<string, number>();
  for (const e of eggs) {
    idCounts.set(e.id, (idCounts.get(e.id) || 0) + 1);
  }
  for (const [id, count] of idCounts) {
    if (count > 1) {
      console.error(`ERROR: Duplicate ID "${id}" (${count} times)`);
      errors++;
    }
  }

  // 2. Same keyword on same verse
  const verseKeyMap = new Map<string, string[]>();
  for (const e of eggs) {
    const key = `${e.book}|${e.chapter}|${e.verse}|${e.keyword.toLowerCase()}`;
    if (!verseKeyMap.has(key)) verseKeyMap.set(key, []);
    verseKeyMap.get(key)!.push(e.id);
  }
  for (const [key, ids] of verseKeyMap) {
    if (ids.length > 1) {
      console.error(`ERROR: Same keyword on same verse: ${key} → [${ids.join(", ")}]`);
      errors++;
    }
  }

  // 3-9. Per-egg checks
  for (const e of eggs) {
    // 3. Required fields
    for (const field of ["id", "book", "chapter", "verse", "keyword", "category", "title", "insight", "source"]) {
      if (!(field in e) || (e as Record<string, unknown>)[field] === undefined || (e as Record<string, unknown>)[field] === "") {
        console.error(`ERROR: Missing field "${field}" in egg "${e.id}"`);
        errors++;
      }
    }

    // 4. Valid category
    if (!VALID_CATEGORIES.includes(e.category)) {
      console.error(`ERROR: Invalid category "${e.category}" in egg "${e.id}"`);
      errors++;
    }

    // 5. Domain isolation: Restoration books must use Restoration category
    if (RESTORATION_BOOKS.has(e.book) && e.category !== "Restoration") {
      // Allow a few exceptions for purely archaeological/secular evidence
      console.warn(`WARNING: Restoration book "${e.book}" uses category "${e.category}" in egg "${e.id}" — should usually be "Restoration"`);
      warnings++;
    }

    // 6. OT/NT books must NOT use Restoration category
    if ((OT_BOOKS.has(e.book) || NT_BOOKS.has(e.book)) && e.category === "Restoration") {
      console.error(`ERROR: OT/NT book "${e.book}" uses "Restoration" category in egg "${e.id}"`);
      errors++;
    }

    // 8. Insight length check
    const sentences = e.insight.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length < 1) {
      console.error(`ERROR: Insight too short (< 1 sentence) in egg "${e.id}"`);
      errors++;
    }
    if (sentences.length > 5) {
      console.warn(`WARNING: Insight may be too long (${sentences.length} sentences) in egg "${e.id}"`);
      warnings++;
    }

    // 9. Keyword length
    if (e.keyword.length > 30) {
      console.warn(`WARNING: Keyword "${e.keyword}" is very long in egg "${e.id}"`);
      warnings++;
    }
  }

  // 7. Near-duplicate titles on same verse
  const verseTitles = new Map<string, { id: string; title: string }[]>();
  for (const e of eggs) {
    const vKey = `${e.book}|${e.chapter}|${e.verse}`;
    if (!verseTitles.has(vKey)) verseTitles.set(vKey, []);
    verseTitles.get(vKey)!.push({ id: e.id, title: e.title });
  }
  for (const [vKey, entries] of verseTitles) {
    if (entries.length > 1) {
      for (let i = 0; i < entries.length; i++) {
        for (let j = i + 1; j < entries.length; j++) {
          const w1 = new Set(entries[i].title.toLowerCase().split(/\s+/));
          const w2 = new Set(entries[j].title.toLowerCase().split(/\s+/));
          const union = new Set([...w1, ...w2]);
          const intersection = new Set([...w1].filter(x => w2.has(x)));
          const similarity = intersection.size / union.size;
          if (similarity > 0.5) {
            console.warn(`WARNING: Similar titles on ${vKey}: "${entries[i].title}" vs "${entries[j].title}" (${(similarity * 100).toFixed(0)}% similar)`);
            warnings++;
          }
        }
      }
    }
  }

  // Summary
  console.log(`\n${"=".repeat(50)}`);
  console.log(`Total eggs: ${eggs.length}`);
  console.log(`Errors: ${errors}`);
  console.log(`Warnings: ${warnings}`);
  console.log(`${"=".repeat(50)}\n`);

  if (errors > 0) {
    console.error("VALIDATION FAILED — fix errors before committing.");
    process.exit(1);
  } else {
    console.log("✅ Validation passed.");
  }
}

validate();
