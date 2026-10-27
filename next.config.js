/** @type {import('next').NextConfig} */
const isGithubActions = process.env.GITHUB_ACTIONS || false

let nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['www.notion.so', 'lh5.googleusercontent.com', 's3-us-west-2.amazonaws.com'],
  },
  experimental: {
    largePageDataBytes: 512 * 1000, // 512KB
  },
}

if (isGithubActions) {
  nextConfig.output = 'export'
  nextConfig.images.unoptimized = true
  // Pages are `.tsx`. `/api/revalidate` is `.ts` and cannot be exported:
  // `output: 'export'` has no server to run API routes. Dropping `ts` from
  // the page extensions leaves that file out of the static build.
  nextConfig.pageExtensions = ['tsx']
}

module.exports = nextConfig
