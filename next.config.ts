import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: ".",
  },
  allowedDevOrigins: ["192.168.0.173"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "dgalywyr863hv.cloudfront.net", // Strava profile images
      },
    ],
  },
};

export default nextConfig;
