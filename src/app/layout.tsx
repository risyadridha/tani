import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "TaniHub — Temukan Hasil Tani, Temukan Pembeli",
    template: "%s | TaniHub",
  },
  description:
    "Platform pertanian modern menghubungkan petani dengan pembeli secara langsung. Marketplace hasil tani, permintaan pasar, dan manajemen usaha tani.",
  keywords: [
    "pertanian",
    "marketplace",
    "petani",
    "hasil tani",
    "belanja sayur",
    "supply chain",
    "agrikultur",
  ],
  authors: [{ name: "TaniHub" }],
  creator: "TaniHub",
  publisher: "TaniHub",
  robots: "index, follow",
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: "https://tanihub.id",
    siteName: "TaniHub",
    title: "TaniHub — Temukan Hasil Tani, Temukan Pembeli",
    description:
      "Platform pertanian modern menghubungkan petani dengan pembeli secara langsung.",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "TaniHub - Marketplace Pertanian Indonesia",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "TaniHub",
    description:
      "Platform pertanian modern menghubungkan petani dengan pembeli secara langsung.",
    images: ["/og-image.jpg"],
  },
  verification: {
    google: "google-site-verification-code",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F7F7F3" },
    { media: "(prefers-color-scheme: dark)", color: "#171916" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}