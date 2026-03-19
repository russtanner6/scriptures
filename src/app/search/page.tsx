import type { Metadata } from "next";
import Header from "@/components/Header";
import WordFrequencyTool from "@/components/WordFrequencyTool";

export const metadata: Metadata = {
  title: "Word Search — Scripture Explorer",
  description:
    "Search and analyze word frequencies across the LDS Standard Works.",
};

export default function SearchPage() {
  return (
    <div className="page-container">
      <Header />
      <WordFrequencyTool />
      <div
        style={{
          padding: "24px 0 48px",
          fontSize: "0.82rem",
          color: "var(--text-muted)",
          textAlign: "center",
          borderTop: "1px solid var(--border)",
        }}
      >
        Exact word-boundary matches across 87 scriptural files &bull; Excludes
        chapter/section headings and Introduction &amp; Witnesses &bull;
        Scripture Explorer
      </div>
    </div>
  );
}
