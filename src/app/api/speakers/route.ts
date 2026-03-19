import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import type { SpeakerAttribution } from "@/lib/types";

let cachedSpeakers: SpeakerAttribution[] | null = null;

async function loadSpeakers(): Promise<SpeakerAttribution[]> {
  if (cachedSpeakers) return cachedSpeakers;
  const filePath = path.join(process.cwd(), "data", "speakers.json");
  const raw = await fs.readFile(filePath, "utf-8");
  cachedSpeakers = JSON.parse(raw) as SpeakerAttribution[];
  return cachedSpeakers;
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

  const speakers = await loadSpeakers();
  const filtered = speakers.filter(
    (s) => s.book === book && s.chapter === Number(chapter)
  );

  return NextResponse.json({ speakers: filtered });
}
