import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import type { ContextNugget } from "@/lib/types";

let cachedNuggets: ContextNugget[] | null = null;

async function loadNuggets(): Promise<ContextNugget[]> {
  if (cachedNuggets) return cachedNuggets;
  const filePath = path.join(process.cwd(), "data", "context-nuggets.json");
  const raw = await fs.readFile(filePath, "utf-8");
  cachedNuggets = JSON.parse(raw) as ContextNugget[];
  return cachedNuggets;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const book = params.get("book");
  const chapter = params.get("chapter");

  if (!book || !chapter) {
    return NextResponse.json(
      { error: "Provide book and chapter" },
      { status: 400 }
    );
  }

  const nuggets = await loadNuggets();
  const filtered = nuggets.filter(
    (e) => e.book === book && e.chapter === Number(chapter)
  );

  return NextResponse.json({ nuggets: filtered });
}
