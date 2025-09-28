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
};

module.exports = nextConfig;
