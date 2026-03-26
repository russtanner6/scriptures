import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";
import { getDb } from "@/lib/db";
import { scoreText, smoothScores } from "@/lib/sentiment-lexicon";

// Load LLM-scored chapter sentiment data
interface SentimentEntry {
  volumeAbbrev: string;
  volumeName: string;
  bookName?: string;
  bookId: number;
  chapter: number;
  exaltation: number;
  peace: number;
  admonition: number;
  contrition: number;
  dominant: string;
  rationale: string;
}

let sentimentData: SentimentEntry[] = [];
try {
  const filePath = join(process.cwd(), "data", "chapter-sentiments.json");
  sentimentData = JSON.parse(readFileSync(filePath, "utf-8"));
} catch {
  console.warn("chapter-sentiments.json not found, using lexicon fallback only");
}

// Build lookup maps
const jsonByChapter = new Map<string, SentimentEntry>();
sentimentData.forEach((entry) => {
  const key = `${entry.bookId}:${entry.chapter}`;
  jsonByChapter.set(key, entry);
});

// Group by volume and book for aggregation
const jsonByVolume = new Map<string, SentimentEntry[]>();
const jsonByBook = new Map<number, SentimentEntry[]>();
sentimentData.forEach((entry) => {
  const va = entry.volumeAbbrev;
  if (!jsonByVolume.has(va)) jsonByVolume.set(va, []);
  jsonByVolume.get(va)!.push(entry);

  const bid = entry.bookId;
  if (!jsonByBook.has(bid)) jsonByBook.set(bid, []);
  jsonByBook.get(bid)!.push(entry);
});

function averageScores(entries: SentimentEntry[]) {
  if (entries.length === 0) return null;
  const sum = { exaltation: 0, peace: 0, admonition: 0, contrition: 0 };
  entries.forEach((e) => {
    sum.exaltation += e.exaltation;
    sum.peace += e.peace;
    sum.admonition += e.admonition;
    sum.contrition += e.contrition;
  });
  const n = entries.length;
  return {
    exaltation: Math.round((sum.exaltation / n) * 100) / 100,
    peace: Math.round((sum.peace / n) * 100) / 100,
    admonition: Math.round((sum.admonition / n) * 100) / 100,
    contrition: Math.round((sum.contrition / n) * 100) / 100,
  };
}

