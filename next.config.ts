import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  basePath: process.env.GITHUB_ACTIONS ? "/HOMM3_clone" : "",
  assetPrefix: process.env.GITHUB_ACTIONS ? "/HOMM3_clone/" : "",
};

export default nextConfig;
