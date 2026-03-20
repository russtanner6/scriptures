import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

let cachedCharacters: any[] | null = null;

export async function GET() {
  if (!cachedCharacters) {
    try {
      const filePath = join(process.cwd(), "data", "characters.json");
      const raw = readFileSync(filePath, "utf-8");
      cachedCharacters = JSON.parse(raw);
    } catch {
      cachedCharacters = [];
    }
  }

  return NextResponse.json({ characters: cachedCharacters });
}
