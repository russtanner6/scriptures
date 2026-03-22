#!/usr/bin/env tsx
/**
 * Assigns accurate `books` arrays to all 757 characters in characters.json.
 *
 * For each character, searches for their name + aliases (whole-word, case-insensitive)
 * in ONLY the verses belonging to their listed volumes. Records which books have at
 * least 1 match. Applies manual overrides for the ~39 name collision cases.
 *
 * Run: npx tsx scripts/assign-character-books.ts
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const DATA_DIR = path.resolve(__dirname, "../data");
const DB_PATH = path.join(DATA_DIR, "scriptures.db");
const CHARS_PATH = path.join(DATA_DIR, "characters.json");

// ── Volume abbreviation → volume IDs ─────────────────────────────────
const VOLUME_ABBREV_TO_ID: Record<string, number> = {
  OT: 1,
  NT: 2,
  BoM: 3,
  "D&C": 4,
  PoGP: 5,
};

// ── Book name → book ID (from DB) ───────────────────────────────────
interface BookRow {
  id: number;
  name: string;
  volume_id: number;
  abbrev: string;
}

import os from "os";

function queryDb(sql: string): string {
  return execSync(`sqlite3 "${DB_PATH}" "${sql.replace(/"/g, '\\"')}"`, {
    encoding: "utf-8",
    maxBuffer: 200 * 1024 * 1024, // 200MB
  }).trim();
}

function queryDbRows(sql: string): string[][] {
  const raw = queryDb(sql);
  if (!raw) return [];
  return raw.split("\n").map((line) => line.split("|"));
}

/**
 * For very large queries, dump to a temp file and read back.
 */
function queryDbToFile(sql: string): string {
  const tmpFile = path.join(os.tmpdir(), "scripture_verses_dump.txt");
  execSync(
    `sqlite3 "${DB_PATH}" "${sql.replace(/"/g, '\\"')}" > "${tmpFile}"`,
    { encoding: "utf-8", maxBuffer: 10 * 1024 * 1024 }
  );
  return tmpFile;
}

// Load all books
const bookRows: BookRow[] = queryDbRows(
  `SELECT b.id, b.name, b.volume_id, v.abbrev FROM books b JOIN volumes v ON b.volume_id = v.id ORDER BY v.display_order, b.display_order`
).map(([id, name, volume_id, abbrev]) => ({
  id: Number(id),
  name,
  volume_id: Number(volume_id),
  abbrev,
}));

const bookNameToId: Record<string, number> = {};
const bookIdToName: Record<number, string> = {};
const bookIdToAbbrev: Record<number, string> = {};
for (const b of bookRows) {
  bookNameToId[b.name] = b.id;
  bookIdToName[b.id] = b.name;
  bookIdToAbbrev[b.id] = b.abbrev;
}

