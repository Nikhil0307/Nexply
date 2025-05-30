import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true, // This will disable TypeScript errors during the build
  },
eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
