import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* `next dev` writes AGENTS.md and CLAUDE.md into the repo root on every boot.
   * Gitignoring them stops them being committed but not being written, and this
   * repo's rule is that no agent artifact exists in it at all. This is the flag
   * that stops the writing. */
  agentRules: false,
};

export default nextConfig;
