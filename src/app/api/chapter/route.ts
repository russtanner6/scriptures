import { NextRequest, NextResponse } from "next/server";
import { getChapterVerses, getBookIdBySlug } from "@/lib/queries";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  // Support two modes:
  // 1. By bookId + chapter (numeric)
  // 2. By volume + book slug + chapter (URL-friendly)
  const bookId = params.get("bookId");
  const chapter = params.get("chapter");
  const volume = params.get("volume");
  const book = params.get("book");

  if (bookId && chapter) {
    const result = await getChapterVerses(Number(bookId), Number(chapter));
    return NextResponse.json(result);
  }

  if (volume && book && chapter) {
    const bookInfo = await getBookIdBySlug(volume, book);
    if (!bookInfo) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }
    const result = await getChapterVerses(bookInfo.bookId, Number(chapter));
    return NextResponse.json(result);
  }

  return NextResponse.json(
    { error: "Provide bookId+chapter or volume+book+chapter" },
    { status: 400 }
  );
}
