import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  turbopack: {
    // Prevent Next from inferring a workspace root from lockfiles outside this repo.
    root: __dirname,
  },
};

export default withNextIntl(nextConfig);
