import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import type { ContextEgg } from "@/lib/types";

let cachedEggs: ContextEgg[] | null = null;

async function loadEggs(): Promise<ContextEgg[]> {
  if (cachedEggs) return cachedEggs;
  const filePath = path.join(process.cwd(), "data", "context-eggs.json");
  const raw = await fs.readFile(filePath, "utf-8");
  cachedEggs = JSON.parse(raw) as ContextEgg[];
  return cachedEggs;
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

  const eggs = await loadEggs();
  const filtered = eggs.filter(
    (e) => e.book === book && e.chapter === Number(chapter)
  );

  return NextResponse.json({ eggs: filtered });
}
