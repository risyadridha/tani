"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Navbar } from "@/components/tanihub/navbar";
import { Footer } from "@/components/tanihub/footer";
import { SellerGate, SellerNav } from "@/components/tanihub/seller-nav";
import { SellerProductForm } from "@/components/tanihub/seller-product-form";
import type { SellerProductForm as FormValues } from "@/data/seller";
import { useSellerStore } from "@/store/seller";
import { useSellerCatalogStore } from "@/store/seller-catalog";

function NewProductContent() {
  const router = useRouter();
  const farmer = useSellerStore((s) => s.farmer);
  const addProduct = useSellerCatalogStore((s) => s.addProduct);
  const initialLocation = useSellerStore((s) => s.application?.farmLocation ?? "");

  if (!farmer) return null;

  const handleSubmit = (values: FormValues) => {
    const product = addProduct({
      ...values,
      farmerId: farmer.id,
      farmerName: farmer.name,
      farmerVerified: true,
      farmerRating: 0,
      farmerReviewCount: 0,
    });
    toast.success(`Produk "${product.name}" dibuat.`);
    router.push("/kelola-produk");
  };

  return (
    <div className="container-wide max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl lg:text-4xl font-bold text-foreground">Tambah Produk</h1>
        <p className="text-muted-foreground mt-1">
          Produk aktif dengan stok tersedia otomatis tampil di marketplace.
        </p>
      </div>
      <SellerNav farmerId={farmer.id} />
      <SellerProductForm
        title="Data Produk"
        initial={{ location: initialLocation }}
        submitLabel="Simpan Produk"
        onSubmit={handleSubmit}
      />
    </div>
  );
}

export default function NewProductPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navbar />
      <main className="flex-1 pt-6 pb-12 lg:pt-8 lg:pb-16">
        <SellerGate>
          <NewProductContent />
        </SellerGate>
      </main>
      <Footer />
    </div>
  );
}