// ── Manual overrides for collision characters ────────────────────────
// Maps character ID → exact list of book names they should be assigned to.
// These override text search results entirely.
const MANUAL_OVERRIDES: Record<string, string[]> = {
  // ── Nephi (4 BoM characters sharing the same name) ──
  "nephi-son-of-lehi": ["1 Nephi", "2 Nephi"],
  "nephi-son-of-helaman": ["Helaman", "3 Nephi"],
  "nephi-son-of-nephi": ["3 Nephi", "4 Nephi"],
  "nephi-3ne": ["3 Nephi", "4 Nephi"],

  // ── Alma ──
  "alma-the-elder": ["Mosiah"],
  "alma-the-younger": ["Mosiah", "Alma"],

  // ── Helaman ──
  "helaman-son-of-alma": ["Alma", "Helaman"],
  "helaman-son-of-helaman": ["Helaman", "3 Nephi"],

  // ── Aaron ──
  "aaron-ot": [
    "Exodus",
    "Leviticus",
    "Numbers",
    "Deuteronomy",
    "Joshua",
    "1 Samuel",
    "1 Chronicles",
    "2 Chronicles",
    "Psalms",
    "Hebrews",
  ],
  "aaron-son-of-mosiah": ["Mosiah", "Alma"],
  "aaron-jaredite": ["Ether"],

  // ── Jacob ──
  "jacob-israel": [
    "Genesis",
    "Exodus",
    "Numbers",
    "Deuteronomy",
    "Joshua",
    "1 Samuel",
    "2 Samuel",
    "1 Kings",
    "2 Kings",
    "1 Chronicles",
    "2 Chronicles",
    "Psalms",
    "Isaiah",
    "Jeremiah",
    "Ezekiel",
    "Hosea",
    "Amos",
    "Obadiah",
    "Micah",
    "Malachi",
    "Matthew",
    "Mark",
    "Luke",
    "John",
    "Acts",
    "Romans",
    "Hebrews",
    "1 Nephi",
    "2 Nephi",
    "Jacob",
    "Enos",
    "Mosiah",
    "Alma",
    "3 Nephi",
    "Mormon",
    "Ether",
    "Moroni",
    "Doctrine and Covenants",
    "Abraham",
    "Moses",
  ],
  "jacob-son-of-lehi": ["2 Nephi", "Jacob", "Enos", "Jarom", "Omni"],

  // ── Lehi ──
  lehi: [
    "1 Nephi",
    "2 Nephi",
    "Jacob",
    "Mosiah",
    "Alma",
    "Helaman",
    "3 Nephi",
    "Mormon",
  ],
  "lehi-son-of-helaman": ["Helaman"],
  "lehi-military": ["Alma"],

  // ── Ammon ──
  "ammon-son-of-mosiah": ["Mosiah", "Alma"],
  "ammon-expedition": ["Mosiah"],

  // ── Coriantumr ──
  "coriantumr-jaredite": ["Ether", "Omni"],
  "coriantumr-nephite": ["Helaman"],

  // ── Ishmael ──
  "ishmael-ot": ["Genesis", "1 Chronicles", "Abraham", "Moses"],
  "ishmael-bom": ["1 Nephi", "Alma"],

  // ── Morianton ──
  "morianton-jaredite": ["Ether"],
  moriantum: ["Alma"],

  // ── Joseph (OT patriarch vs BoM son of Lehi) ──
  "joseph-son-of-jacob": [
    "Genesis",
    "Exodus",
    "Numbers",
    "Deuteronomy",
    "Joshua",
    "Judges",
    "2 Samuel",
    "1 Kings",
    "1 Chronicles",
    "Psalms",
    "Isaiah",
    "Jeremiah",
    "Ezekiel",
    "Amos",
    "Obadiah",
    "John",
    "Acts",
    "Hebrews",
    "Revelation",
    "1 Nephi",
    "2 Nephi",
    "Jacob",
    "Alma",
    "3 Nephi",
    "Ether",
    "Doctrine and Covenants",
    "Abraham",
    "Moses",
    "Joseph Smith—History",
  ],
  "joseph-son-of-lehi": ["1 Nephi", "2 Nephi"],

  // ── Benjamin ──
  "king-benjamin": ["Words of Mormon", "Mosiah", "Helaman", "Ether"],
  "benjamin-ot": [
    "Genesis",
    "Deuteronomy",
    "Joshua",
    "Judges",
    "1 Samuel",
    "2 Samuel",
    "1 Kings",
    "1 Chronicles",
    "2 Chronicles",
    "Ezra",
    "Nehemiah",
    "Esther",
    "Psalms",
    "Jeremiah",
    "Ezekiel",
    "Hosea",
    "Obadiah",
  ],

  // ── Gideon ──
  "gideon-ot": ["Judges", "1 Samuel", "2 Samuel", "Hebrews"],
  "gideon-bom": ["Mosiah", "Alma"],

  // ── Saul/Paul ──
  "saul-king": ["1 Samuel", "2 Samuel", "1 Chronicles", "Isaiah", "Acts"],
  paul: [
    "Acts",
    "Romans",
    "1 Corinthians",
    "2 Corinthians",
    "Galatians",
    "Ephesians",
    "Philippians",
    "Colossians",
    "1 Thessalonians",
    "2 Thessalonians",
    "1 Timothy",
    "2 Timothy",
    "Titus",
    "Philemon",
    "Hebrews",
    "2 Peter",
  ],

  // ── Timothy ──
  timothy: [
    "Acts",
    "Romans",
    "1 Corinthians",
    "2 Corinthians",
    "Philippians",
    "Colossians",
    "1 Thessalonians",
    "2 Thessalonians",
    "1 Timothy",
    "2 Timothy",
    "Philemon",
    "Hebrews",
  ],
  "timothy-bom": ["3 Nephi"],

  // ── Isaiah ──
  isaiah: [
    "2 Kings",
    "2 Chronicles",
    "Isaiah",
    "1 Nephi",
    "2 Nephi",
    "Mosiah",
    "3 Nephi",
    "Doctrine and Covenants",
    "Moses",
  ],
  "isaiah-bom": ["3 Nephi"],

  // ── Simeon ──
  simeon: ["Genesis", "Exodus", "Numbers", "Deuteronomy", "Joshua", "Judges", "1 Chronicles", "2 Chronicles", "Ezekiel"],
  "simeon-temple": ["Luke"],

  // ── Jared ──
  "jared-bom": ["Ether"],
  "jared-ot": ["Genesis", "1 Chronicles", "Moses", "Doctrine and Covenants"],

  // ── Zechariah/Zacharias ──
  "zechariah-prophet": ["Zechariah", "Ezra", "Nehemiah"],
  zacharias: ["Luke"],

  // ── Matthew/Levi collision ──
  "matthew-apostle": ["Matthew", "Mark", "Luke", "Acts"],
  levi: [
    "Genesis",
    "Exodus",
    "Numbers",
    "Deuteronomy",
    "Joshua",
    "1 Kings",
    "1 Chronicles",
    "2 Chronicles",
    "Ezra",
    "Nehemiah",
    "Psalms",
    "Jeremiah",
    "Ezekiel",
    "Zechariah",
    "Malachi",
    "Hebrews",
    "Revelation",
  ],

  // ── Jeremiah (OT vs BoM) ──
  jeremiah: [
    "2 Kings",
    "2 Chronicles",
    "Ezra",
    "Nehemiah",
    "Jeremiah",
    "Lamentations",
    "Daniel",
    "1 Nephi",
    "Helaman",
    "Ether",
    "Doctrine and Covenants",
  ],
  "jeremiah-bom": ["1 Nephi"],

  // ── Zedekiah ──
  "zedekiah-king": [
    "2 Kings",
    "1 Chronicles",
    "2 Chronicles",
    "Jeremiah",
    "Ezekiel",
    "1 Nephi",
    "Helaman",
  ],
  "zedekiah-bom": ["1 Nephi"],

  // ── Emma Smith / Emma Hale (two entries for same person) ──
  "emma-smith": ["Doctrine and Covenants"],
  "emma-hale": ["Joseph Smith—History"],

  // ── Haran (two entries) ──
  "haran-abrahams-brother": ["Genesis"],
  "haran-pogp": ["Abraham"],

  // ── Enos (BoM vs OT Enosh) ──
  "enos-bom": ["Enos", "Jarom", "Mosiah"],
  enosh: ["Genesis", "1 Chronicles", "Moses"],

  // ── Milcah (two entries) ──
  milcah: ["Genesis"],
  "milcah-pogp": ["Abraham"],

  // ── Naamah (two entries) ──
  "naamah-antediluvian": ["Genesis"],
  "naamah-pogp": ["Moses"],

  // ── Nahor (two entries) ──
  "nahor-abrahams-brother": ["Genesis"],
  "nahor-pogp": ["Abraham"],

  // ── Sarah/Sarai ──
  sarah: [
    "Genesis",
    "Isaiah",
    "Romans",
    "Galatians",
    "Hebrews",
    "1 Peter",
    "2 Nephi",
    "Jacob",
    "Doctrine and Covenants",
    "Abraham",
  ],
  sarai: ["Genesis", "Abraham"],

  // ── Elijah/Elias collision ──
  elijah: [
    "1 Kings",
    "2 Kings",
    "2 Chronicles",
    "Malachi",
    "Matthew",
    "Mark",
    "Luke",
    "John",
    "Romans",
    "James",
    "1 Nephi",
    "3 Nephi",
    "Moroni",
    "Doctrine and Covenants",
    "Joseph Smith—History",
  ],
  elias: ["Doctrine and Covenants", "Joseph Smith—History"],

  // ── Noah/Gabriel collision ──
  noah: [
    "Genesis",
    "1 Chronicles",
    "Isaiah",
    "Ezekiel",
    "Matthew",
    "Luke",
    "Hebrews",
    "1 Peter",
    "2 Peter",
    "Ether",
    "Moses",
    "Doctrine and Covenants",
  ],
  gabriel: ["Daniel", "Luke", "Doctrine and Covenants"],

  // ── Adam/Michael collision ──
  adam: [
    "Genesis",
    "Deuteronomy",
    "Joshua",
    "1 Chronicles",
    "Hosea",
    "Luke",
    "Romans",
    "1 Corinthians",
    "1 Timothy",
    "Jude",
    "2 Nephi",
    "Mosiah",
    "Alma",
    "Mormon",
    "Moroni",
    "Doctrine and Covenants",
    "Moses",
    "Abraham",
  ],
  michael: ["Daniel", "Jude", "Revelation", "Doctrine and Covenants"],

  // ── Samuel Harrison Smith / Samuel Smith (two entries) ──
  "sam-smith": ["Doctrine and Covenants", "Joseph Smith—History"],
  "samuel-smith": ["Doctrine and Covenants"],

  // ── Nathanael/Bartholomew collision ──
  bartholomew: ["Matthew", "Mark", "Luke", "Acts"],
  "nathanael-dc": ["Doctrine and Covenants"],

  // ── Justus (three-way collision) ──
  "justus-of-colossae": ["Colossians"],
  "joseph-barsabas": ["Acts"],
  "titius-justus": ["Acts"],

  // ── Zechariah king of Israel ──
  "zechariah-king-of-israel": ["2 Kings"],

  // ── Anti-Nephi-Lehi (contains "Nephi" and "Lehi" substrings) ──
  "anti-nephi-lehi": ["Alma"],

  // ── Nephihah (contains "Nephi" substring) ──
  nephihah: ["Alma"],

  // ── Zenephi (contains "Nephi" substring) ──
  zenephi: ["Moroni"],

  // ── Abimelech son of Gideon ──
  "abimelech-son-of-gideon": ["Judges", "2 Samuel"],

  // ── Jotham son of Gideon ──
  "jotham-son-of-gideon": ["Judges", "2 Kings", "2 Chronicles", "Isaiah"],

  // ── Ishmael son of Nethaniah ──
  "ishmael-son-of-nethaniah": ["Jeremiah", "2 Kings"],

  // ── D&C specific characters (single book) ──
  "oliver-cowdery": ["Doctrine and Covenants"],
  "joseph-smith-sr": ["Doctrine and Covenants"],
  "gideon-carter": ["Doctrine and Covenants"],
  "jacob-scott": ["Doctrine and Covenants"],
  "jared-carter": ["Doctrine and Covenants"],
  "joseph-knight-sr": ["Doctrine and Covenants"],
  "joseph-wakefield": ["Doctrine and Covenants"],
  "joseph-young": ["Doctrine and Covenants"],
  "simeon-carter": ["Doctrine and Covenants"],
  "levi-hancock": ["Doctrine and Covenants"],
  "aaron-johnson-dc": ["Doctrine and Covenants"],
  "simeon-niger": ["Acts"],

  // ── Brother of Jared (avoid "Jared" collision) ──
  "brother-of-jared": ["Ether"],

  // ── Daughter of Jared ──
  "daughter-of-jared": ["Ether"],

  // ── Sergius Paulus (contains "Paul" substring) ──
  "sergius-paulus": ["Acts"],

  // ══════════════════════════════════════════════════════════════════════
  // Characters whose name/aliases don't match text literally
  // (descriptive names, KJV spelling differences, qualifiers in parens)
  // ══════════════════════════════════════════════════════════════════════

  // Captain Moroni — text just says "Moroni"
  "captain-moroni": ["Alma", "Helaman"],

  // Abimelech of Gerar — text has "Abimelech" (shared with Judges Abimelech)
  "abimelech-gerar": ["Genesis"],

  // Ahaziah (king of Israel) — text has "Ahaziah"
  "ahaziah-king-of-israel": ["1 Kings", "2 Kings", "2 Chronicles"],

  // Ahaziah (king of Judah) — same base name
  "ahaziah-king-of-judah": ["2 Kings", "2 Chronicles"],

  // Alvin Smith — name not in scripture text, mentioned only in D&C headers
  "alvin-smith": ["Doctrine and Covenants"],

  // Ananias — text just says "Ananias"
  "ananias-high-priest": ["Acts"],
  "ananias-of-jerusalem": ["Acts"],

  // Antipas — text has "Antipas" (in Revelation)
  "antipas-of-pergamum": ["Revelation"],

  // Bathsheba — KJV spells it "Bath-sheba"
  bathsheba: ["2 Samuel", "1 Kings"],

  // Demetrius — text has "Demetrius"
  "demetrius-silversmith": ["Acts"],
  "demetrius-3-john": ["3 John"],

  // Herod — text just says "Herod" for all three
  "herod-the-great": ["Matthew", "Luke"],
  "herod-antipas": ["Matthew", "Mark", "Luke", "Acts"],
  "herod-agrippa-i": ["Acts"],

  // Hiram — text has "Hiram"
  "hiram-king-of-tyre": ["2 Samuel", "1 Kings", "2 Chronicles"],
  "hiram-craftsman": ["1 Kings", "2 Chronicles"],

  // Hoshea (king of Israel) — text has "Hoshea"
  "hoshea-king-of-israel": ["2 Kings"],

  // Jehoash (king of Israel) — text has "Jehoash"
  "jehoash-king-of-israel": ["2 Kings"],

  // Jehoram (king of Judah) — text has "Jehoram"
  "jehoram-king-of-judah": ["2 Kings", "2 Chronicles", "1 Kings"],

  // Jeroboam II — text just says "Jeroboam"
  "jeroboam-ii": ["2 Kings", "Amos", "Hosea"],

  // Jeshua (high priest) — text has "Jeshua"
  "jeshua-high-priest": ["Ezra", "Nehemiah", "Haggai", "Zechariah"],

  // Joram (king of Israel) — text has "Joram"
  "joram-king-of-israel": ["2 Kings", "2 Chronicles"],

  // Joseph of Nazareth — text just says "Joseph"
  "joseph-of-nazareth": ["Matthew", "Luke", "John"],

  // Joseph of Arimathea — text has "Joseph of Arimathaea" (KJV spelling)
  "joseph-of-arimathea": ["Matthew", "Mark", "Luke", "John"],

  // Lucy Mack Smith — not in scripture text
  "lucy-mack-smith": [],

  // Mary of Bethany — text just says "Mary"
  "mary-of-bethany": ["Luke", "John"],

  // Mary (mother of Mark) — text just says "Mary"
  "mary-mother-of-mark": ["Acts"],

  // Mary (of Rome) — text has "Mary" in Romans 16
  "mary-of-rome": ["Romans"],

  // Mary (wife of Cleophas) — KJV has "Mary the wife of Cleophas"
  "mary-wife-of-cleophas": ["John"],

  // Medium/Witch of Endor — not named by name in text
  "medium-of-endor": ["1 Samuel"],

  // Mosiah I — text just says "Mosiah"
  "mosiah-i": ["Omni"],

  // Shunammite Woman — descriptive title
  "shunammite-woman": ["2 Kings"],

  // Simon the sorcerer — text just says "Simon"
  "simon-the-sorcerer": ["Acts"],

  // Simon (brother of Jesus) — text just says "Simon" in context
  "simon-brother-of-jesus": ["Matthew", "Mark"],

  // Widow of Zarephath — descriptive title
  "widow-of-zarephath": ["1 Kings"],

  // Alexander — text just says "Alexander"
  "alexander-son-of-simon": ["Mark"],
  "alexander-coppersmith": ["1 Timothy", "2 Timothy", "Acts"],

  // Amos (son of Amos, BoM) — "Amos" in text
  "amos-son-of-amos": ["4 Nephi"],

  // Bezalel — KJV spells it "Bezaleel"
  bezalel: ["Exodus", "1 Chronicles", "2 Chronicles", "Ezra"],

  // Catherine Smith — not in scripture text
  "catherine-smith": [],

  // Cushan-rishathaim — KJV has "Chushan-rishathaim"
  "cushan-rishathaim": ["Judges"],

  // Elah (king of Israel) — text has "Elah"
  "elah-king-of-israel": ["1 Kings"],

  // Elizabeth Marsh — not in scripture text
  "thomas-marsh-wife": [],

  // Enoch (son of Cain) — text has "Enoch" (collision with Sethite Enoch)
  "enoch-cainite": ["Genesis", "Moses"],

  // Enos (Sethite/PoGP) — text has "Enos"
  "enos-pogp": ["Genesis", "Moses", "Luke", "Doctrine and Covenants"],

  // Gad (prophet) — text has "Gad"
  "gad-prophet": ["1 Samuel", "2 Samuel", "1 Chronicles"],

  // Gaius — text has "Gaius"
  "gaius-3-john": ["3 John"],

  // Hananiah (false prophet) — text has "Hananiah"
  "hananiah-false-prophet": ["Jeremiah"],

  // Ichabod — KJV has "I-chabod"
  ichabod: ["1 Samuel"],

  // Jehoahaz (king of Israel) — text has "Jehoahaz"
  "jehoahaz-king-of-israel": ["2 Kings", "2 Chronicles"],

  // Joses (brother of Jesus) — text has "Joses"
  "joses-brother-of-jesus": ["Matthew", "Mark"],

  // Jotham (king of Judah) — text has "Jotham"
  "jotham-king-of-judah": ["2 Kings", "2 Chronicles", "Isaiah"],

  // Judas — text has "Judas" (multiple people)
  "judas-of-damascus": ["Acts"],
  "judas-barsabas": ["Acts"],

  // Lamech (descendant of Cain) — text has "Lamech"
  "lamech-cainite": ["Genesis", "Moses"],

  // Leman Copley — not in scripture text, D&C section header only
  "leman-copley": ["Doctrine and Covenants"],

  // Levi (Jaredite) — text may not mention, Ether lineage list
  "levi-jaredite": ["Ether"],

  // Lyman E. Johnson — not in scripture text
  "lyman-e-johnson": ["Doctrine and Covenants"],

  // Micah (of Ephraim) — text has "Micah"
  "micah-of-ephraim": ["Judges"],

  // Nadab (king of Israel) — text has "Nadab"
  "nadab-king-of-israel": ["1 Kings"],

  // Nebuzaradan — text has "Nebuzar-adan" (hyphenated in KJV)
  nebuzaradan: ["2 Kings", "Jeremiah"],

  // Noah (Jaredite) — text mentions lineage
  "noah-jaredite": ["Ether"],

  // Northrop Sweet — not in scripture text
  "leman-copley-northrop": ["Doctrine and Covenants"],

  // Orson Spencer — not in scripture text
  "orson-spencer": ["Doctrine and Covenants"],

  // Pashhur — KJV spells it "Pashur"
  pashhur: ["Jeremiah", "1 Chronicles", "Ezra", "Nehemiah"],

  // Peter Whitmer Jr. — not in scripture text
  "peter-whitmer-jr": ["Doctrine and Covenants"],

  // Phinehas (son of Eli) — text has "Phinehas"
  "phinehas-son-of-eli": ["1 Samuel"],

  // Potiphera — KJV has "Poti-phera" / "Potipherah"
  potiphera: ["Genesis"],

  // Salome (daughter of Herodias) — text has "Salome" in Mark
  "salome-daughter-of-herodias": [],

  // Servant Girl of Naaman — descriptive title
  "servant-girl-of-naaman": ["2 Kings"],

  // Seth (Jaredite) — Ether lineage
  "seth-jaredite": ["Ether"],

  // Shallum (king of Israel) — text has "Shallum"
  "shallum-king-of-israel": ["2 Kings"],

  // Shalmaneser V — text has "Shalmaneser"
  shalmaneser: ["2 Kings"],

  // Shiblom (Jaredite) — Ether lineage
  "shiblom-jaredite": ["Ether"],

  // Sophronia Smith — not in scripture text
  "sophronia-smith": [],

  // Tattenai — KJV spells it "Tatnai"
  tattenai: ["Ezra"],
};

