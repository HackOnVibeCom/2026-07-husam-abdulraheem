import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: {
    appIsrStatus: false,
  },
  // تقليل استهلاك الذاكرة أثناء التطوير
  productionBrowserSourceMaps: false,
  webpack: (config, { dev }) => {
    if (dev) {
      // تعطيل source maps في وضع التطوير لتوفير الذاكرة
      config.devtool = false;
      // تقليل عدد الـ workers
      config.parallelism = 1;
    }
    return config;
  },
};

export default nextConfig;
