import { NextRequest, NextResponse } from "next/server";
import { getWordFrequency } from "@/lib/queries";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const word = params.get("word");

  if (!word || word.trim().length === 0) {
    return NextResponse.json({ error: "word parameter required" }, { status: 400 });
  }

  const caseInsensitive = params.get("caseInsensitive") !== "false";
  const wholeWord = params.get("wholeWord") !== "false";

  const volumeIdsStr = params.get("volumeIds");
  const bookIdsStr = params.get("bookIds");

  const volumeIds = volumeIdsStr
    ? volumeIdsStr.split(",").map(Number).filter(Boolean)
    : undefined;
  const bookIds = bookIdsStr
    ? bookIdsStr.split(",").map(Number).filter(Boolean)
    : undefined;

  const { totalCount, totalVerses, results } = await getWordFrequency(word.trim(), {
    caseInsensitive,
    wholeWord,
    volumeIds,
    bookIds,
  });

  return NextResponse.json({
    word: word.trim(),
    caseInsensitive,
    wholeWord,
    totalCount,
    totalVerses,
    results,
  });
}
