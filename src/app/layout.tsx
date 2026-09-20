import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers/providers";
import { CartDrawer } from "@/components/tanihub/cart-drawer";

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
  // Required for resolving relative metadata URLs (OG, canonical).
  // Uses production URL; override with NEXT_PUBLIC_SITE_URL in non-production envs.
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://tanihub.id"
  ),
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
    // NOTE: OG/Twitter images intentionally omitted until a real
    // 1200x630 asset exists in public/.
  },
  twitter: {
    card: "summary",
    title: "TaniHub",
    description:
      "Platform pertanian modern menghubungkan petani dengan pembeli secara langsung.",
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
        <Providers>
          {children}
          <CartDrawer />
        </Providers>
      </body>
    </html>
  );
}