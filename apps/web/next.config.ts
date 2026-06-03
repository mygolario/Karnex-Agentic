import type { NextConfig } from "next";
import path from "path";
import { loadEnvConfig } from "@next/env";

// Load monorepo root .env so `npm run dev` in apps/web sees the same vars as Python/Railway
const repoRoot = path.join(__dirname, "..", "..");
loadEnvConfig(repoRoot);

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/ideas',
        destination: '/dashboard',
        permanent: false,
      },
      {
        source: '/warroom',
        destination: '/dashboard',
        permanent: false,
      },
      {
        source: '/agents',
        destination: '/dashboard',
        permanent: false,
      },
      {
        source: '/compass',
        destination: '/dashboard',
        permanent: false,
      },
      {
        source: '/forge',
        destination: '/studio',
        permanent: false,
      },
      {
        source: '/billing',
        destination: '/settings?tab=billing',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