// ── Load characters ──────────────────────────────────────────────────
interface Character {
  id: string;
  name: string;
  aliases?: string[];
  volumes: string[];
  books?: string[];
  [key: string]: unknown;
}

const characters: Character[] = JSON.parse(
  fs.readFileSync(CHARS_PATH, "utf-8")
);

console.log(`Loaded ${characters.length} characters`);

// ── Preload all verses grouped by book ───────────────────────────────
// We'll load all verses once and search in-memory (much faster than per-character queries)
interface Verse {
  book_id: number;
  text: string;
}

console.log("Loading all verses from database...");
const tmpFile = queryDbToFile(
  `SELECT book_id, text FROM verses ORDER BY book_id`
);
const versesByBook = new Map<number, string[]>();
let totalVerses = 0;
{
  const data = fs.readFileSync(tmpFile, "utf-8");
  const lines = data.split("\n");
  for (const line of lines) {
    if (!line) continue;
    const pipeIdx = line.indexOf("|");
    if (pipeIdx === -1) continue;
    const bookId = Number(line.slice(0, pipeIdx));
    const text = line.slice(pipeIdx + 1);
    let arr = versesByBook.get(bookId);
    if (!arr) {
      arr = [];
      versesByBook.set(bookId, arr);
    }
    arr.push(text);
    totalVerses++;
  }
  // Clean up
  try { fs.unlinkSync(tmpFile); } catch {}
}
console.log(
  `Loaded ${totalVerses} verses across ${versesByBook.size} books`
);

