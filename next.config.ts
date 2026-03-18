import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Include data files (SQLite DB + WASM) in serverless function output
  // so they're available at runtime on Vercel
  outputFileTracingIncludes: {
    "/api/*": ["./data/**/*"],
  },
};

export default nextConfig;
