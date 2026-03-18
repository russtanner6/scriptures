import type { Metadata } from "next";
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
      <WordCloudTool />
    </div>
  );
}
