import { NextResponse } from "next/server";
import { getCharacterVerses } from "@/lib/queries";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name");
  const aliasesRaw = searchParams.get("aliases");
  const booksRaw = searchParams.get("books");
  const limitParam = searchParams.get("limit");

  if (!name) {
    return NextResponse.json({ error: "name parameter required" }, { status: 400 });
  }

  const aliases = aliasesRaw ? aliasesRaw.split(",").map((a) => a.trim()).filter(Boolean) : [];
  const books = booksRaw ? booksRaw.split(",").map((b) => b.trim()).filter(Boolean) : undefined;
  const limit = limitParam ? Math.min(Number(limitParam), 500) : 200;

  try {
    const result = await getCharacterVerses(name, aliases, books, limit);
    return NextResponse.json(result, {
      headers: { "Cache-Control": "public, max-age=86400, s-maxage=86400" },
    });
  } catch (e) {
    console.error("character-verses error:", e);
    return NextResponse.json({ error: "Failed to get verses" }, { status: 500 });
  }
}
