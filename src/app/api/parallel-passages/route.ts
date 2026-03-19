import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import passagesData from "../../../../data/parallel-passages.json";

interface PassagePair {
  sourceBook: string;
  sourceChapter: number;
  targetBook: string;
  targetChapter: number;
}

interface PassageGroup {
  id: string;
  label: string;
  description: string;
  pairs: PassagePair[];
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const id = params.get("id");

  const passages = passagesData as PassageGroup[];

  // If no id, return the list of all passage groups (without verse data)
  if (!id) {
    return NextResponse.json({
      groups: passages.map((g) => ({
        id: g.id,
        label: g.label,
        description: g.description,
        pairCount: g.pairs.length,
      })),
    });
  }

  // Find the specific group
  const group = passages.find((g) => g.id === id);
  if (!group) {
    return NextResponse.json({ error: "Passage group not found" }, { status: 404 });
  }

  const db = await getDb();

  // For each pair, fetch verse texts
  const pairsWithVerses = [];
  for (const pair of group.pairs) {
    // Get source book id
    const srcStmt = db.prepare(`SELECT id FROM books WHERE name = ?`);
    srcStmt.bind([pair.sourceBook]);
    let srcBookId: number | null = null;
    if (srcStmt.step()) {
      srcBookId = (srcStmt.getAsObject() as { id: number }).id;
    }
    srcStmt.free();

    // Get target book id
    const tgtStmt = db.prepare(`SELECT id FROM books WHERE name = ?`);
    tgtStmt.bind([pair.targetBook]);
    let tgtBookId: number | null = null;
    if (tgtStmt.step()) {
      tgtBookId = (tgtStmt.getAsObject() as { id: number }).id;
    }
    tgtStmt.free();

    if (!srcBookId || !tgtBookId) continue;

    // Fetch verses
    const fetchVerses = (bookId: number, chapter: number) => {
      const stmt = db.prepare(
        `SELECT verse, text FROM verses WHERE book_id = ? AND chapter = ? ORDER BY verse`
      );
      stmt.bind([bookId, chapter]);
      const verses: { verse: number; text: string }[] = [];
      while (stmt.step()) {
        verses.push(stmt.getAsObject() as { verse: number; text: string });
      }
      stmt.free();
      return verses;
    };

    pairsWithVerses.push({
      sourceBook: pair.sourceBook,
      sourceChapter: pair.sourceChapter,
      sourceBookId: srcBookId,
      sourceVerses: fetchVerses(srcBookId, pair.sourceChapter),
      targetBook: pair.targetBook,
      targetChapter: pair.targetChapter,
      targetBookId: tgtBookId,
      targetVerses: fetchVerses(tgtBookId, pair.targetChapter),
    });
  }

  return NextResponse.json({
    id: group.id,
    label: group.label,
    description: group.description,
    pairs: pairsWithVerses,
  });
}
