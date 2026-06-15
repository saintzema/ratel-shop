import type { NextConfig } from "next";

const nextConfig: NextConfig = {

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },

  async redirects() {
    return [
      // ── Canonical domain: non-www → www (301 permanent) ──────────────────
      // Ensures Google only indexes www.fairprice.ng, eliminating the
      // "Page with redirect" duplicates caused by both domains being crawled.
      {
        source: "/:path*",
        has: [{ type: "host", value: "fairprice.ng" }],
        destination: "https://www.fairprice.ng/:path*",
        permanent: true,
      },
      // http → https (belt-and-suspenders for any non-Vercel proxies)
      {
        source: "/:path*",
        has: [{ type: "header", key: "x-forwarded-proto", value: "http" }],
        destination: "https://www.fairprice.ng/:path*",
        permanent: true,
      },
      // ── Missing routes that Googlebot discovered ──────────────────────────
      { source: "/shop", destination: "/search", permanent: true },
      { source: "/shop/:path*", destination: "/search", permanent: true },
      { source: "/returns", destination: "/return-policy", permanent: true },
    ];
  },

  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, PUT, DELETE, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization" },
        ],
      },
    ];
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  serverExternalPackages: ["ws"],
};

export default nextConfig;

