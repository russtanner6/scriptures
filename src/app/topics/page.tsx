"use client";

import { Suspense } from "react";
import Header from "@/components/Header";
import TopicMapTool from "@/components/TopicMapTool";

export default function TopicsPage() {
  return (
    <div className="page-container">
      <Header />
      <Suspense>
        <TopicMapTool />
      </Suspense>
      <div
        style={{
          padding: "24px 0 48px",
          fontSize: "0.82rem",
          color: "var(--text-muted)",
          textAlign: "center",
          borderTop: "1px solid var(--border)",
        }}
      >
        Find thematically similar chapters across all scripture &bull; Cosine
        similarity analysis &bull; Scripture Explorer
      </div>
    </div>
  );
}
