import type { NextConfig } from "next";
import path from "path";
import { loadEnvConfig } from "@next/env";

// Load monorepo root .env so `npm run dev` in apps/web sees the same vars as Python/Railway
const repoRoot = path.join(__dirname, "..", "..");
loadEnvConfig(repoRoot);

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
