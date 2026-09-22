"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Navbar } from "@/components/tanihub/navbar";
import { Footer } from "@/components/tanihub/footer";
import { SellerGate, SellerNav, useSellerIdentity } from "@/components/tanihub/seller-nav";
import { SellerProductForm } from "@/components/tanihub/seller-product-form";
import type { SellerProductForm as FormValues } from "@/data/seller";
import { apiPost } from "@/lib/api";

function NewProductContent() {
  const router = useRouter();
  const identity = useSellerIdentity();

  if (!identity) return null;

  const handleSubmit = async (values: FormValues) => {
    try {
      await apiPost("/api/products", {
        name: values.name,
        category: values.category,
        description: values.description,
        imageUrl: values.imageUrl || undefined,
        grade: values.grade,
        price: values.price,
        unit: values.unit,
        minOrder: values.minOrder,
        stock: values.stock,
        location: values.location,
        status: values.status,
      });
      toast.success(`Produk "${values.name.trim()}" dibuat.`);
      router.push("/kelola-produk");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal membuat produk.");
      throw err;
    }
  };

  return (
    <div className="container-wide max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl lg:text-4xl font-bold text-foreground">Tambah Produk</h1>
        <p className="text-muted-foreground mt-1">
          Produk aktif dengan stok tersedia otomatis tampil di marketplace.
        </p>
      </div>
      <SellerNav farmerId={identity.farmerId} />
      <SellerProductForm
        title="Data Produk"
        submitLabel="Simpan Produk"
        onSubmit={(v) => void handleSubmit(v)}
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
