const { siteUrl } = require("./src/lib/site-url");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Fold SITE_URL into the public value so server and browser metadata match.
  env: {
    NEXT_PUBLIC_SITE_URL: siteUrl(),
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "www.notion.so", pathname: "/**" },
      { protocol: "https", hostname: "lh5.googleusercontent.com", pathname: "/**" },
      { protocol: "https", hostname: "s3-us-west-2.amazonaws.com", pathname: "/**" },
    ],
  },
  experimental: {
    largePageDataBytes: 512 * 1000, // 512KB
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

module.exports = nextConfig;
