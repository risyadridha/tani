import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Navbar } from "@/components/tanihub/navbar";
import { Footer } from "@/components/tanihub/footer";
import { Button } from "@/components/ui/button";
import { ProductDetailContent } from "./product-detail-content";
import { SellerProductResolver } from "./seller-resolver";
import type { ApiMeta, ApiProduct } from "@/lib/api";
import { toProduct } from "@/lib/api";

async function baseUrl(): Promise<string> {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

async function fetchProduct(id: string): Promise<ApiProduct | null> {
  try {
    const res = await fetch(`${await baseUrl()}/api/products/${encodeURIComponent(id)}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { data?: ApiProduct };
    return body.data ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const p = await fetchProduct(id);
  if (!p) return { title: "Produk tidak ditemukan" };
  return {
    title: p.name,
    description: p.description.slice(0, 160),
  };
}

// Server component: SEO/metadata + data awal dari server. Produk lokal lama
// (my-prod-*) tetap didukung via resolver klien sebagai fallback.
export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const apiProduct = await fetchProduct(id);

  if (!apiProduct) {
    if (id.startsWith("my-prod-")) {
      return (
        <div className="flex flex-col min-h-screen bg-background">
          <Navbar />
          <main className="flex-1 pt-6 pb-12 lg:pt-8 lg:pb-16">
            <SellerProductResolver id={id} />
          </main>
          <Footer />
        </div>
      );
    }
    notFound();
  }

  let related: ApiProduct[] = [];
  try {
    const res = await fetch(
      `${await baseUrl()}/api/products?category=${encodeURIComponent(apiProduct.category)}&limit=5`,
      { cache: "no-store" }
    );
    if (res.ok) {
      const body = (await res.json()) as { data?: ApiProduct[]; meta?: ApiMeta };
      related = (body.data ?? []).filter((r) => r.id !== apiProduct.id).slice(0, 4);
    }
  } catch {
    related = [];
  }

  const product = toProduct(apiProduct);
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navbar />
      <main className="flex-1 pt-6 pb-12 lg:pt-8 lg:pb-16">
        <ProductDetailContent product={product} relatedProducts={related.map(toProduct)} />
      </main>
      <Footer />
    </div>
  );
}

export function ProductDetailErrorFallback() {
  return (
    <div className="container-wide max-w-md text-center py-16">
      <h1 className="text-2xl font-bold text-foreground mb-2">Produk gagal dimuat.</h1>
      <p className="text-sm text-muted-foreground mb-6">Coba lagi nanti.</p>
      <a href="/marketplace">
        <Button>Ke Marketplace</Button>
      </a>
    </div>
  );
}
