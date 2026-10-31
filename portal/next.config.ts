import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output for the production Docker image (see Dockerfile).
  output: "standalone",
  experimental: {
    // Smooth transitions between pages (View Transitions API, styled in
    // src/app/globals.css; respects prefers-reduced-motion).
    viewTransition: true,
  },
};

export default nextConfig;
