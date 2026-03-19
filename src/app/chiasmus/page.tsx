"use client";

import { Suspense } from "react";
import ChiasmusTool from "@/components/ChiasmusTool";

export default function ChiasmusPage() {
  return (
    <Suspense>
      <ChiasmusTool />
    </Suspense>
  );
}
