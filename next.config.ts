import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // The previous vinext/Vite build only transpiled (esbuild), it never ran
  // tsc as a build gate. Preserve that behavior here rather than surface a
  // backlog of pre-existing type issues as new build failures.
  // Run `npx tsc --noEmit` separately to see them. (Next 16 no longer runs
  // ESLint during `next build` at all, so there's no equivalent flag for it.)
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
