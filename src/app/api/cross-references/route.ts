import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

interface CrossReference {
  book: string;
  chapter: number;
  verse: number;
  crossReference: string;
  type: string;
  note: string;
  volumeAbbrev: string;
  volumeName: string;
  bookId: number;
}

let cached: CrossReference[] | null = null;
function load(): CrossReference[] {
  if (cached) return cached;
  const filePath = join(process.cwd(), "data", "cross-references.json");
  cached = JSON.parse(readFileSync(filePath, "utf-8"));
  return cached!;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const book = params.get("book");
  const chapter = params.get("chapter");
  const bookId = params.get("bookId");

  const data = load();
  let results: CrossReference[];

  if (bookId && chapter) {
    results = data.filter((d) => d.bookId === Number(bookId) && d.chapter === Number(chapter));
  } else if (book && chapter) {
    results = data.filter((d) => d.book === book && d.chapter === Number(chapter));
  } else if (bookId) {
    results = data.filter((d) => d.bookId === Number(bookId));
  } else {
    return NextResponse.json({ error: "bookId or book required" }, { status: 400 });
  }

  return NextResponse.json({ crossReferences: results }, { headers: { "Cache-Control": "public, max-age=86400" } });
}
