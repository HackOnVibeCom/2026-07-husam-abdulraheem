import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: {
    appIsrStatus: false,
  },
  // Turbopack is the default in Next.js 16 — no webpack config needed
  turbopack: {},
};

export default nextConfig;

