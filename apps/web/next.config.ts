import type { NextConfig } from "next";

const config: NextConfig = {
  output: "standalone",
  // @monrepo/ui est publié en TypeScript source : Next le compile.
  transpilePackages: ["@monrepo/ui"],
};

export default config;
