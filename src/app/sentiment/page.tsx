"use client";

import Header from "@/components/Header";
import SentimentArcTool from "@/components/SentimentArcTool";

export default function SentimentPage() {
  return (
    <div className="page-container">
      <Header />
      <SentimentArcTool />
      <div
        style={{
          padding: "24px 0 48px",
          fontSize: "0.82rem",
          color: "var(--text-muted)",
          textAlign: "center",
          borderTop: "1px solid var(--border)",
        }}
      >
        Emotional tone analysis across scripture books &bull; 7 sentiment
        categories &bull; Scripture Explorer
      </div>
    </div>
  );
}