// ── Build volume → book IDs mapping ──────────────────────────────────
const volumeBooks = new Map<string, number[]>();
for (const b of bookRows) {
  let arr = volumeBooks.get(b.abbrev);
  if (!arr) {
    arr = [];
    volumeBooks.set(b.abbrev, arr);
  }
  arr.push(b.id);
}

// ── Helper: search for a character in verses ─────────────────────────
function findBooksForCharacter(char: Character): string[] {
  // Build search terms: name + aliases
  const searchTerms = [char.name, ...(char.aliases || [])].filter(Boolean);
  // Escape regex special chars
  const escaped = searchTerms.map((t) =>
    t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  );
  const pattern = new RegExp(`\\b(${escaped.join("|")})\\b`, "i");

  // Get the set of book IDs belonging to this character's volumes
  const candidateBookIds = new Set<number>();
  for (const vol of char.volumes) {
    const bookIds = volumeBooks.get(vol);
    if (bookIds) {
      for (const id of bookIds) {
        candidateBookIds.add(id);
      }
    }
  }

  // Search through candidate books
  const matchedBooks: string[] = [];
  for (const bookId of candidateBookIds) {
    const verses = versesByBook.get(bookId);
    if (!verses) continue;
    // Check if any verse matches
    let found = false;
    for (const text of verses) {
      if (pattern.test(text)) {
        found = true;
        break;
      }
    }
    if (found) {
      matchedBooks.push(bookIdToName[bookId]);
    }
  }

  return matchedBooks;
}

