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
        name: row.volume_name,
        abbrev: row.abbrev,
        displayOrder: row.vol_order,
        books: [],
      });
    }
    volumeMap.get(row.volume_id)!.books.push({
      id: row.book_id,
      name: row.book_name,
      volumeId: row.volume_id,
      volumeName: row.volume_name,
      volumeAbbrev: row.abbrev,
      displayOrder: row.display_order,
      chapterCount: row.chapter_count,
    });
  }
  return Array.from(volumeMap.values()).sort(
    (a, b) => a.displayOrder - b.displayOrder
  );
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
        bookName: book.name,
        volumeName: book.volume_name,
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
    bookName: r.book_name,
    volumeName: r.volume_name,
    volumeAbbrev: r.volume_abbrev,
    displayOrder: r.display_order,
    wordCount: r.word_count,
    verseCount: r.verse_count,
    chapterCount: r.chapter_count,
    avgVerseLength: r.avg_verse_length,
    avgWordLength: r.avg_word_length,
  }));
}

export interface VerseMatch {
  chapter: number;
  verse: number;
  text: string;
}

export async function getMatchingVerses(
  word: string,
  bookId: number,
  options: { caseInsensitive?: boolean; wholeWord?: boolean } = {}
): Promise<{ bookName: string; verses: VerseMatch[] }> {
  const db = await getDb();
  const { caseInsensitive = true, wholeWord = true } = options;

  // Get book name
  const bookRows = execToObjects<{ name: string }>(
    db,
    `SELECT name FROM books WHERE id = ?`,
    [bookId]
  );
  const bookName = bookRows[0]?.name || "Unknown";

  // Fetch all verses from this book
  const verses = execToObjects<{ chapter: number; verse: number; text: string }>(
    db,
    `SELECT chapter, verse, text FROM verses WHERE book_id = ? ORDER BY chapter, verse`,
    [bookId]
  );

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
  const flags = caseInsensitive ? "gi" : "g";
  const regex = new RegExp(pattern, flags);

  // Filter verses that match
  const matching = verses.filter((v) => regex.test(v.text));

  return { bookName, verses: matching };
}
