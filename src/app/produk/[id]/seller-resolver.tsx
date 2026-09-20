"use client";

import { notFound } from "next/navigation";
import { ProductDetailContent } from "./product-detail-content";
import { getRelatedProducts } from "@/data/products";
import { useSellerCatalogStore } from "@/store/seller-catalog";

// Produk seller tersimpan di localStorage (client-side) sehingga tidak bisa
// di-resolve di server component. Resolver ini menangani ID di luar katalog
// mock dengan loading state yang jujur, bukan 404 prematur.
export function SellerProductResolver({ id }: { id: string }) {
  const products = useSellerCatalogStore((s) => s.products);
  const isHydrated = useSellerCatalogStore((s) => s.isHydrated);

  if (!isHydrated) {
    return (
      <div className="container-wide" aria-busy="true">
        <div className="h-8 w-48 rounded-lg bg-muted animate-pulse mb-6" />
        <div className="grid lg:grid-cols-2 gap-8">
          <div className="aspect-[4/3] rounded-2xl bg-muted animate-pulse" />
          <div className="space-y-4">
            <div className="h-8 rounded-lg bg-muted animate-pulse" />
            <div className="h-24 rounded-xl bg-muted animate-pulse" />
            <div className="h-12 rounded-lg bg-muted animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  const product = products.find((p) => p.id === id);
  if (!product) {
    notFound();
  }

  const related = [
    ...getRelatedProducts(product.category, product.id, 4),
    ...products.filter((p) => p.id !== product.id && p.category === product.category).slice(0, 4),
  ].slice(0, 4);

  return <ProductDetailContent product={product} relatedProducts={related} />;
}
