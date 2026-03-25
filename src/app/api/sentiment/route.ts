import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { scoreText, smoothScores } from "@/lib/sentiment-lexicon";

function execToObjects<T>(db: ReturnType<Awaited<ReturnType<typeof getDb>>["prepare"]> extends infer S ? S extends { getAsObject: () => infer R } ? never : never : never, stmt: ReturnType<Awaited<ReturnType<typeof getDb>>["prepare"]>): T[] {
  const results: T[] = [];
  while (stmt.step()) results.push(stmt.getAsObject() as T);
  stmt.free();
  return results;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const level = params.get("level") || "chapters"; // volumes | books | chapters | verses
  const volumeId = params.get("volumeId");
  const bookId = params.get("bookId");
  const chapter = params.get("chapter");

  const db = await getDb();

  // ── VOLUME LEVEL: average sentiment per volume ──
  if (level === "volumes") {
    const volStmt = db.prepare(
      `SELECT v.id, v.name, v.abbrev, v.display_order
       FROM volumes v ORDER BY v.display_order`
    );
    const volumes: { id: number; name: string; abbrev: string; display_order: number }[] = [];
    while (volStmt.step()) volumes.push(volStmt.getAsObject() as typeof volumes[0]);
    volStmt.free();

    const result = [];
    for (const vol of volumes) {
      const textStmt = db.prepare(
        `SELECT GROUP_CONCAT(v.text, ' ') as all_text, COUNT(*) as verse_count
         FROM verses v JOIN books b ON v.book_id = b.id WHERE b.volume_id = ?`
      );
      textStmt.bind([vol.id]);
      textStmt.step();
      const row = textStmt.getAsObject() as { all_text: string; verse_count: number };
      textStmt.free();

      if (row.all_text) {
        const scored = scoreText(row.all_text);
        result.push({
          volumeId: vol.id,
          volumeName: vol.name === "Doctrine and Covenants" ? "D&C" : vol.name,
          volumeAbbrev: vol.abbrev,
          scores: scored.scores,
          compositeScore: scored.compositeScore,
          wordCount: scored.wordCount,
          verseCount: row.verse_count,
        });
      }
    }

    return NextResponse.json({ volumes: result }, {
      headers: { "Cache-Control": "public, max-age=86400" },
    });
  }

  // ── BOOK LEVEL: average sentiment per book in a volume ──
  if (level === "books") {
    if (!volumeId) return NextResponse.json({ error: "volumeId required for book level" }, { status: 400 });

    const bookStmt = db.prepare(
      `SELECT b.id, b.name, b.display_order, b.chapter_count
       FROM books b WHERE b.volume_id = ? ORDER BY b.display_order`
    );
    bookStmt.bind([Number(volumeId)]);
    const books: { id: number; name: string; display_order: number; chapter_count: number }[] = [];
    while (bookStmt.step()) books.push(bookStmt.getAsObject() as typeof books[0]);
    bookStmt.free();

    const result = [];
    for (const book of books) {
      const textStmt = db.prepare(
        `SELECT GROUP_CONCAT(text, ' ') as all_text, COUNT(*) as verse_count FROM verses WHERE book_id = ?`
      );
      textStmt.bind([book.id]);
      textStmt.step();
      const row = textStmt.getAsObject() as { all_text: string; verse_count: number };
      textStmt.free();

      if (row.all_text) {
        const scored = scoreText(row.all_text);
        result.push({
          bookId: book.id,
          bookName: book.name === "Doctrine and Covenants" ? "D&C" : book.name,
          scores: scored.scores,
          compositeScore: scored.compositeScore,
          wordCount: scored.wordCount,
          verseCount: row.verse_count,
          chapterCount: book.chapter_count,
        });
      }
    }

    return NextResponse.json({ books: result }, {
      headers: { "Cache-Control": "public, max-age=86400" },
    });
  }

  // ── CHAPTER LEVEL: sentiment per chapter in a book (or volume) ──
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
      };
    });

    return NextResponse.json({ chapters: result }, {
      headers: { "Cache-Control": "public, max-age=86400" },
    });
  }

  // ── VERSE LEVEL: sentiment per verse in a chapter (smoothed) ──
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
