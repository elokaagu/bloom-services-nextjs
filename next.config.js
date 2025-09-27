/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ["lovable.dev"],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    serverComponentsExternalPackages: ["pdf-parse", "mammoth"],
  },
  // Increase body size limit for file uploads
  api: {
    bodyParser: {
      sizeLimit: "10mb",
    },
  },
};

module.exports = nextConfig;
