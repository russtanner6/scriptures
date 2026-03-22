import { NextResponse } from "next/server";
import { getCharacterMentions } from "@/lib/queries";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name");
  const aliasesRaw = searchParams.get("aliases");
  const booksRaw = searchParams.get("books");

  if (!name) {
    return NextResponse.json({ error: "name parameter required" }, { status: 400 });
  }

  const aliases = aliasesRaw ? aliasesRaw.split(",").map((a) => a.trim()).filter(Boolean) : [];
  const books = booksRaw ? booksRaw.split(",").map((b) => b.trim()).filter(Boolean) : undefined;

  try {
    const stats = await getCharacterMentions(name, aliases, books);
    return NextResponse.json(stats, {
      headers: { "Cache-Control": "public, max-age=86400, s-maxage=86400" },
    });
  } catch (e) {
    console.error("character-mentions error:", e);
    return NextResponse.json({ error: "Failed to get mentions" }, { status: 500 });
  }
}
