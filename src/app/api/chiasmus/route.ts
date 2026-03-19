import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { detectChiasms } from "@/lib/chiasmus-detector";

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

  // Get book name and volume info
  const bookStmt = db.prepare(
    `SELECT b.name as bookName, v.abbrev as volumeAbbrev
     FROM books b JOIN volumes v ON v.id = b.volume_id
     WHERE b.id = ?`
  );
  bookStmt.bind([Number(bookId)]);
  let bookName = "";
  let volumeAbbrev = "";
  if (bookStmt.step()) {
    const row = bookStmt.getAsObject() as { bookName: string; volumeAbbrev: string };
    bookName = row.bookName === "Doctrine and Covenants" ? "D&C" : row.bookName;
    volumeAbbrev = row.volumeAbbrev;
  }
  bookStmt.free();

  // Get all verses for this chapter
  const verseStmt = db.prepare(
    `SELECT verse, text FROM verses WHERE book_id = ? AND chapter = ? ORDER BY verse`
  );
  verseStmt.bind([Number(bookId), Number(chapter)]);
  const verses: { verse: number; text: string }[] = [];
  while (verseStmt.step()) {
    verses.push(verseStmt.getAsObject() as { verse: number; text: string });
  }
  verseStmt.free();

  const patterns = detectChiasms(verses);

  return NextResponse.json({
    bookId: Number(bookId),
    bookName,
    volumeAbbrev,
    chapter: Number(chapter),
    verseCount: verses.length,
    patterns,
  });
}
