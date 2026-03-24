"use client";

import { Suspense } from "react";
import Header from "@/components/Header";
import ChiasmusTool from "@/components/ChiasmusTool";

export default function ChiasmusPage() {
  return (
    <>
      <Header />
      <div className="page-container">
        <Suspense>
          <ChiasmusTool />
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
          40 documented chiastic structures across all scripture volumes &bull;
          Scholarly sources cited &bull; Scripture Explorer
        </div>
      </div>
    </>
  );
}
