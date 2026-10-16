import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  output: "export",
  distDir: process.env.CORTEX_NEXT_DIST_DIR || ".next",
  trailingSlash: true,
  images: { unoptimized: true },
};
export default nextConfig;
