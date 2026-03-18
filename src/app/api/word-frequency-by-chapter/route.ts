import { NextRequest, NextResponse } from "next/server";
import { getWordFrequencyByChapter } from "@/lib/queries";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const word = params.get("word");
  const bookId = params.get("bookId");
  const chapterCount = params.get("chapterCount");

  if (!word || !bookId || !chapterCount) {
    return NextResponse.json(
      { error: "word, bookId, and chapterCount parameters required" },
      { status: 400 }
    );
  }

  const caseInsensitive = params.get("caseInsensitive") !== "false";
  const wholeWord = params.get("wholeWord") !== "false";

  const results = await getWordFrequencyByChapter(
    word.trim(),
    Number(bookId),
    Number(chapterCount),
    { caseInsensitive, wholeWord }
  );

  return NextResponse.json({ word: word.trim(), bookId: Number(bookId), results });
}
