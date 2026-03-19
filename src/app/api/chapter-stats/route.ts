import { NextRequest, NextResponse } from "next/server";
import { getChapterStats } from "@/lib/queries";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const bookId = searchParams.get("bookId");
  const chapter = searchParams.get("chapter");

  if (!bookId || !chapter) {
    return NextResponse.json({ error: "bookId and chapter are required" }, { status: 400 });
  }

  const stats = await getChapterStats(Number(bookId), Number(chapter));
  return NextResponse.json(stats);
}
