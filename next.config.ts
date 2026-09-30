import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  // Native/CLI-only modules used by the worker must not be bundled into route handlers.
  serverExternalPackages: ["@napi-rs/canvas", "postgres"],
};
export default nextConfig;
