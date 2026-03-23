import type { Metadata } from "next";
import { Suspense } from "react";
import ScriptureReader from "@/components/ScriptureReader";

export const metadata: Metadata = {
  title: "Read — Scripture Explorer",
  description:
    "Read the scriptures — Old Testament, New Testament, Book of Mormon, D&C, Pearl of Great Price.",
};

export default function ReadPage() {
  return (
    <Suspense fallback={<div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>Loading...</div>}>
      <ScriptureReader />
    </Suspense>
  );
}
