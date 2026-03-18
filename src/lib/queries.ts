import { getDb } from "./db";
import type { Book, Volume, FrequencyResult, BookStat } from "./types";

export function getVolumesWithBooks(): Volume[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT v.id as volume_id, v.name as volume_name, v.abbrev, v.display_order as vol_order,
              b.id as book_id, b.name as book_name, b.display_order, b.chapter_count
       FROM volumes v
       JOIN books b ON b.volume_id = v.id
       ORDER BY v.display_order, b.display_order`
    )
    .all() as Array<{
    volume_id: number;
    volume_name: string;
    abbrev: string;
    vol_order: number;
    book_id: number;
    book_name: string;
    display_order: number;
    chapter_count: number;
  }>;

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

export function getWordFrequency(
  word: string,
  options: {
    caseInsensitive?: boolean;
    wholeWord?: boolean;
    volumeIds?: number[];
    bookIds?: number[];
  } = {}
): { totalCount: number; totalVerses: number; results: FrequencyResult[] } {
  const db = getDb();
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
  const verses = db
    .prepare(
      `SELECT vs.text, b.id as book_id
       FROM verses vs
       JOIN books b ON b.id = vs.book_id
       JOIN volumes v ON v.id = b.volume_id
       ${whereClause}`
    )
    .all(...params) as Array<{ text: string; book_id: number }>;

  // Build regex
  const escaped = escapeRegex(word);
  const pattern = wholeWord ? `\\b${escaped}\\b` : escaped;
  const flags = caseInsensitive ? "gi" : "g";
  const regex = new RegExp(pattern, flags);

  // Count matches per book
  const counts = new Map<number, { count: number; verseCount: number }>();
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
    }
  }

  // Get book metadata for books with results
  const bookIds_all = Array.from(counts.keys());
  if (bookIds_all.length === 0) {
    return { totalCount: 0, totalVerses: 0, results: [] };
  }

  const bookMeta = db
    .prepare(
      `SELECT b.id, b.name, b.display_order, v.name as volume_name, v.abbrev
       FROM books b
       JOIN volumes v ON v.id = b.volume_id
       WHERE b.id IN (${bookIds_all.map(() => "?").join(",")})
       ORDER BY b.display_order`
    )
    .all(...bookIds_all) as Array<{
    id: number;
    name: string;
    display_order: number;
    volume_name: string;
    abbrev: string;
  }>;

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

  return { totalCount, totalVerses, results };
}

export function getBookStats(): BookStat[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT b.id as book_id, b.name as book_name, b.display_order, b.chapter_count,
              v.name as volume_name, v.abbrev as volume_abbrev,
              bs.word_count, bs.verse_count, bs.avg_verse_length, bs.avg_word_length
       FROM books b
       JOIN volumes v ON v.id = b.volume_id
       JOIN book_stats bs ON bs.book_id = b.id
       ORDER BY b.display_order`
    )
    .all() as Array<{
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
  }>;

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
