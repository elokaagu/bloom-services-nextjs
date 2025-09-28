/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ["lovable.dev"],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  serverExternalPackages: [
    "pdf-parse",
    "mammoth",
    "pdfjs-dist",
    "tesseract.js",
    "sharp",
  ],
  experimental: {
    serverComponentsExternalPackages: [
      "pdf-parse",
      "mammoth",
      "pdfjs-dist",
      "tesseract.js",
      "sharp",
    ],
  },
  // Increase body size limit for file uploads
  api: {
    bodyParser: {
      sizeLimit: "100mb",
    },
  },
};

module.exports = nextConfig;
