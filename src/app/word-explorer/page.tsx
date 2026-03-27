import type { Metadata } from "next";
import { Suspense } from "react";
import Header from "@/components/Header";
import WordExplorerTool from "@/components/WordExplorerTool";
import LoadingBar from "@/components/LoadingBar";

export const metadata: Metadata = {
  title: "Word Explorer — Scripture Explorer",
  description: "Search for words across all scripture volumes. Drill down from volumes to books to chapters. Compare multiple terms.",
};

export default function WordExplorerPage() {
  return (
    <>
      <Header />
      <div className="page-container page-darker">
        <Suspense fallback={<div style={{ padding: "80px 20px" }}><LoadingBar /></div>}>
          <WordExplorerTool />
        </Suspense>
      </div>
    </>
  );
}
