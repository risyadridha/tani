"use client";

import { use } from "react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Navbar } from "@/components/tanihub/navbar";
import { Footer } from "@/components/tanihub/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SellerGate, SellerNav, useSellerIdentity } from "@/components/tanihub/seller-nav";
import { SellerProductForm } from "@/components/tanihub/seller-product-form";
import type { SellerProductForm as FormValues } from "@/data/seller";
import { apiFetch, apiPatch, type ApiProduct } from "@/lib/api";

function EditProductContent({ id }: { id: string }) {
  const router = useRouter();
  const identity = useSellerIdentity();
  const [product, setProduct] = useState<ApiProduct | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing" | "error">("loading");
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const reqId = useRef(0);

  useEffect(() => {
    const myId = ++reqId.current;
    apiFetch<{ data: ApiProduct }>(`/api/products/${encodeURIComponent(id)}`)
      .then((res) => {
        if (reqId.current !== myId) return;
        setProduct(res.data);
        setState("ready");
      })
      .catch((err: unknown) => {
        if (reqId.current !== myId) return;
        if (err instanceof Error && "status" in err && (err as { status: number }).status === 404) {
          setState("missing");
        } else {
          setState("error");
          setError(err instanceof Error ? err.message : "Gagal memuat produk.");
        }
      });
    return () => {
      reqId.current++;
    };
  }, [id, reloadKey]);

  if (state === "loading") {
    return (
      <div className="container-wide max-w-3xl space-y-4" aria-busy="true">
        <Skeleton className="h-10 w-56 rounded-lg" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }
  if (!identity) return null;
  // Ownership ditegakkan server (404 bila bukan milik); cek lokal untuk pesan tepat.
  if (state === "missing" || (product && product.farmerId !== identity.farmerId)) {
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
  if (state === "error" || !product) {
    return (
      <div className="container-wide max-w-3xl">
        <Card>
          <CardContent className="p-8 text-center">
            <h1 className="text-xl font-bold text-foreground mb-2">Produk gagal dimuat.</h1>
            <p className="text-sm text-muted-foreground mb-6">{error}</p>
            <Button
              onClick={() => {
                setState("loading");
                setError("");
                setReloadKey((k) => k + 1);
              }}
            >
              Coba Lagi
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleSubmit = async (values: FormValues) => {
    // Satu panggilan PATCH atomik (produk + stok tercatat di server).
    const { stock, ...rest } = values;
    try {
      await apiPatch(`/api/products/${encodeURIComponent(product.id)}`, {
        ...rest,
        ...(stock !== product.stock
          ? { stock, stockReason: "Penyesuaian stok via edit produk" }
          : {}),
      });
      toast.success(`Produk "${values.name.trim()}" diperbarui.`);
      router.push("/kelola-produk");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan.");
      throw err;
    }
  };

  return (
    <div className="container-wide max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl lg:text-4xl font-bold text-foreground">Edit Produk</h1>
        <p className="text-muted-foreground mt-1">{product.name}</p>
      </div>
      <SellerNav farmerId={identity.farmerId} />
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
          imageUrl: product.image ?? "",
          status: product.status as "draft" | "active" | "inactive",
        }}
        showInactiveOption={product.status === "inactive"}
        submitLabel="Simpan Perubahan"
        onSubmit={(v) => void handleSubmit(v)}
      />
      <p className="text-xs text-muted-foreground">
        Perubahan stok otomatis tercatat sebagai penyesuaian di riwayat inventaris.
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
