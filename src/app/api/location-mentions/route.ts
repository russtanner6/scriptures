import { NextResponse } from "next/server";
import { getCharacterMentions } from "@/lib/queries";
import { promises as fs } from "fs";
import path from "path";

let precomputed: Record<string, unknown> | null = null;

async function loadPrecomputed() {
  if (precomputed) return precomputed;
  try {
    const filePath = path.join(process.cwd(), "data", "location-mentions.json");
    const raw = await fs.readFile(filePath, "utf8");
    precomputed = JSON.parse(raw);
    return precomputed;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const name = searchParams.get("name");
  const aliasesRaw = searchParams.get("aliases");

  // Fast path: look up by pre-computed id
  if (id) {
    const data = await loadPrecomputed();
    if (data && data[id]) {
      return NextResponse.json(data[id], {
        headers: { "Cache-Control": "public, max-age=86400, s-maxage=86400" },
      });
    }
    // id not found — fall through to computation if name is also provided
  }

  // Legacy / fallback path: compute on the fly
  if (!name) {
    return NextResponse.json({ error: "name or id parameter required" }, { status: 400 });
  }

  const aliases = aliasesRaw ? aliasesRaw.split(",").map((a) => a.trim()).filter(Boolean) : [];

  try {
    const stats = await getCharacterMentions(name, aliases);
    return NextResponse.json(stats, {
      headers: { "Cache-Control": "public, max-age=86400, s-maxage=86400" },
    });
  } catch (e) {
    console.error("location-mentions error:", e);
    return NextResponse.json({ error: "Failed to get mentions" }, { status: 500 });
  }
}
