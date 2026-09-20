"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Navbar } from "@/components/tanihub/navbar";
import { Footer } from "@/components/tanihub/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SellerGate, SellerNav } from "@/components/tanihub/seller-nav";
import { SellerProductForm } from "@/components/tanihub/seller-product-form";
import type { SellerProductForm as FormValues } from "@/data/seller";
import { useSellerStore } from "@/store/seller";
import { useSellerCatalogStore } from "@/store/seller-catalog";

function EditProductContent({ id }: { id: string }) {
  const router = useRouter();
  const farmer = useSellerStore((s) => s.farmer);
  const products = useSellerCatalogStore((s) => s.products);
  const isHydrated = useSellerCatalogStore((s) => s.isHydrated);
  const updateProduct = useSellerCatalogStore((s) => s.updateProduct);
  const adjustStock = useSellerCatalogStore((s) => s.adjustStock);

  if (!isHydrated) {
    return (
      <div className="container-wide max-w-3xl space-y-4" aria-busy="true">
        <div className="h-10 w-56 rounded-lg bg-muted animate-pulse" />
        <div className="h-96 rounded-2xl bg-muted animate-pulse" />
      </div>
    );
  }
  if (!farmer) return null;

  // Ownership: hanya produk milik farmer ini yang bisa dibuka.
  const product = products.find((p) => p.id === id && p.farmerId === farmer.id);
  if (!product) {
    return (
      <div className="container-wide max-w-3xl">
        <Card>
          <CardContent className="p-8 text-center">
            <h1 className="text-xl font-bold text-foreground mb-2">
              Produk tidak ditemukan.
            </h1>
            <p className="text-sm text-muted-foreground mb-6">
              Produk mungkin sudah dihapus atau bukan milik akun seller ini.
            </p>
            <Button onClick={() => router.push("/kelola-produk")}>
              Kembali ke Produk Saya
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleSubmit = (values: FormValues) => {
    // Stok tidak ditulis langsung agar selalu tercatat di riwayat: selisih
    // stok disimpan sebagai transaksi penyesuaian.
    const { stock, ...rest } = values;
    const ok = updateProduct(product.id, farmer.id, rest);
    if (!ok) {
      toast.error("Gagal menyimpan. Produk bukan milik akun ini.");
      return;
    }
    const delta = stock - product.stock;
    if (delta !== 0) {
      const res = adjustStock(product.id, farmer.id, delta, "Penyesuaian stok via edit produk");
      if (!res.ok) {
        toast.error(res.error ?? "Gagal menyesuaikan stok.");
        return;
      }
    }
    toast.success(`Produk "${values.name.trim()}" diperbarui.`);
    router.push("/kelola-produk");
  };

  return (
    <div className="container-wide max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl lg:text-4xl font-bold text-foreground">Edit Produk</h1>
        <p className="text-muted-foreground mt-1">{product.name}</p>
      </div>
      <SellerNav farmerId={farmer.id} />
      <SellerProductForm
        title="Data Produk"
        initial={{
          name: product.name,
          category: product.category,
          description: product.description,
          price: product.price,
          unit: product.unit,
          stock: product.stock,
          minOrder: product.minOrder,
          location: product.location,
          grade: product.grade,
          imageUrl: product.images[0] ?? "",
          status: product.status,
        }}
        showInactiveOption={product.status === "inactive"}
        submitLabel="Simpan Perubahan"
        onSubmit={handleSubmit}
      />
      <p className="text-xs text-muted-foreground">
        Perubahan stok di sini otomatis tercatat sebagai penyesuaian di riwayat inventaris.
      </p>
    </div>
  );
}

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navbar />
      <main className="flex-1 pt-6 pb-12 lg:pt-8 lg:pb-16">
        <SellerGate>
          <EditProductContent id={id} />
        </SellerGate>
      </main>
      <Footer />
    </div>
  );
}
