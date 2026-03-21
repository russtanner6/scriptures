import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { scoreText, SENTIMENT_CATEGORIES } from "@/lib/sentiment-lexicon";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const name = params.get("name");
  const aliasesParam = params.get("aliases");

  if (!name) {
    return NextResponse.json({ error: "name parameter required" }, { status: 400 });
  }

  const aliases = aliasesParam ? aliasesParam.split(",").filter(Boolean) : [];
  const searchTerms = [name, ...aliases].filter(Boolean);
  const escaped = searchTerms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const pattern = new RegExp(`\\b(${escaped.join("|")})\\b`, "i");

  const db = await getDb();

  // Fetch all verses (same query as character-mentions)
  const stmt = db.prepare(
    `SELECT v.text
     FROM verses v
     JOIN books b ON v.book_id = b.id
     JOIN volumes vol ON b.volume_id = vol.id`
  );

  // Aggregate scores across all mention verses
  const totals: Record<string, number> = {};
  for (const cat of SENTIMENT_CATEGORIES) {
    totals[cat.id] = 0;
  }
  let mentionCount = 0;
  let totalWords = 0;

  while (stmt.step()) {
    const row = stmt.getAsObject() as { text: string };
    if (pattern.test(row.text)) {
      mentionCount++;
      const result = scoreText(row.text);
      totalWords += result.wordCount;
      // Accumulate raw normalized scores (per 1k words for each verse)
      for (const cat of SENTIMENT_CATEGORIES) {
        totals[cat.id] += result.scores[cat.id];
      }
    }
  }
  stmt.free();

  // Average the per-verse normalized scores
  const scores: Record<string, number> = {};
  for (const cat of SENTIMENT_CATEGORIES) {
    scores[cat.id] = mentionCount > 0
      ? Math.round((totals[cat.id] / mentionCount) * 10) / 10
      : 0;
  }

  return NextResponse.json(
    { scores, mentionCount, totalWords },
    { headers: { "Cache-Control": "public, max-age=86400" } }
  );
}
