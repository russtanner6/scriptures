import { getDb } from "./db";
import type { Volume, FrequencyResult, BookStat } from "./types";

// Helper: sql.js exec returns [{columns, values}] — convert to objects
function execToObjects<T>(db: import("sql.js").Database, sql: string, params?: (string | number)[]): T[] {
  const stmt = db.prepare(sql);
  if (params && params.length > 0) {
    stmt.bind(params);
  }
  const results: T[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject() as T;
    results.push(row);
  }
  stmt.free();
  return results;
}

export async function getVolumesWithBooks(): Promise<Volume[]> {
  const db = await getDb();
  const rows = execToObjects<{
    volume_id: number;
    volume_name: string;
    abbrev: string;
    vol_order: number;
    book_id: number;
    book_name: string;
    display_order: number;
    chapter_count: number;
  }>(
    db,
    `SELECT v.id as volume_id, v.name as volume_name, v.abbrev, v.display_order as vol_order,
            b.id as book_id, b.name as book_name, b.display_order, b.chapter_count
     FROM volumes v
     JOIN books b ON b.volume_id = v.id
     ORDER BY v.display_order, b.display_order`
  );

  const volumeMap = new Map<number, Volume>();
  for (const row of rows) {
    if (!volumeMap.has(row.volume_id)) {
      volumeMap.set(row.volume_id, {
        id: row.volume_id,
        name: displayName(row.volume_name),
        abbrev: row.abbrev,
        displayOrder: row.vol_order,
        books: [],
      });
    }
    volumeMap.get(row.volume_id)!.books.push({
      id: row.book_id,
      name: displayName(row.book_name),
      volumeId: row.volume_id,
      volumeName: displayName(row.volume_name),
      volumeAbbrev: row.abbrev,
      displayOrder: row.display_order,
      chapterCount: row.chapter_count,
    });
  }
  return Array.from(volumeMap.values()).sort(
    (a, b) => a.displayOrder - b.displayOrder
  );
}

