"use client";

import { Suspense } from "react";
import ParallelPassagesTool from "@/components/ParallelPassagesTool";

export default function ParallelPage() {
  return (
    <Suspense>
      <ParallelPassagesTool />
    </Suspense>
  );
}
