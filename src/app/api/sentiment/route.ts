import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { scoreText } from "@/lib/sentiment-lexicon";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const volumeId = params.get("volumeId");

  if (!volumeId) {
    return NextResponse.json({ error: "volumeId parameter required" }, { status: 400 });
  }

  const db = await getDb();

  // Get all books in this volume
  const bookStmt = db.prepare(
    `SELECT b.id, b.name, b.chapter_count
     FROM books b WHERE b.volume_id = ? ORDER BY b.display_order`
  );
  bookStmt.bind([Number(volumeId)]);
  const books: { id: number; name: string; chapter_count: number }[] = [];
  while (bookStmt.step()) {
    books.push(bookStmt.getAsObject() as { id: number; name: string; chapter_count: number });
  }
  bookStmt.free();

  // For each book/chapter, get all verses and score them
  const chapters: {
    bookId: number;
    bookName: string;
    chapter: number;
    scores: Record<string, number>;
    verseCount: number;
  }[] = [];

  for (const book of books) {
    for (let ch = 1; ch <= book.chapter_count; ch++) {
      const verseStmt = db.prepare(
        `SELECT text FROM verses WHERE book_id = ? AND chapter = ?`
      );
      verseStmt.bind([book.id, ch]);
      let allText = "";
      let verseCount = 0;
      while (verseStmt.step()) {
        const row = verseStmt.getAsObject() as { text: string };
        allText += " " + row.text;
        verseCount++;
      }
      verseStmt.free();

      if (verseCount > 0) {
        const scores = scoreText(allText);
        chapters.push({
          bookId: book.id,
          bookName: book.name === "Doctrine and Covenants" ? "D&C" : book.name,
          chapter: ch,
          scores,
          verseCount,
        });
      }
    }
  }

  return NextResponse.json({ chapters });
}
