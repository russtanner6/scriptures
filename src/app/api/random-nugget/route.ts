import { NextResponse } from "next/server";
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

export async function GET() {
  const nuggets = await loadNuggets();
  if (nuggets.length === 0) {
    return NextResponse.json({ nugget: null });
  }
  const idx = Math.floor(Math.random() * nuggets.length);
  return NextResponse.json({ nugget: nuggets[idx] });
}
