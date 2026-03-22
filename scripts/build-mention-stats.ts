/**
 * build-mention-stats.ts
 *
 * Pre-computes character and location mention statistics so they load
 * instantly instead of being calculated on every API request.
 *
 * Usage: npx tsx scripts/build-mention-stats.ts
 *
 * Outputs:
 *   data/character-mentions.json  (keyed by character id)
 *   data/location-mentions.json   (keyed by location id)
 */

import Database from "better-sqlite3";
import * as fs from "fs";
import * as path from "path";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function displayName(name: string): string {
  if (name === "Doctrine and Covenants") return "D&C";
  return name;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

interface VerseRow {
  book_id: number;
  book_name: string;
  abbrev: string;
  chapter: number;
  verse: number;
  text: string;
  vol_order: number;
  book_order: number;
}

interface MentionStats {
  totalMentions: number;
  byVolume: Record<string, number>;
  byBook: { bookId: number; bookName: string; volumeAbbrev: string; count: number }[];
  firstMention: {
    bookId: number;
    bookName: string;
    volumeAbbrev: string;
    chapter: number;
    verse: number;
    text: string;
  } | null;
  lastMention: {
    bookId: number;
    bookName: string;
    volumeAbbrev: string;
    chapter: number;
    verse: number;
    text: string;
  } | null;
}

// ---------------------------------------------------------------------------
// Database setup
// ---------------------------------------------------------------------------

const ROOT = path.resolve(__dirname, "..");
const DB_PATH = path.join(ROOT, "data", "scriptures.db");
const CHARACTERS_PATH = path.join(ROOT, "data", "characters.json");
const LOCATIONS_PATH = path.join(ROOT, "data", "locations.json");
const CHAR_OUTPUT = path.join(ROOT, "data", "character-mentions.json");
const LOC_OUTPUT = path.join(ROOT, "data", "location-mentions.json");

const db = new Database(DB_PATH, { readonly: true });

// Prepare statements for fetching verses scoped by book names or volume abbreviations
const stmtAllVerses = db.prepare(`
  SELECT v.book_id, b.name as book_name, vol.abbrev,
         v.chapter, v.verse, v.text,
         vol.display_order as vol_order, b.display_order as book_order
  FROM verses v
  JOIN books b ON v.book_id = b.id
  JOIN volumes vol ON b.volume_id = vol.id
  ORDER BY vol.display_order, b.display_order, v.chapter, v.verse
`);

// Build a lookup of volume abbreviation → list of book names
const volumeBookMap = new Map<string, string[]>();
const bookRows = db
  .prepare(
    `SELECT b.name as book_name, vol.abbrev
     FROM books b JOIN volumes vol ON b.volume_id = vol.id`
  )
  .all() as { book_name: string; abbrev: string }[];

for (const row of bookRows) {
  const arr = volumeBookMap.get(row.abbrev) || [];
  arr.push(row.book_name);
  volumeBookMap.set(row.abbrev, arr);
}

// ---------------------------------------------------------------------------
// Core mention computation (mirrors getCharacterMentions in queries.ts)
// ---------------------------------------------------------------------------

function computeMentions(
  name: string,
  aliases: string[],
  books?: string[],
  volumes?: string[]
): MentionStats {
  const searchTerms = [name, ...aliases].filter(Boolean);
  if (searchTerms.length === 0) {
    return { totalMentions: 0, byVolume: {}, byBook: [], firstMention: null, lastMention: null };
  }

  const escaped = searchTerms.map((t) => escapeRegex(t));
  const pattern = new RegExp(`\\b(${escaped.join("|")})\\b`, "i");

  // Determine which book names to scope the query to
  let scopeBooks: string[] | undefined;
  if (books && books.length > 0) {
    scopeBooks = books;
  } else if (volumes && volumes.length > 0) {
    // For locations: expand volumes to their book names
    scopeBooks = [];
    for (const vol of volumes) {
      const bks = volumeBookMap.get(vol);
      if (bks) scopeBooks.push(...bks);
    }
  }

  let allVerses: VerseRow[];
  if (scopeBooks && scopeBooks.length > 0) {
    const placeholders = scopeBooks.map(() => "?").join(", ");
    const stmt = db.prepare(`
      SELECT v.book_id, b.name as book_name, vol.abbrev,
             v.chapter, v.verse, v.text,
             vol.display_order as vol_order, b.display_order as book_order
      FROM verses v
      JOIN books b ON v.book_id = b.id
      JOIN volumes vol ON b.volume_id = vol.id
      WHERE b.name IN (${placeholders})
      ORDER BY vol.display_order, b.display_order, v.chapter, v.verse
    `);
    allVerses = stmt.all(...scopeBooks) as VerseRow[];
  } else {
    allVerses = stmtAllVerses.all() as VerseRow[];
  }

  // Filter matching verses
  const matches: VerseRow[] = [];
  for (const v of allVerses) {
    if (pattern.test(v.text)) {
      matches.push(v);
    }
  }

  // Aggregate by volume
  const byVolume: Record<string, number> = {};
  // D&C aggregation by section (chapter) not whole book
  const byBookMap = new Map<
    string,
    { bookId: number; bookName: string; volumeAbbrev: string; count: number }
  >();

  for (const m of matches) {
    byVolume[m.abbrev] = (byVolume[m.abbrev] || 0) + 1;
    const isDC = displayName(m.book_name) === "D&C";
    const key = isDC ? `${m.book_id}-${m.chapter}` : String(m.book_id);
    const label = isDC ? `D&C ${m.chapter}` : displayName(m.book_name);
    const existing = byBookMap.get(key);
    if (existing) {
      existing.count++;
    } else {
      byBookMap.set(key, {
        bookId: m.book_id,
        bookName: label,
        volumeAbbrev: m.abbrev,
        count: 1,
      });
    }
  }

  const first = matches.length > 0 ? matches[0] : null;
  const last = matches.length > 0 ? matches[matches.length - 1] : null;

  return {
    totalMentions: matches.length,
    byVolume,
    byBook: Array.from(byBookMap.values()),
    firstMention: first
      ? {
          bookId: first.book_id,
          bookName: displayName(first.book_name),
          volumeAbbrev: first.abbrev,
          chapter: first.chapter,
          verse: first.verse,
          text: first.text,
        }
      : null,
    lastMention: last
      ? {
          bookId: last.book_id,
          bookName: displayName(last.book_name),
          volumeAbbrev: last.abbrev,
          chapter: last.chapter,
          verse: last.verse,
          text: last.text,
        }
      : null,
  };
}

// ---------------------------------------------------------------------------
// Process characters
// ---------------------------------------------------------------------------

interface CharacterEntry {
  id: string;
  name: string;
  aliases: string[];
  books?: string[];
  volumes?: string[];
}

interface LocationEntry {
  id: string;
  name: string;
  aliases: string[];
  volumes?: string[];
}

console.log("Loading data...");
const characters: CharacterEntry[] = JSON.parse(fs.readFileSync(CHARACTERS_PATH, "utf8"));
const locations: LocationEntry[] = JSON.parse(fs.readFileSync(LOCATIONS_PATH, "utf8"));

console.log(`Processing ${characters.length} characters...`);
const charResults: Record<string, MentionStats> = {};
const startChar = Date.now();

for (let i = 0; i < characters.length; i++) {
  const c = characters[i];
  charResults[c.id] = computeMentions(c.name, c.aliases || [], c.books);
  if ((i + 1) % 50 === 0 || i === characters.length - 1) {
    const elapsed = ((Date.now() - startChar) / 1000).toFixed(1);
    console.log(`  Characters: ${i + 1}/${characters.length} (${elapsed}s)`);
  }
}

fs.writeFileSync(CHAR_OUTPUT, JSON.stringify(charResults, null, 2));
console.log(`Wrote ${CHAR_OUTPUT} (${Object.keys(charResults).length} entries)`);

// ---------------------------------------------------------------------------
// Process locations
// ---------------------------------------------------------------------------

console.log(`Processing ${locations.length} locations...`);
const locResults: Record<string, MentionStats> = {};
const startLoc = Date.now();

for (let i = 0; i < locations.length; i++) {
  const loc = locations[i];
  locResults[loc.id] = computeMentions(loc.name, loc.aliases || [], undefined, loc.volumes);
  if ((i + 1) % 50 === 0 || i === locations.length - 1) {
    const elapsed = ((Date.now() - startLoc) / 1000).toFixed(1);
    console.log(`  Locations: ${i + 1}/${locations.length} (${elapsed}s)`);
  }
}

fs.writeFileSync(LOC_OUTPUT, JSON.stringify(locResults, null, 2));
console.log(`Wrote ${LOC_OUTPUT} (${Object.keys(locResults).length} entries)`);

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

db.close();
const totalTime = ((Date.now() - startChar) / 1000).toFixed(1);
console.log(`\nDone in ${totalTime}s total.`);

// Quick stats
const topChars = Object.entries(charResults)
  .sort((a, b) => b[1].totalMentions - a[1].totalMentions)
  .slice(0, 5);
console.log("\nTop 5 most-mentioned characters:");
for (const [id, stats] of topChars) {
  console.log(`  ${id}: ${stats.totalMentions} mentions`);
}

const topLocs = Object.entries(locResults)
  .sort((a, b) => b[1].totalMentions - a[1].totalMentions)
  .slice(0, 5);
console.log("\nTop 5 most-mentioned locations:");
for (const [id, stats] of topLocs) {
  console.log(`  ${id}: ${stats.totalMentions} mentions`);
}
