import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import type { SpeakerAttribution, ScriptureCharacter } from "@/lib/types";
import { getChapterVerses } from "@/lib/queries";

/* ── Caches ── */
let cachedSpeakers: SpeakerAttribution[] | null = null;
let cachedCharacters: ScriptureCharacter[] | null = null;

async function loadSpeakers(): Promise<SpeakerAttribution[]> {
  if (cachedSpeakers) return cachedSpeakers;
  const raw = await fs.readFile(path.join(process.cwd(), "data", "speakers.json"), "utf-8");
  cachedSpeakers = JSON.parse(raw);
  return cachedSpeakers!;
}

async function loadCharacters(): Promise<ScriptureCharacter[]> {
  if (cachedCharacters) return cachedCharacters;
  const raw = await fs.readFile(path.join(process.cwd(), "data", "characters.json"), "utf-8");
  cachedCharacters = JSON.parse(raw);
  return cachedCharacters!;
}

/* ── Name matching ── */
function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z]/g, "");
}

/**
 * Build a lookup from normalized name → character.
 * Includes the character's primary name and all aliases.
 */
function buildNameMap(characters: ScriptureCharacter[]): Map<string, ScriptureCharacter> {
  const map = new Map<string, ScriptureCharacter>();
  for (const c of characters) {
    map.set(normalize(c.name), c);
    for (const alias of c.aliases) {
      const key = normalize(alias);
      // Don't overwrite a higher-tier character with a lower-tier one
      if (!map.has(key) || (map.get(key)!.tier > c.tier)) {
        map.set(key, c);
      }
    }
  }
  return map;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const bookId = params.get("bookId");
  const chapter = params.get("chapter");

  if (!bookId || !chapter) {
    return NextResponse.json({ error: "Provide bookId and chapter" }, { status: 400 });
  }

  try {
    const [speakers, characters, chapterData] = await Promise.all([
      loadSpeakers(),
      loadCharacters(),
      getChapterVerses(Number(bookId), Number(chapter)),
    ]);

    const nameMap = buildNameMap(characters);
    const found = new Map<string, ScriptureCharacter>(); // id → character

    // 1. Match speakers in this chapter
    const bookName = chapterData.bookName;
    const chapterSpeakers = speakers.filter(
      (s) => s.book === bookName && s.chapter === Number(chapter)
    );

    for (const sp of chapterSpeakers) {
      const key = normalize(sp.speaker);
      const match = nameMap.get(key);
      if (match && !found.has(match.id)) {
        found.set(match.id, match);
      }
    }

    // 2. Scan verse text for character name mentions (top 2 tiers only, for performance)
    //    Use word-boundary regex to avoid false positives (e.g., "eve" in "evening")
    const importantChars = characters.filter((c) => c.tier <= 2);
    const chapterText = chapterData.verses.map((v: { text: string }) => v.text).join(" ");

    function matchesWholeWord(text: string, term: string): boolean {
      if (term.length < 3) return false;
      const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`\\b${escaped}\\b`, "i");
      return regex.test(text);
    }

    for (const c of importantChars) {
      if (found.has(c.id)) continue;
      // Check primary name
      if (matchesWholeWord(chapterText, c.name)) {
        found.set(c.id, c);
        continue;
      }
      // Check aliases
      for (const alias of c.aliases) {
        if (matchesWholeWord(chapterText, alias)) {
          found.set(c.id, c);
          break;
        }
      }
    }

    // Deduplicate by name — if multiple characters share a display name,
    // keep the one that appears in this book's volume (or highest tier)
    const volumeAbbrev = chapterData.volumeAbbrev;
    const byName = new Map<string, ScriptureCharacter>();
    for (const c of found.values()) {
      const existing = byName.get(c.name);
      if (!existing) {
        byName.set(c.name, c);
      } else {
        // Prefer the one in this volume
        const cInVol = c.volumes.includes(volumeAbbrev);
        const eInVol = existing.volumes.includes(volumeAbbrev);
        if (cInVol && !eInVol) byName.set(c.name, c);
        else if (!cInVol && eInVol) { /* keep existing */ }
        else if (c.tier < existing.tier) byName.set(c.name, c);
      }
    }

    // Sort: tier ascending, then portrait-having first, then alphabetical
    const result = Array.from(byName.values()).sort((a, b) => {
      if (a.tier !== b.tier) return a.tier - b.tier;
      if (!!a.portraitUrl !== !!b.portraitUrl) return a.portraitUrl ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    // Return a slim payload (only what the UI needs)
    const slim = result.map((c) => ({
      id: c.id,
      name: c.name,
      portraitUrl: c.portraitUrl || null,
      roles: c.roles.slice(0, 2),
      tier: c.tier,
      aliases: c.aliases,
    }));

    return NextResponse.json({ characters: slim }, {
      headers: { "Cache-Control": "public, max-age=86400, s-maxage=86400" },
    });
  } catch (e) {
    console.error("chapter-characters error:", e);
    return NextResponse.json({ error: "Failed to get chapter characters" }, { status: 500 });
  }
}
