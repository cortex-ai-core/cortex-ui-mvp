import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Disable LightningCSS optimization to prevent `.node` module failures
    optimizeCss: false,

    // Disable Turbopack (force Webpack for stable builds)
    turbo: {
      enabled: false,
    },
  },
};

export default nextConfig;
