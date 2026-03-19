"use client";

import { Suspense } from "react";
import TopicMapTool from "@/components/TopicMapTool";

export default function TopicsPage() {
  return (
    <Suspense>
      <TopicMapTool />
    </Suspense>
  );
}
