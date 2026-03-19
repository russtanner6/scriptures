import { NextResponse } from "next/server";
import { getRandomVerse } from "@/lib/queries";

export async function GET() {
  const verse = await getRandomVerse();
  if (!verse) {
    return NextResponse.json({ error: "No verses found" }, { status: 500 });
  }
  return NextResponse.json(verse);
}
