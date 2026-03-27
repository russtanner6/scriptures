import type { Metadata } from "next";
import { Suspense } from "react";
import Header from "@/components/Header";
import WordCloudTool from "@/components/WordCloudTool";
import LoadingBar from "@/components/LoadingBar";

export const metadata: Metadata = {
  title: "Word Cloud — Scripture Explorer",
  description:
    "Visualize the most frequent words in any scripture book or chapter with an interactive word cloud.",
};

export default function WordCloudPage() {
  return (
    <>
      <Header />
      <div className="page-container page-darker">
        <Suspense fallback={<div style={{ padding: "80px 20px" }}><LoadingBar /></div>}>
          <WordCloudTool />
        </Suspense>
      </div>
    </>
  );
}