// Normalize names for display (e.g., "Doctrine and Covenants" → "D&C")
function displayName(name: string): string {
  if (name === "Doctrine and Covenants") return "D&C";
  return name;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function getWordFrequency(
  word: string,
  options: {
    caseInsensitive?: boolean;
    wholeWord?: boolean;
    volumeIds?: number[];
    bookIds?: number[];
  } = {}
): Promise<{ totalCount: number; totalVerses: number; results: FrequencyResult[]; matchedWords: { word: string; count: number }[] }> {
  const db = await getDb();
  const { caseInsensitive = true, wholeWord = true, volumeIds, bookIds } = options;

  // Build WHERE clause for filtering
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (bookIds && bookIds.length > 0) {
    conditions.push(`b.id IN (${bookIds.map(() => "?").join(",")})`);
    params.push(...bookIds);
  } else if (volumeIds && volumeIds.length > 0) {
    conditions.push(`v.id IN (${volumeIds.map(() => "?").join(",")})`);
    params.push(...volumeIds);
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  // Fetch all verses from selected books
  const verses = execToObjects<{ text: string; book_id: number }>(
    db,
    `SELECT vs.text, b.id as book_id
     FROM verses vs
     JOIN books b ON b.id = vs.book_id
     JOIN volumes v ON v.id = b.volume_id
     ${whereClause}`,
    params
  );

  // Detect phrase search: if wrapped in quotes, treat as exact phrase
  const isPhrase = /^".*"$/.test(word) || /^'.*'$/.test(word);
  const searchTerm = isPhrase ? word.slice(1, -1) : word;

  // Build regex
  const escaped = escapeRegex(searchTerm);
  // Phrases always match exactly (no word boundary needed since they contain spaces)
  const pattern = isPhrase
    ? escaped
    : wholeWord
      ? `\\b${escaped}\\b`
      : escaped;
  const flags = caseInsensitive ? "gi" : "g";
  const regex = new RegExp(pattern, flags);

  // For partial matches (not whole word and not phrase), capture full words
  const wordCapture = !wholeWord && !isPhrase
    ? new RegExp(`\\b\\w*${escaped}\\w*\\b`, caseInsensitive ? "gi" : "g")
    : null;

  // Count matches per book + collect matched words
  const counts = new Map<number, { count: number; verseCount: number }>();
  const matchedWordsMap = new Map<string, number>();

  for (const verse of verses) {
    const matches = verse.text.match(regex);
    if (matches) {
      const entry = counts.get(verse.book_id) || {
        count: 0,
        verseCount: 0,
      };
      entry.count += matches.length;
      entry.verseCount += 1;
      counts.set(verse.book_id, entry);

      // Collect distinct matched words for partial search
      if (wordCapture) {
        const wordMatches = verse.text.match(wordCapture);
        if (wordMatches) {
          for (const w of wordMatches) {
            const normalized = caseInsensitive ? w.toLowerCase() : w;
            matchedWordsMap.set(normalized, (matchedWordsMap.get(normalized) || 0) + 1);
          }
        }
      }
    }
  }

  // Get book metadata for books with results
  const bookIds_all = Array.from(counts.keys());
  if (bookIds_all.length === 0) {
    return { totalCount: 0, totalVerses: 0, results: [], matchedWords: [] };
  }

  const bookMeta = execToObjects<{
    id: number;
    name: string;
    display_order: number;
    volume_name: string;
    abbrev: string;
  }>(
    db,
    `SELECT b.id, b.name, b.display_order, v.name as volume_name, v.abbrev
     FROM books b
     JOIN volumes v ON v.id = b.volume_id
     WHERE b.id IN (${bookIds_all.map(() => "?").join(",")})
     ORDER BY b.display_order`,
    bookIds_all
  );

  let totalCount = 0;
  let totalVerses = 0;
  const results: FrequencyResult[] = [];

  for (const book of bookMeta) {
    const c = counts.get(book.id);
    if (c) {
      totalCount += c.count;
      totalVerses += c.verseCount;
      results.push({
        bookId: book.id,
        bookName: displayName(book.name),
        volumeName: displayName(book.volume_name),
        volumeAbbrev: book.abbrev,
        displayOrder: book.display_order,
        count: c.count,
        verseCount: c.verseCount,
      });
    }
  }

  // Build sorted matched words list
  const matchedWords = Array.from(matchedWordsMap.entries())
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count);

  return { totalCount, totalVerses, results, matchedWords };
}

export async function getBookStats(): Promise<BookStat[]> {
  const db = await getDb();
  const rows = execToObjects<{
    book_id: number;
    book_name: string;
    display_order: number;
    chapter_count: number;
    volume_name: string;
    volume_abbrev: string;
    word_count: number;
    verse_count: number;
    avg_verse_length: number;
    avg_word_length: number;
  }>(
    db,
    `SELECT b.id as book_id, b.name as book_name, b.display_order, b.chapter_count,
            v.name as volume_name, v.abbrev as volume_abbrev,
            bs.word_count, bs.verse_count, bs.avg_verse_length, bs.avg_word_length
     FROM books b
     JOIN volumes v ON v.id = b.volume_id
     JOIN book_stats bs ON bs.book_id = b.id
     ORDER BY b.display_order`
  );

  return rows.map((r) => ({
    bookId: r.book_id,
    bookName: displayName(r.book_name),
    volumeName: displayName(r.volume_name),
    volumeAbbrev: r.volume_abbrev,
    displayOrder: r.display_order,
    wordCount: r.word_count,
    verseCount: r.verse_count,
    chapterCount: r.chapter_count,
    avgVerseLength: r.avg_verse_length,
    avgWordLength: r.avg_word_length,
  }));
}

/**
 * Get word frequency by book AND chapter for an entire volume (or all volumes).
 * Used for heatmap visualization.
 */
export async function getHeatmapData(
  word: string,
  options: { caseInsensitive?: boolean; wholeWord?: boolean; volumeIds?: number[] } = {}
): Promise<{ bookId: number; bookName: string; volumeAbbrev: string; chapter: number; count: number }[]> {
  const db = await getDb();
  const { caseInsensitive = true, wholeWord = true, volumeIds } = options;

  const conditions: string[] = [];
  const params: (string | number)[] = [];
  if (volumeIds && volumeIds.length > 0) {
    conditions.push(`v.id IN (${volumeIds.map(() => "?").join(",")})`);
    params.push(...volumeIds);
  }
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const verses = execToObjects<{ book_id: number; chapter: number; text: string }>(
    db,
    `SELECT vs.book_id, vs.chapter, vs.text
     FROM verses vs
     JOIN books b ON b.id = vs.book_id
     JOIN volumes v ON v.id = b.volume_id
     ${whereClause}
     ORDER BY b.display_order, vs.chapter`,
    params
  );

  const isPhrase = /^".*"$/.test(word) || /^'.*'$/.test(word);
  const searchTerm = isPhrase ? word.slice(1, -1) : word;
  const escaped = escapeRegex(searchTerm);
  const pattern = isPhrase ? escaped : wholeWord ? `\\b${escaped}\\b` : escaped;
  const flags = caseInsensitive ? "gi" : "g";
  const regex = new RegExp(pattern, flags);

  // Count per book+chapter
  const counts = new Map<string, number>();
  for (const verse of verses) {
    const matches = verse.text.match(regex);
    if (matches) {
      const key = `${verse.book_id}-${verse.chapter}`;
      counts.set(key, (counts.get(key) || 0) + matches.length);
    }
  }

  // Get book metadata
  const bookMeta = execToObjects<{ id: number; name: string; abbrev: string; chapter_count: number; display_order: number }>(
    db,
    `SELECT b.id, b.name, v.abbrev, b.chapter_count, b.display_order
     FROM books b JOIN volumes v ON v.id = b.volume_id
     ${whereClause}
     ORDER BY b.display_order`,
    params
  );

  const results: { bookId: number; bookName: string; volumeAbbrev: string; chapter: number; count: number }[] = [];
  for (const book of bookMeta) {
    for (let ch = 1; ch <= book.chapter_count; ch++) {
      const key = `${book.id}-${ch}`;
      results.push({
        bookId: book.id,
        bookName: displayName(book.name),
        volumeAbbrev: book.abbrev,
        chapter: ch,
        count: counts.get(key) || 0,
      });
    }
  }
  return results;
}

/**
 * Get word frequency by chapter/section for a single book.
 * Used for volumes like D&C where there's only one "book" with many sections.
 */
export async function getWordFrequencyByChapter(
  word: string,
  bookId: number,
  chapterCount: number,
  options: { caseInsensitive?: boolean; wholeWord?: boolean } = {}
): Promise<{ chapter: number; count: number }[]> {
  const db = await getDb();
  const { caseInsensitive = true, wholeWord = true } = options;

  const verses = execToObjects<{ chapter: number; text: string }>(
    db,
    `SELECT chapter, text FROM verses WHERE book_id = ? ORDER BY chapter`,
    [bookId]
  );

  const isPhrase = /^".*"$/.test(word) || /^'.*'$/.test(word);
  const searchTerm = isPhrase ? word.slice(1, -1) : word;
  const escaped = escapeRegex(searchTerm);
  const pattern = isPhrase ? escaped : wholeWord ? `\\b${escaped}\\b` : escaped;
  const flags = caseInsensitive ? "gi" : "g";
  const regex = new RegExp(pattern, flags);

  const counts = new Map<number, number>();
  for (const verse of verses) {
    const matches = verse.text.match(regex);
    if (matches) {
      counts.set(verse.chapter, (counts.get(verse.chapter) || 0) + matches.length);
    }
  }

  // Return all chapters (1 to chapterCount), 0 for chapters with no matches
  const result: { chapter: number; count: number }[] = [];
  for (let ch = 1; ch <= chapterCount; ch++) {
    result.push({ chapter: ch, count: counts.get(ch) || 0 });
  }
  return result;
}

export interface VerseMatch {
  chapter: number;
  verse: number;
  text: string;
  text_modern?: string | null;
}

export async function getChapterVerses(
  bookId: number,
  chapter: number
): Promise<{ bookName: string; volumeAbbrev: string; chapterCount: number; verses: VerseMatch[]; narration?: string | null }> {
  const db = await getDb();

  const bookRows = execToObjects<{ name: string; volume_id: number; chapter_count: number }>(
    db,
    `SELECT b.name, b.volume_id, b.chapter_count FROM books b WHERE b.id = ?`,
    [bookId]
  );
  const bookName = displayName(bookRows[0]?.name || "Unknown");
  const chapterCount = bookRows[0]?.chapter_count || 0;

  // Get volume abbrev
  const volRows = execToObjects<{ abbrev: string }>(
    db,
    `SELECT abbrev FROM volumes WHERE id = ?`,
    [bookRows[0]?.volume_id || 0]
  );
  const volumeAbbrev = volRows[0]?.abbrev || "";

  const verses = execToObjects<{ chapter: number; verse: number; text: string; text_modern: string | null }>(
    db,
    `SELECT chapter, verse, text, text_modern FROM verses WHERE book_id = ? AND chapter = ? ORDER BY verse`,
    [bookId, chapter]
  );

  // Get narration if available
  let narration: string | null = null;
  try {
    const narRows = execToObjects<{ narration: string }>(
      db,
      `SELECT narration FROM narrations WHERE book_id = ? AND chapter = ?`,
      [bookId, chapter]
    );
    narration = narRows[0]?.narration || null;
  } catch {
    // narrations table may not exist yet — that's fine
  }

  return { bookName, volumeAbbrev, chapterCount, verses, narration };
}

export async function getBookIdBySlug(
  volumeAbbrev: string,
  bookSlug: string
): Promise<{ bookId: number; bookName: string; chapterCount: number } | null> {
  const db = await getDb();

  // Map volume abbreviation to volume name patterns
  const volumeMap: Record<string, string[]> = {
    ot: ["Old Testament"],
    nt: ["New Testament"],
    bom: ["Book of Mormon"],
    dc: ["Doctrine and Covenants", "D&C"],
    pogp: ["Pearl of Great Price"],
  };

  const volumeNames = volumeMap[volumeAbbrev.toLowerCase()];
  if (!volumeNames) return null;

  // Get volume IDs
  const placeholders = volumeNames.map(() => "?").join(",");
  const volRows = execToObjects<{ id: number }>(
    db,
    `SELECT id FROM volumes WHERE name IN (${placeholders})`,
    volumeNames
  );
  if (volRows.length === 0) return null;

  // Normalize slug to match book names
  const slugNormalized = bookSlug.toLowerCase().replace(/-/g, " ");

  // Get all books in this volume
  const volIds = volRows.map(v => v.id);
  const volPlaceholders = volIds.map(() => "?").join(",");
  const books = execToObjects<{ id: number; name: string; chapter_count: number }>(
    db,
    `SELECT id, name, chapter_count FROM books WHERE volume_id IN (${volPlaceholders})`,
    volIds
  );

  // Match by normalized name
  const match = books.find(b => b.name.toLowerCase().replace(/-/g, " ") === slugNormalized)
    || books.find(b => b.name.toLowerCase().replace(/\s+/g, "-") === bookSlug.toLowerCase());

  if (!match) return null;
  return { bookId: match.id, bookName: displayName(match.name), chapterCount: match.chapter_count };
}

export async function getMatchingVerses(
  word: string,
  bookId: number,
  options: { caseInsensitive?: boolean; wholeWord?: boolean; chapter?: number } = {}
): Promise<{ bookName: string; verses: VerseMatch[] }> {
  const db = await getDb();
  const { caseInsensitive = true, wholeWord = true, chapter } = options;

  // Get book name
  const bookRows = execToObjects<{ name: string }>(
    db,
    `SELECT name FROM books WHERE id = ?`,
    [bookId]
  );
  const bookName = displayName(bookRows[0]?.name || "Unknown");

  // Fetch verses from this book (optionally filtered by chapter)
  const sql = chapter != null
    ? `SELECT chapter, verse, text FROM verses WHERE book_id = ? AND chapter = ? ORDER BY chapter, verse`
    : `SELECT chapter, verse, text FROM verses WHERE book_id = ? ORDER BY chapter, verse`;
  const params: (string | number)[] = chapter != null ? [bookId, chapter] : [bookId];
  const verses = execToObjects<{ chapter: number; verse: number; text: string }>(
    db,
    sql,
    params
  );

  // Multi-word search: pipe-delimited words (e.g., "bless|blessed|mercy|grace")
  const isMultiWord = word.includes("|");
  if (isMultiWord) {
    const words = word.split("|").map((w) => w.trim()).filter(Boolean);
    const escapedWords = words.map((w) => escapeRegex(w));
    const altPattern = `\\b(${escapedWords.join("|")})\\b`;
    // Use 'i' flag only (not 'g') — the 'g' flag causes regex.test() to
    // maintain lastIndex state between calls, skipping ~half the matches
    const flags = caseInsensitive ? "i" : "";
    const regex = new RegExp(altPattern, flags);
    const matching = verses.filter((v) => regex.test(v.text));
    return { bookName, verses: matching };
  }

  // Detect phrase search
  const isPhrase = /^".*"$/.test(word) || /^'.*'$/.test(word);
  const searchTerm = isPhrase ? word.slice(1, -1) : word;

  // Build regex
  const escaped = escapeRegex(searchTerm);
  const pattern = isPhrase
    ? escaped
    : wholeWord
      ? `\\b${escaped}\\b`
      : escaped;
  // Use 'i' flag only (not 'g') — the 'g' flag causes regex.test() to
  // maintain lastIndex state between calls, skipping ~half the matches
  const flags = caseInsensitive ? "i" : "";
  const regex = new RegExp(pattern, flags);

  // Filter verses that match
  const matching = verses.filter((v) => regex.test(v.text));

  return { bookName, verses: matching };
}

// Common English stop words to exclude from word cloud
const STOP_WORDS = new Set([
  "the", "and", "of", "to", "in", "a", "that", "it", "is", "was", "for",
  "i", "he", "his", "with", "they", "be", "not", "them", "their", "shall",
  "him", "but", "all", "which", "had", "were", "upon", "my", "this", "have",
  "from", "or", "one", "by", "as", "ye", "me", "do", "did", "are", "we",
  "there", "her", "she", "been", "an", "who", "so", "if", "will", "no",
  "on", "thee", "thy", "thou", "at", "out", "up", "said", "when", "what",
  "into", "am", "than", "also", "after", "before", "even", "may", "about",
  "over", "own", "those", "these", "its", "has", "us", "our", "man", "men",
  "now", "then", "came", "come", "went", "go", "say", "should", "would",
  "could", "how", "can", "let", "more", "other", "some", "any", "much",
  "many", "being", "because", "through", "hath", "unto", "doth", "against",
  "therefore", "again", "whom", "might", "made", "make", "down", "two",
  "you", "your", "yea", "behold", "pass", "among", "every", "thus", "according",
  "saith", "day", "days", "things", "great", "wherefore", "exceedingly",
]);

export interface WordCloudItem {
  word: string;
  count: number;
  weight: number; // 0-1 normalized
}

export async function getWordCloudData(
  bookId: number,
  chapter?: number,
  limit: number = 80
): Promise<{
  bookName: string;
  volumeAbbrev: string;
  chapterLabel: string;
  totalWords: number;
  words: WordCloudItem[];
}> {
  const db = await getDb();

  // Get book info
  const bookRows = execToObjects<{ name: string; volume_id: number; chapter_count: number }>(
    db,
    `SELECT b.name, b.volume_id, b.chapter_count FROM books b WHERE b.id = ?`,
    [bookId]
  );
  if (bookRows.length === 0) {
    return { bookName: "", volumeAbbrev: "", chapterLabel: "", totalWords: 0, words: [] };
  }

  const volRows = execToObjects<{ abbrev: string }>(
    db,
    `SELECT abbrev FROM volumes WHERE id = ?`,
    [bookRows[0].volume_id]
  );

  const bookName = displayName(bookRows[0].name);
  const volumeAbbrev = volRows[0]?.abbrev || "";
  const isDC = volumeAbbrev === "D&C";

  // Fetch verses
  let sql = `SELECT text FROM verses WHERE book_id = ?`;
  const params: (string | number)[] = [bookId];
  if (chapter != null) {
    sql += ` AND chapter = ?`;
    params.push(chapter);
  }

  const verseRows = execToObjects<{ text: string }>(db, sql, params);

  // Tokenize and count
  const wordCounts = new Map<string, number>();
  let totalWords = 0;

  for (const row of verseRows) {
    const text = row.text;
    // Split on non-word characters, lowercase, filter
    const words = text.toLowerCase().replace(/[^a-z'-]/g, " ").split(/\s+/).filter(w => w.length > 2);
    for (const w of words) {
      // Strip leading/trailing punctuation
      const clean = w.replace(/^['-]+|['-]+$/g, "");
      if (clean.length < 3 || STOP_WORDS.has(clean)) continue;
      totalWords++;
      wordCounts.set(clean, (wordCounts.get(clean) || 0) + 1);
    }
  }

  // Sort by count, take top N
  const sorted = Array.from(wordCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);

  const maxCount = sorted.length > 0 ? sorted[0][1] : 1;

  const words: WordCloudItem[] = sorted.map(([word, count]) => ({
    word,
    count,
    weight: count / maxCount,
  }));

  const chapterLabel = chapter
    ? (isDC ? `Section ${chapter}` : `Chapter ${chapter}`)
    : `All ${isDC ? "Sections" : "Chapters"}`;

  return { bookName, volumeAbbrev, chapterLabel, totalWords, words };
}

export async function getVolumeWordCloudData(
  volumeId: number,
  limit: number = 80
): Promise<{
  bookName: string;
  volumeAbbrev: string;
  chapterLabel: string;
  totalWords: number;
  words: WordCloudItem[];
}> {
  const db = await getDb();

  // Get volume info
  const volRows = execToObjects<{ name: string; abbrev: string }>(
    db,
    `SELECT name, abbrev FROM volumes WHERE id = ?`,
    [volumeId]
  );
  if (volRows.length === 0) {
    return { bookName: "", volumeAbbrev: "", chapterLabel: "", totalWords: 0, words: [] };
  }

  const volumeName = displayName(volRows[0].name);
  const volumeAbbrev = volRows[0].abbrev;

  // Fetch all verse text for this volume
  const verseRows = execToObjects<{ text: string }>(
    db,
    `SELECT v.text FROM verses v
     JOIN books b ON v.book_id = b.id
     WHERE b.volume_id = ?`,
    [volumeId]
  );

  // Tokenize and count (same logic as book-level)
  const wordCounts = new Map<string, number>();
  let totalWords = 0;

  for (const row of verseRows) {
    const text = row.text;
    const words = text.toLowerCase().replace(/[^a-z'-]/g, " ").split(/\s+/).filter(w => w.length > 2);
    for (const w of words) {
      const clean = w.replace(/^['-]+|['-]+$/g, "");
      if (clean.length < 3 || STOP_WORDS.has(clean)) continue;
      totalWords++;
      wordCounts.set(clean, (wordCounts.get(clean) || 0) + 1);
    }
  }

  const sorted = Array.from(wordCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);

  const maxCount = sorted.length > 0 ? sorted[0][1] : 1;

  const cloudWords: WordCloudItem[] = sorted.map(([word, count]) => ({
    word,
    count,
    weight: count / maxCount,
  }));

  return {
    bookName: volumeName,
    volumeAbbrev,
    chapterLabel: "Entire Volume",
    totalWords,
    words: cloudWords,
  };
}

// ── Chapter Stats (for ChapterInsights in reader) ──

export interface ChapterStats {
  wordCount: number;
  verseCount: number;
  uniqueWords: number;
  avgVerseLength: number;
  topWords: { word: string; count: number; weight: number }[];
  keyThemes: { word: string; score: number }[];
  verseDensity: { verse: number; wordCount: number }[];
}

// Tokenize text into cleaned words (shared helper)
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z'-]/g, " ")
    .split(/\s+/)
    .map((w) => w.replace(/^['-]+|['-]+$/g, ""))
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w));
}

export async function getChapterStats(
  bookId: number,
  chapter: number
): Promise<ChapterStats> {
  const db = await getDb();

  // Get all verses for this chapter
  const chapterVerses = execToObjects<{ verse: number; text: string }>(
    db,
    `SELECT verse, text FROM verses WHERE book_id = ? AND chapter = ? ORDER BY verse`,
    [bookId, chapter]
  );

  if (chapterVerses.length === 0) {
    return {
      wordCount: 0, verseCount: 0, uniqueWords: 0, avgVerseLength: 0,
      topWords: [], keyThemes: [], verseDensity: [],
    };
  }

  // Tokenize chapter
  const chapterWordCounts = new Map<string, number>();
  let totalWords = 0;
  const verseDensity: { verse: number; wordCount: number }[] = [];

  for (const v of chapterVerses) {
    const words = tokenize(v.text);
    verseDensity.push({ verse: v.verse, wordCount: words.length });
    totalWords += words.length;
    for (const w of words) {
      chapterWordCounts.set(w, (chapterWordCounts.get(w) || 0) + 1);
    }
  }

  const uniqueWords = chapterWordCounts.size;
  const avgVerseLength = Math.round(totalWords / chapterVerses.length);

  // Top 15 words
  const sortedWords = Array.from(chapterWordCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15);
  const maxCount = sortedWords.length > 0 ? sortedWords[0][1] : 1;
  const topWords = sortedWords.map(([word, count]) => ({
    word,
    count,
    weight: count / maxCount,
  }));

  // Key themes via simple TF-IDF
  // Get word frequencies for the entire book (for document frequency)
  const allBookVerses = execToObjects<{ chapter: number; text: string }>(
    db,
    `SELECT chapter, text FROM verses WHERE book_id = ?`,
    [bookId]
  );

  // Count how many chapters each word appears in (document frequency)
  const chapterSets = new Map<string, Set<number>>();
  for (const v of allBookVerses) {
    const words = new Set(tokenize(v.text));
    for (const w of words) {
      if (!chapterSets.has(w)) chapterSets.set(w, new Set());
      chapterSets.get(w)!.add(v.chapter);
    }
  }

  const totalChapters = new Set(allBookVerses.map((v) => v.chapter)).size;

  // TF-IDF: (term freq in chapter) * log(total chapters / chapters containing term)
  const tfidf: [string, number][] = [];
  for (const [word, count] of chapterWordCounts.entries()) {
    const df = chapterSets.get(word)?.size || 1;
    const tf = count / totalWords;
    const idf = Math.log(totalChapters / df);
    tfidf.push([word, tf * idf]);
  }

  tfidf.sort((a, b) => b[1] - a[1]);
  const keyThemes = tfidf.slice(0, 5).map(([word, score]) => ({ word, score }));

  return {
    wordCount: totalWords,
    verseCount: chapterVerses.length,
    uniqueWords,
    avgVerseLength,
    topWords,
    keyThemes,
    verseDensity,
  };
}

export interface CharacterMention {
  bookId: number;
  bookName: string;
  volumeAbbrev: string;
  chapter: number;
  verse: number;
  text: string;
}

export interface CharacterMentionStats {
  totalMentions: number;
  byVolume: Record<string, number>;
  byBook: { bookId: number; bookName: string; volumeAbbrev: string; count: number }[];
  firstMention: CharacterMention | null;
  lastMention: CharacterMention | null;
}

export async function getCharacterMentions(
  name: string,
  aliases: string[],
  books?: string[]
): Promise<CharacterMentionStats> {
  const db = await getDb();

  // Build search terms — name + aliases, case-insensitive whole-word
  const searchTerms = [name, ...aliases].filter(Boolean);
  // Build regex pattern: \b(term1|term2|...)\b
  const escaped = searchTerms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const pattern = new RegExp(`\\b(${escaped.join("|")})\\b`, "i");

  // Build SQL query — scope to specific books if provided for accuracy
  let sql = `SELECT v.book_id, b.name as book_name, vol.abbrev,
            v.chapter, v.verse, v.text,
            vol.display_order as vol_order, b.display_order as book_order
     FROM verses v
     JOIN books b ON v.book_id = b.id
     JOIN volumes vol ON b.volume_id = vol.id`;

  if (books && books.length > 0) {
    const placeholders = books.map(() => "?").join(", ");
    sql += ` WHERE b.name IN (${placeholders})`;
  }

  sql += ` ORDER BY vol.display_order, b.display_order, v.chapter, v.verse`;

  // Fetch verses (scoped to character's books if available)
  const allVerses = execToObjects<{
    book_id: number;
    book_name: string;
    abbrev: string;
    chapter: number;
    verse: number;
    text: string;
    vol_order: number;
    book_order: number;
  }>(db, sql, books && books.length > 0 ? books : undefined);

  // Filter matching verses
  const matches: (typeof allVerses[0])[] = [];
  for (const v of allVerses) {
    if (pattern.test(v.text)) {
      matches.push(v);
    }
  }

  // Aggregate by volume
  const byVolume: Record<string, number> = {};
  // For D&C (single-book volume), aggregate by section instead of whole book
  const byBookMap = new Map<string, { bookId: number; bookName: string; volumeAbbrev: string; count: number }>();

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
      ? { bookId: first.book_id, bookName: displayName(first.book_name), volumeAbbrev: first.abbrev, chapter: first.chapter, verse: first.verse, text: first.text }
      : null,
    lastMention: last
      ? { bookId: last.book_id, bookName: displayName(last.book_name), volumeAbbrev: last.abbrev, chapter: last.chapter, verse: last.verse, text: last.text }
      : null,
  };
}

export async function getRandomVerse(): Promise<{
  verse: number;
  chapter: number;
  text: string;
  bookId: number;
  bookName: string;
  volumeAbbrev: string;
} | null> {
  const db = await getDb();
  const rows = execToObjects<{
    verse: number;
    chapter: number;
    text: string;
    book_id: number;
    book_name: string;
    abbrev: string;
  }>(
    db,
    `SELECT v.verse, v.chapter, v.text, v.book_id, b.name as book_name, vol.abbrev
     FROM verses v
     JOIN books b ON v.book_id = b.id
     JOIN volumes vol ON b.volume_id = vol.id
     ORDER BY RANDOM() LIMIT 1`
  );
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    verse: r.verse,
    chapter: r.chapter,
    text: r.text,
    bookId: r.book_id,
    bookName: displayName(r.book_name),
    volumeAbbrev: r.abbrev,
  };
}
