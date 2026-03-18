import { NextRequest, NextResponse } from "next/server";
import { getHeatmapData } from "@/lib/queries";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const word = params.get("word");

  if (!word || word.trim().length === 0) {
    return NextResponse.json({ error: "word parameter required" }, { status: 400 });
  }

  const caseInsensitive = params.get("caseInsensitive") !== "false";
  const wholeWord = params.get("wholeWord") !== "false";

  const volumeIdsStr = params.get("volumeIds");
  const volumeIds = volumeIdsStr
    ? volumeIdsStr.split(",").map(Number).filter(Boolean)
    : undefined;

  const results = await getHeatmapData(word.trim(), {
    caseInsensitive,
    wholeWord,
    volumeIds,
  });

  return NextResponse.json({ word: word.trim(), results });
}
