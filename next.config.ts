import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prevent build failures from TS/ESLint errors during CI
  // Remove these once the project is stable
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },

  // Allow Telegram media domains for profile photos
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "t.me",
      },
      {
        protocol: "https",
        hostname: "*.telegram.org",
      },
    ],
  },

  // Security headers for Telegram embedding
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            // Allow embedding inside Telegram Web
            key: "Content-Security-Policy",
            value:
              "frame-ancestors 'self' https://web.telegram.org https://k.web.telegram.org https://z.web.telegram.org;",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
