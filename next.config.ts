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

/**
 * Miniflare/workerd starts SQLite-backed state; running on every `next dev` can hit
 * SQLITE_BUSY (dual Next config processes, stale workerd, or parallel dev servers).
 * This app does not call `getCloudflareContext` in src — plain Node dev is enough locally.
 * Set OPENNEXT_CLOUDFLARE_DEV=1 when you need Wrangler/Workers parity during dev.
 */
if (process.env.OPENNEXT_CLOUDFLARE_DEV === "1") {
  void initOpenNextCloudflareForDev();
}
