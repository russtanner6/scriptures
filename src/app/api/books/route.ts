import { NextResponse } from "next/server";
import { getVolumesWithBooks } from "@/lib/queries";

export async function GET() {
  const volumes = await getVolumesWithBooks();
  return NextResponse.json({ volumes });
}
