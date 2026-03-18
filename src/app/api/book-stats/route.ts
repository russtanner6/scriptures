import { NextResponse } from "next/server";
import { getBookStats } from "@/lib/queries";

export async function GET() {
  const stats = getBookStats();
  return NextResponse.json({ stats });
}
