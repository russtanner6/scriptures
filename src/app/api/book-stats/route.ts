import { NextResponse } from "next/server";
import { getBookStats } from "@/lib/queries";

export async function GET() {
  const stats = await getBookStats();
  return NextResponse.json({ stats });
}
