import type { NextConfig } from "next";
import path from "path";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  /** Reduces dev-only UI; helps avoid flaky overlay + manifest issues in some setups. */
  devIndicators: false,
  experimental: {
    /**
     * Segment explorer pulls in next-devtools client chunks; disabling avoids
     * "SegmentViewNode ... not in React Client Manifest" class errors during HMR.
     */
    devtoolSegmentExplorer: false,
    optimizePackageImports: ["framer-motion"],
  },
};

export default nextConfig;

initOpenNextCloudflareForDev();
