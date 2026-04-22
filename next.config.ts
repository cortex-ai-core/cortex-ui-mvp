import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Disable LightningCSS optimization to prevent `.node` module failures
    optimizeCss: false,
  },
};

export default nextConfig;
