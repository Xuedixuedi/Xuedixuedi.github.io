/** @type {import('next').NextConfig} */
const isGithubActions = process.env.GITHUB_ACTIONS || false

let nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['www.notion.so', 'lh5.googleusercontent.com', 's3-us-west-2.amazonaws.com'],
  },
}

if (isGithubActions) {
  nextConfig.output = 'export'
  nextConfig.images.unoptimized = true
}

module.exports = nextConfig
