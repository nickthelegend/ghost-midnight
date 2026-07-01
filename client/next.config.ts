import type { NextConfig } from "next";
import path from "path";

// GHOST intent-matching server (ghost-server). Override with GHOST_API_ORIGIN.
const GHOST_API = process.env.GHOST_API_ORIGIN || "http://localhost:8080";

const nextConfig: NextConfig = {
  reactCompiler: true,
  turbopack: {
    root: path.join(__dirname),
  },
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: "inline",
  },
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${GHOST_API}/api/v1/:path*`,
      },
      {
        source: "/health",
        destination: `${GHOST_API}/health`,
      },
      {
        source: "/external/:path*",
        destination: "https://convergence2026-token-api.cldev.cloud/:path*",
      },
    ];
  },
};

export default nextConfig;
