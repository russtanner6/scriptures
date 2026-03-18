import { NextRequest, NextResponse } from "next/server";
import { getMatchingVerses } from "@/lib/queries";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const word = params.get("word");
  const bookId = params.get("bookId");

  if (!word || !bookId) {
    return NextResponse.json(
      { error: "word and bookId parameters required" },
      { status: 400 }
    );
  }

  const caseInsensitive = params.get("caseInsensitive") !== "false";
  const wholeWord = params.get("wholeWord") !== "false";

  const result = await getMatchingVerses(word.trim(), Number(bookId), {
    caseInsensitive,
    wholeWord,
  });

  return NextResponse.json(result);
}
