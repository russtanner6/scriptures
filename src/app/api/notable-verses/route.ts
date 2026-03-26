import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

interface NotableVerse {
  verse: number;
  reason: string;
}

interface NotableVersesEntry {
  book: string;
  chapter: number;
  verses: NotableVerse[];
  volumeAbbrev: string;
  volumeName: string;
  bookId: number;
}

let cached: NotableVersesEntry[] | null = null;
function load(): NotableVersesEntry[] {
  if (cached) return cached;
  const filePath = join(process.cwd(), "data", "notable-verses.json");
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
  let result: NotableVersesEntry | undefined;

  if (bookId) {
    result = data.find((d) => d.bookId === Number(bookId) && d.chapter === Number(chapter));
  } else if (book) {
    result = data.find((d) => d.book === book && d.chapter === Number(chapter));
  }

  if (!result) {
    return NextResponse.json({ verses: [] }, { headers: { "Cache-Control": "public, max-age=86400" } });
  }

  return NextResponse.json(result, { headers: { "Cache-Control": "public, max-age=86400" } });
}
