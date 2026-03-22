import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Include data files (SQLite DB + WASM) in serverless function output
  // so they're available at runtime on Vercel
  outputFileTracingIncludes: {
    "/api/*": ["./data/**/*"],
  },
  async redirects() {
    return [
      {
        source: "/read",
        destination: "/scriptures",
        permanent: true,
      },
      {
        source: "/read/:path*",
        destination: "/scriptures/:path*",
        permanent: true,
      },
      {
        source: "/characters",
        destination: "/people",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
