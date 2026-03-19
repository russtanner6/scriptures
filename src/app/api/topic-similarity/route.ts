import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

const STOP_WORDS = new Set([
  "the", "and", "of", "to", "in", "a", "that", "it", "is", "was", "for",
  "i", "he", "his", "with", "they", "be", "not", "them", "their", "shall",
  "him", "but", "all", "which", "had", "were", "upon", "my", "this", "have",
  "from", "or", "by", "as", "ye", "me", "do", "did", "are", "we", "she",
  "her", "an", "who", "so", "if", "will", "no", "on", "thee", "thy", "thou",
  "at", "out", "up", "said", "when", "what", "into", "am", "us", "our",
  "also", "came", "then", "now", "even", "things", "every", "these", "those",
  "may", "might", "has", "hath", "being", "been", "would", "should", "could",
  "more", "there", "one", "two", "three", "after", "before", "over", "about",
  "against", "through", "come", "went", "go", "let", "make", "made",
  "take", "taken", "give", "gave", "say", "saying", "saith",
]);

function tokenize(text: string): Map<string, number> {
  const counts = new Map<string, number>();
  const words = text.toLowerCase().replace(/[^a-z'-]/g, " ").split(/\s+/);
  for (const w of words) {
    const clean = w.replace(/^['-]+|['-]+$/g, "");
    if (clean.length >= 3 && !STOP_WORDS.has(clean)) {
      counts.set(clean, (counts.get(clean) || 0) + 1);
    }
  }
  return counts;
}

function cosineSimilarity(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (const [word, count] of a) {
    normA += count * count;
    const bCount = b.get(word);
    if (bCount) dot += count * bCount;
  }
  for (const [, count] of b) {
    normB += count * count;
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const bookId = params.get("bookId");
  const chapter = params.get("chapter");

  if (!bookId || !chapter) {
    return NextResponse.json(
      { error: "bookId and chapter parameters required" },
      { status: 400 }
    );
  }

  const db = await getDb();

  // Get the seed chapter text
  const seedStmt = db.prepare(
    `SELECT text FROM verses WHERE book_id = ? AND chapter = ? ORDER BY verse`
  );
  seedStmt.bind([Number(bookId), Number(chapter)]);
  let seedText = "";
  while (seedStmt.step()) {
    seedText += " " + (seedStmt.getAsObject() as { text: string }).text;
  }
  seedStmt.free();

  if (!seedText.trim()) {
    return NextResponse.json({ similar: [] });
  }

  const seedVector = tokenize(seedText);

  // Get seed book info for display
  const seedBookStmt = db.prepare(
    `SELECT b.name as bookName, v.abbrev as volumeAbbrev
     FROM books b JOIN volumes v ON v.id = b.volume_id WHERE b.id = ?`
  );
  seedBookStmt.bind([Number(bookId)]);
  let seedBookName = "";
  if (seedBookStmt.step()) {
    const row = seedBookStmt.getAsObject() as { bookName: string };
    seedBookName = row.bookName === "Doctrine and Covenants" ? "D&C" : row.bookName;
  }
  seedBookStmt.free();

  // Get all chapters across all volumes
  const allStmt = db.prepare(
    `SELECT v.book_id, v.chapter, v.text, b.name as bookName, vol.abbrev as volumeAbbrev
     FROM verses v
     JOIN books b ON b.id = v.book_id
     JOIN volumes vol ON vol.id = b.volume_id
     ORDER BY v.book_id, v.chapter, v.verse`
  );

  // Aggregate text by chapter
  const chapterTexts = new Map<string, { bookId: number; bookName: string; chapter: number; volumeAbbrev: string; text: string }>();
  while (allStmt.step()) {
    const row = allStmt.getAsObject() as {
      book_id: number; chapter: number; text: string; bookName: string; volumeAbbrev: string;
    };
    const key = `${row.book_id}-${row.chapter}`;
    const existing = chapterTexts.get(key);
    if (existing) {
      existing.text += " " + row.text;
    } else {
      chapterTexts.set(key, {
        bookId: row.book_id,
        bookName: row.bookName === "Doctrine and Covenants" ? "D&C" : row.bookName,
        chapter: row.chapter,
        volumeAbbrev: row.volumeAbbrev,
        text: row.text,
      });
    }
  }
  allStmt.free();

  // Compute similarity to seed
  const results: {
    bookId: number;
    bookName: string;
    chapter: number;
    volumeAbbrev: string;
    similarity: number;
    sharedTerms: string[];
  }[] = [];

  for (const [key, chData] of chapterTexts) {
    // Skip the seed chapter itself
    if (chData.bookId === Number(bookId) && chData.chapter === Number(chapter)) continue;

    const chVector = tokenize(chData.text);
    const sim = cosineSimilarity(seedVector, chVector);

    if (sim > 0.15) {
      // Find top shared terms
      const shared: { word: string; combined: number }[] = [];
      for (const [word, count] of seedVector) {
        const bCount = chVector.get(word);
        if (bCount) {
          shared.push({ word, combined: count + bCount });
        }
      }
      shared.sort((a, b) => b.combined - a.combined);

      results.push({
        bookId: chData.bookId,
        bookName: chData.bookName,
        chapter: chData.chapter,
        volumeAbbrev: chData.volumeAbbrev,
        similarity: Math.round(sim * 1000) / 1000,
        sharedTerms: shared.slice(0, 5).map((s) => s.word),
      });
    }
  }

  // Sort by similarity, return top 15
  results.sort((a, b) => b.similarity - a.similarity);

  return NextResponse.json({
    seed: { bookId: Number(bookId), bookName: seedBookName, chapter: Number(chapter) },
    similar: results.slice(0, 15),
  });
}
