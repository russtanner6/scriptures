import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

let cachedLocations: any[] | null = null;

export async function GET() {
  if (!cachedLocations) {
    try {
      const filePath = join(process.cwd(), "data", "locations.json");
      const raw = readFileSync(filePath, "utf-8");
      cachedLocations = JSON.parse(raw);
    } catch {
      cachedLocations = [];
    }
  }

  return NextResponse.json({ locations: cachedLocations });
}
