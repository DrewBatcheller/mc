/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "i.imgur.com",
      },
    ],
  },
  async redirects() {
    return [
      { source: '/finances', destination: '/finances/overview', permanent: false },
      { source: '/sales', destination: '/sales/overview', permanent: false },
      { source: '/experiments', destination: '/experiments/dashboard', permanent: false },
      { source: '/clients', destination: '/clients/directory', permanent: false },
      { source: '/management', destination: '/management/team-directory', permanent: false },
    ]
  },
}

export default nextConfig
