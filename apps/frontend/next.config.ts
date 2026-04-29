import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../../"),
  transpilePackages: ["ui", "platform-api", "plans"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "img.logo.dev",
      },
    ],
  },
};

export default nextConfig;
