import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Bloom AI - Secure Document Intelligence Platform",
  description:
    "Ring-fenced AI document system with RAG capabilities for secure, multi-tenant knowledge management and Q&A with citations.",
  keywords:
    "AI, document management, RAG, retrieval augmented generation, secure, multi-tenant, knowledge base",
  authors: [{ name: "Bloom" }],
  openGraph: {
    title: "Bloom AI - Secure Document Intelligence Platform",
    description:
      "Ring-fenced AI document system with RAG capabilities for secure, multi-tenant knowledge management and Q&A with citations.",
    type: "website",
    images: ["https://lovable.dev/opengraph-image-p98pqg.png"],
  },
  twitter: {
    card: "summary_large_image",
    site: "@lovable_dev",
    images: ["https://lovable.dev/opengraph-image-p98pqg.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
