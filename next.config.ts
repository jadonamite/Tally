import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Server-only SDKs; keep them out of the client bundle.
  serverExternalPackages: ["@mysten-incubation/memwal", "@mysten/sui", "@mysten/seal", "@mysten/walrus"],
  images: {
    remotePatterns: [{ protocol: "https", hostname: "polymarket-upload.s3.us-east-2.amazonaws.com" }],
  },
};

export default nextConfig;
