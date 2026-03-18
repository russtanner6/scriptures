import { NextRequest, NextResponse } from "next/server";
import { getWordCloudData, getVolumeWordCloudData } from "@/lib/queries";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const bookId = searchParams.get("bookId");
  const volumeId = searchParams.get("volumeId");
  const chapter = searchParams.get("chapter");
  const limit = Number(searchParams.get("limit") || "80");
  const clampedLimit = Math.min(limit, 200);

  // Volume-level word cloud
  if (volumeId) {
    const data = await getVolumeWordCloudData(Number(volumeId), clampedLimit);
    return NextResponse.json(data);
  }

  // Book-level word cloud
  if (bookId) {
    const data = await getWordCloudData(
      Number(bookId),
      chapter ? Number(chapter) : undefined,
      clampedLimit
    );
    return NextResponse.json(data);
  }

  return NextResponse.json({ error: "bookId or volumeId is required" }, { status: 400 });
}
