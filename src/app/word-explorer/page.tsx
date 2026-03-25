import type { Metadata } from "next";
import { Suspense } from "react";
import Header from "@/components/Header";
import WordExplorerTool from "@/components/WordExplorerTool";

export const metadata: Metadata = {
  title: "Word Explorer — Scripture Explorer",
  description: "Search for words across all scripture volumes. Drill down from volumes to books to chapters. Compare multiple terms.",
};

export default function WordExplorerPage() {
  return (
    <>
      <Header />
      <div className="page-container">
        <Suspense fallback={<div style={{ textAlign: "center", padding: "60px", color: "var(--text-muted)" }}>Loading...</div>}>
          <WordExplorerTool />
        </Suspense>
      </div>
    </>
  );
}
