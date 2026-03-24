"use client";

import { Suspense } from "react";
import Header from "@/components/Header";
import ParallelPassagesTool from "@/components/ParallelPassagesTool";

export default function ParallelPage() {
  return (
    <div className="page-container">
      <Header />
      <Suspense>
        <ParallelPassagesTool />
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
        Side-by-side scripture passage comparison with word-level differences
        &bull; Scripture Explorer
      </div>
    </div>
  );
}
