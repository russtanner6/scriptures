import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

interface ChapterSummary {
  book: string;
  chapter: number;
  summary: string;
  volumeAbbrev: string;
  volumeName: string;
  bookId: number;
}

let cached: ChapterSummary[] | null = null;
function load(): ChapterSummary[] {
  if (cached) return cached;
  const filePath = join(process.cwd(), "data", "chapter-summaries.json");
  cached = JSON.parse(readFileSync(filePath, "utf-8"));
  return cached!;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const book = params.get("book");
  const chapter = params.get("chapter");
  const bookId = params.get("bookId");

  if (!chapter) {
    return NextResponse.json({ error: "chapter required" }, { status: 400 });
  }

  const data = load();
  let result: ChapterSummary | undefined;

  if (bookId) {
    result = data.find((d) => d.bookId === Number(bookId) && d.chapter === Number(chapter));
  } else if (book) {
    result = data.find((d) => d.book === book && d.chapter === Number(chapter));
  }

  if (!result) {
    return NextResponse.json({ summary: null }, { headers: { "Cache-Control": "public, max-age=86400" } });
  }

  return NextResponse.json(result, { headers: { "Cache-Control": "public, max-age=86400" } });
}
