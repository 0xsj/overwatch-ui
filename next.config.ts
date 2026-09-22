import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* `next dev` writes AGENTS.md and CLAUDE.md into the repo root on every boot.
   * Gitignoring them stops them being committed but not being written, and this
   * repo's rule is that no agent artifact exists in it at all. This is the flag
   * that stops the writing. */
  agentRules: false,
  // Keep framework-only dev chrome out of screenshots and viewport reviews.
  // It is not part of the product surface and obscures the lower-left UI.
  devIndicators: false,
  // A 256 KiB text capture can exceed 1 MiB after JSON escaping.
  experimental: { serverActions: { bodySizeLimit: "2mb" } },
};

export default nextConfig;