function compositeFromScores(scores: Record<string, number>): number {
  // Net positive/negative: (exaltation + peace) - (admonition + contrition)
  return Math.round(((scores.exaltation + scores.peace) - (scores.admonition + scores.contrition)) * 100) / 100;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const level = params.get("level") || "chapters";
  const volumeId = params.get("volumeId");
  const bookId = params.get("bookId");
  const chapter = params.get("chapter");

  const db = await getDb();

  // ── VOLUME LEVEL: average sentiment per volume (from LLM JSON) ──
  if (level === "volumes") {
    const volStmt = db.prepare(
      `SELECT v.id, v.name, v.abbrev, v.display_order,
              (SELECT COUNT(*) FROM verses vs JOIN books b ON vs.book_id = b.id WHERE b.volume_id = v.id) as verse_count
       FROM volumes v ORDER BY v.display_order`
    );
    const volumes: { id: number; name: string; abbrev: string; display_order: number; verse_count: number }[] = [];
    while (volStmt.step()) volumes.push(volStmt.getAsObject() as typeof volumes[0]);
    volStmt.free();

    const result = volumes.map((vol) => {
      const entries = jsonByVolume.get(vol.abbrev) || [];
      const scores = averageScores(entries);
      return {
        volumeId: vol.id,
        volumeName: vol.name === "Doctrine and Covenants" ? "D&C" : vol.name,
        volumeAbbrev: vol.abbrev,
        scores: scores || { exaltation: 0, peace: 0, admonition: 0, contrition: 0 },
        compositeScore: scores ? compositeFromScores(scores) : 0,
        wordCount: 0,
        verseCount: vol.verse_count,
        source: entries.length > 0 ? "llm" : "none",
      };
    });

    return NextResponse.json({ volumes: result }, {
      headers: { "Cache-Control": "public, max-age=86400" },
    });
  }

  // ── BOOK LEVEL: average sentiment per book (from LLM JSON) ──
  if (level === "books") {
    if (!volumeId) return NextResponse.json({ error: "volumeId required for book level" }, { status: 400 });

    const bookStmt = db.prepare(
      `SELECT b.id, b.name, b.display_order, b.chapter_count,
              (SELECT COUNT(*) FROM verses v WHERE v.book_id = b.id) as verse_count
       FROM books b WHERE b.volume_id = ? ORDER BY b.display_order`
    );
    bookStmt.bind([Number(volumeId)]);
    const books: { id: number; name: string; display_order: number; chapter_count: number; verse_count: number }[] = [];
    while (bookStmt.step()) books.push(bookStmt.getAsObject() as typeof books[0]);
    bookStmt.free();

    const result = books.map((book) => {
      const entries = jsonByBook.get(book.id) || [];
      const scores = averageScores(entries);
      return {
        bookId: book.id,
        bookName: book.name === "Doctrine and Covenants" ? "D&C" : book.name,
        scores: scores || { exaltation: 0, peace: 0, admonition: 0, contrition: 0 },
        compositeScore: scores ? compositeFromScores(scores) : 0,
        wordCount: 0,
        verseCount: book.verse_count,
        chapterCount: book.chapter_count,
        source: entries.length > 0 ? "llm" : "none",
      };
    });

    return NextResponse.json({ books: result }, {
      headers: { "Cache-Control": "public, max-age=86400" },
    });
  }

  // ── CHAPTER LEVEL: sentiment per chapter (from LLM JSON, lexicon fallback) ──
  if (level === "chapters") {
    if (!volumeId && !bookId) return NextResponse.json({ error: "volumeId or bookId required" }, { status: 400 });

    let bookFilter = "";
    let bindVal: number;
    if (bookId) {
      bookFilter = "v.book_id = ?";
      bindVal = Number(bookId);
    } else {
      bookFilter = "b.volume_id = ?";
      bindVal = Number(volumeId);
    }

    const chStmt = db.prepare(
      `SELECT v.book_id, b.name as book_name, v.chapter,
              GROUP_CONCAT(v.text, ' ') as all_text, COUNT(*) as verse_count
       FROM verses v JOIN books b ON v.book_id = b.id
       WHERE ${bookFilter}
       GROUP BY v.book_id, v.chapter
       ORDER BY b.display_order, v.chapter`
    );
    chStmt.bind([bindVal]);
    const chapters: { book_id: number; book_name: string; chapter: number; all_text: string; verse_count: number }[] = [];
    while (chStmt.step()) chapters.push(chStmt.getAsObject() as typeof chapters[0]);
    chStmt.free();

    const result = chapters.map((ch) => {
      const key = `${ch.book_id}:${ch.chapter}`;
      const jsonEntry = jsonByChapter.get(key);

      if (jsonEntry) {
        // Use LLM-scored data
        const scores = {
          exaltation: jsonEntry.exaltation,
          peace: jsonEntry.peace,
          admonition: jsonEntry.admonition,
          contrition: jsonEntry.contrition,
        };
        return {
          bookId: ch.book_id,
          bookName: ch.book_name === "Doctrine and Covenants" ? "D&C" : ch.book_name,
          chapter: ch.chapter,
          scores,
          compositeScore: compositeFromScores(scores),
          wordCount: 0,
          lowConfidence: false,
          verseCount: ch.verse_count,
          dominant: jsonEntry.dominant,
          rationale: jsonEntry.rationale,
          source: "llm",
        };
      }

      // Fallback to keyword lexicon
      const scored = scoreText(ch.all_text);
      return {
        bookId: ch.book_id,
        bookName: ch.book_name === "Doctrine and Covenants" ? "D&C" : ch.book_name,
        chapter: ch.chapter,
        scores: scored.scores,
        compositeScore: scored.compositeScore,
        wordCount: scored.wordCount,
        lowConfidence: scored.lowConfidence,
        verseCount: ch.verse_count,
        source: "lexicon",
      };
    });

    return NextResponse.json({ chapters: result }, {
      headers: { "Cache-Control": "public, max-age=86400" },
    });
  }

  // ── VERSE LEVEL: sentiment per verse (always lexicon — no verse-level JSON) ──
  if (level === "verses") {
    if (!bookId || !chapter) return NextResponse.json({ error: "bookId and chapter required for verse level" }, { status: 400 });

    const vStmt = db.prepare(
      `SELECT verse, text FROM verses WHERE book_id = ? AND chapter = ? ORDER BY verse`
    );
    vStmt.bind([Number(bookId), Number(chapter)]);
    const verses: { verse: number; text: string }[] = [];
    while (vStmt.step()) verses.push(vStmt.getAsObject() as typeof verses[0]);
    vStmt.free();

    const rawScores = verses.map((v) => {
      const scored = scoreText(v.text);
      return {
        verse: v.verse,
        scores: scored.scores,
        compositeScore: scored.compositeScore,
        text: v.text.slice(0, 150),
      };
    });

    // Apply 5-verse SMA smoothing to composite scores
    const composites = rawScores.map((r) => r.compositeScore);
    const smoothed = smoothScores(composites);

    const result = rawScores.map((r, i) => ({
      ...r,
      smoothedScore: Math.round(smoothed[i] * 10) / 10,
    }));

    return NextResponse.json({ verses: result }, {
      headers: { "Cache-Control": "public, max-age=86400" },
    });
  }

  return NextResponse.json({ error: "Invalid level parameter" }, { status: 400 });
}
