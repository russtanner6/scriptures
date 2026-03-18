import { NextRequest, NextResponse } from "next/server";
import { getWordCloudData } from "@/lib/queries";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const bookId = searchParams.get("bookId");
  const chapter = searchParams.get("chapter");
  const limit = Number(searchParams.get("limit") || "80");

  if (!bookId) {
    return NextResponse.json({ error: "bookId is required" }, { status: 400 });
  }

  const data = await getWordCloudData(
    Number(bookId),
    chapter ? Number(chapter) : undefined,
    Math.min(limit, 200)
  );

  return NextResponse.json(data);
}
