import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Prevent Next from inferring a workspace root from lockfiles outside this repo.
    root: __dirname,
  },
};

export default nextConfig;
