import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizeCss: false,
  },

  // 🔥 FORCE server runtime (disables static export behavior)
  output: "standalone",
};

export default nextConfig;
