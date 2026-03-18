import type { Metadata } from "next";
import { Suspense } from "react";
import Header from "@/components/Header";
import WordCloudTool from "@/components/WordCloudTool";

export const metadata: Metadata = {
  title: "Word Cloud — Scripture Explorer",
  description:
    "Visualize the most frequent words in any scripture book or chapter with an interactive word cloud.",
};

export default function WordCloudPage() {
  return (
    <div className="page-container">
      <Header />
      <Suspense fallback={<div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>Loading...</div>}>
        <WordCloudTool />
      </Suspense>
    </div>
  );
}
