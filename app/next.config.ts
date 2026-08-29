import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const dir = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  reactStrictMode: true,
  distDir: ".next-desk",
  typedRoutes: false,
  typescript: { ignoreBuildErrors: true },
  turbopack: { root: dir },
};

export default nextConfig;
