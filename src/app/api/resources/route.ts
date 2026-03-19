import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import type { Resource } from "@/lib/types";

let cachedResources: Resource[] | null = null;

async function loadResources(): Promise<Resource[]> {
  if (cachedResources) return cachedResources;
  const filePath = path.join(process.cwd(), "data", "resources.json");
  const raw = await fs.readFile(filePath, "utf-8");
  cachedResources = JSON.parse(raw) as Resource[];
  return cachedResources;
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

  const resources = await loadResources();
  const filtered = resources.filter(
    (r) => r.book === book && r.chapter === Number(chapter)
  );

  return NextResponse.json({ resources: filtered });
}