// ── Sort books in canonical order ────────────────────────────────────
function sortBooks(books: string[]): string[] {
  return books.sort((a, b) => {
    const idA = bookNameToId[a] ?? 999;
    const idB = bookNameToId[b] ?? 999;
    return idA - idB;
  });
}

// ── Process each character ───────────────────────────────────────────
let overrideCount = 0;
let searchCount = 0;
let emptyCount = 0;

for (const char of characters) {
  if (MANUAL_OVERRIDES[char.id]) {
    // Use manual override
    char.books = sortBooks([...MANUAL_OVERRIDES[char.id]]);
    overrideCount++;
  } else {
    // Use text search
    const found = findBooksForCharacter(char);
    char.books = sortBooks(found);
    searchCount++;
    if (found.length === 0) {
      emptyCount++;
    }
  }
}

console.log(`\nResults:`);
console.log(`  Manual overrides applied: ${overrideCount}`);
console.log(`  Text search applied: ${searchCount}`);
console.log(`  Characters with 0 books found: ${emptyCount}`);

// Show characters with no books found (for debugging)
if (emptyCount > 0) {
  console.log(`\n  Characters with no book matches:`);
  for (const char of characters) {
    if (char.books && char.books.length === 0) {
      const terms = [char.name, ...(char.aliases || [])].filter(Boolean);
      console.log(`    ${char.id} (search: ${terms.join(", ")}) volumes: ${char.volumes.join(", ")}`);
    }
  }
}

// ── Some spot checks ─────────────────────────────────────────────────
console.log("\n── Spot checks ──");
const spotChecks = [
  "abraham",
  "nephi-son-of-lehi",
  "alma-the-younger",
  "paul",
  "jacob-israel",
  "jacob-son-of-lehi",
  "jesus-christ",
  "moses",
  "oliver-cowdery",
  "moroni-bom",
];
for (const id of spotChecks) {
  const char = characters.find((c) => c.id === id);
  if (char) {
    console.log(`  ${char.id}: [${char.books?.join(", ")}]`);
  }
}

// ── Write back to characters.json ────────────────────────────────────
fs.writeFileSync(CHARS_PATH, JSON.stringify(characters, null, 2) + "\n");
console.log(`\nWrote updated characters.json with books arrays.`);
