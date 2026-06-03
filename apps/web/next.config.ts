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
        source: '/dashboard',
        destination: '/home',
        permanent: false,
      },
      {
        source: '/ideas',
        destination: '/vault',
        permanent: false,
      },
      {
        source: '/warroom',
        destination: '/home',
        permanent: false,
      },
      {
        source: '/agents',
        destination: '/home',
        permanent: false,
      },
      {
        source: '/compass',
        destination: '/home',
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
