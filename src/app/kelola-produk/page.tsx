"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { Navbar } from "@/components/tanihub/navbar";
import { Footer } from "@/components/tanihub/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/tanihub/status-badge";
import { SellerGate, SellerNav, useSellerIdentity } from "@/components/tanihub/seller-nav";
import { formatCurrency } from "@/lib/utils";
import { LOW_STOCK_THRESHOLD } from "@/data/seller";
import { apiFetch, apiPatch, type ApiMeta, type ApiProduct } from "@/lib/api";
import { PackagePlus, Pencil, Search, Loader2 } from "lucide-react";
import type { EffectiveProductStatus } from "@/data/seller";

type Filter = "semua" | EffectiveProductStatus;

const FILTERS: { value: Filter; label: string }[] = [
  { value: "semua", label: "Semua" },
  { value: "active", label: "Aktif" },
  { value: "draft", label: "Draf" },
  { value: "low_stock", label: "Menipis" },
  { value: "out_of_stock", label: "Habis" },
  { value: "inactive", label: "Nonaktif" },
];

function effective(p: ApiProduct): EffectiveProductStatus {
  if (p.status !== "active") return p.status as EffectiveProductStatus;
  if (p.stock <= 0) return "out_of_stock";
  if (p.stock <= LOW_STOCK_THRESHOLD) return "low_stock";
  return "active";
}

function ManageContent() {
  const router = useRouter();
  const identity = useSellerIdentity();
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("semua");
  const reqId = useRef(0);

  const load = useCallback(async () => {
    const id = ++reqId.current;
    try {
      const res = await apiFetch<{ data: ApiProduct[]; meta: ApiMeta }>(
        "/api/products?mine=true&limit=50"
      );
      if (reqId.current !== id) return;
      setProducts(res.data);
    } catch (err) {
      if (reqId.current !== id) return;
      setLoadError(err instanceof Error ? err.message : "Gagal memuat produk.");
    } finally {
      if (reqId.current === id) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const id = ++reqId.current;
    apiFetch<{ data: ApiProduct[]; meta: ApiMeta }>("/api/products?mine=true&limit=50").then(
      (res) => {
        if (reqId.current !== id) return;
        setProducts(res.data);
        setLoadError(null);
        setLoading(false);
      },
      (err: unknown) => {
        if (reqId.current !== id) return;
        setLoadError(err instanceof Error ? err.message : "Gagal memuat produk.");
        setProducts([]);
        setLoading(false);
      }
    );
    return () => {
      reqId.current++;
    };
  }, []);

  // Dipanggil dari event handler (bukan effect): boleh set state sinkron.
  const retry = () => {
    setLoading(true);
    setLoadError(null);
    void load();
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      if (filter !== "semua" && effective(p) !== filter) return false;
      if (!q) return true;
      return p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
    });
  }, [products, query, filter]);

  if (!identity) return null;

  const toggleActive = async (id: string, status: string) => {
    const next = status === "active" ? "inactive" : "active";
    try {
      await apiPatch<{ data: ApiProduct }>(`/api/products/${encodeURIComponent(id)}`, { status: next });
      toast.success(next === "active" ? "Produk diaktifkan." : "Produk dinonaktifkan.");
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengubah status.");
    }
  };

  return (
    <div className="container-wide max-w-5xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl lg:text-4xl font-bold text-foreground">Produk Saya</h1>
          <p className="text-muted-foreground mt-1">
            {products.length} produk • kelola, ubah status, dan atur stok.
          </p>
        </div>
        <Button onClick={() => router.push("/kelola-produk/baru")}>
          <PackagePlus className="h-4 w-4 mr-2" />
          Tambah Produk
        </Button>
      </div>

      <SellerNav farmerId={identity.farmerId} />

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari produk..."
            className="h-11 pl-11"
            aria-label="Cari produk saya"
          />
        </div>
        <Select value={filter} onValueChange={(v) => setFilter((v as Filter) ?? "semua")}>
          <SelectTrigger className="h-11 sm:w-44">
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            {FILTERS.map((f) => (
              <SelectItem key={f.value} value={f.value}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-3" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-2xl" />
          ))}
        </div>
      ) : loadError ? (
        <Card>
          <CardContent className="p-8 text-center">
            <h2 className="font-semibold text-foreground mb-2">Produk gagal dimuat.</h2>
            <p className="text-sm text-muted-foreground mb-6">{loadError}</p>
            <Button variant="outline" onClick={retry}>
              <Loader2 className="h-4 w-4 mr-2" />
              Coba Lagi
            </Button>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <h2 className="font-semibold text-foreground mb-2">
              {products.length === 0 ? "Belum ada produk." : "Tidak ada produk yang cocok."}
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              {products.length === 0
                ? "Tambahkan produk pertama agar muncul di marketplace."
                : "Coba ubah kata kunci atau filter."}
            </p>
            {products.length === 0 && (
              <Button onClick={() => router.push("/kelola-produk/baru")}>
                <PackagePlus className="h-4 w-4 mr-2" />
                Tambah Produk
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Desktop: table */}
          <Card className="hidden md:block overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="p-4 font-medium">Produk</th>
                  <th className="p-4 font-medium">Harga</th>
                  <th className="p-4 font-medium">Stok</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="border-b border-border/50 last:border-0">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
                          <Image src={p.image} alt={p.name} fill className="object-cover" sizes="48px" />
                        </div>
                        <div className="min-w-0">
                          <Link
                            href={`/kelola-produk/${p.id}/edit`}
                            className="font-medium text-foreground hover:underline block truncate"
                          >
                            {p.name}
                          </Link>
                          <p className="text-xs text-muted-foreground">
                            {p.category} • Min. {p.minOrder} {p.unit}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 whitespace-nowrap">{formatCurrency(p.price)} / {p.unit}</td>
                    <td className="p-4 whitespace-nowrap">
                      {p.stock} {p.unit}
                    </td>
                    <td className="p-4">
                      <StatusBadge status={effective(p)} type="product" />
                    </td>
                    <td className="p-4">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/kelola-produk/${p.id}/edit`)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/inventaris?produk=${p.id}`)}
                        >
                          Stok
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => void toggleActive(p.id, p.status)}>
                          {p.status === "active" ? "Nonaktifkan" : "Aktifkan"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* Mobile: cards */}
          <div className="grid gap-4 md:hidden">
            {filtered.map((p) => (
              <Card key={p.id}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
                      <Image src={p.image} alt={p.name} fill className="object-cover" sizes="56px" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(p.price)} / {p.unit} • {p.stock} {p.unit}
                      </p>
                    </div>
                    <StatusBadge status={effective(p)} type="product" />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => router.push(`/kelola-produk/${p.id}/edit`)}
                    >
                      <Pencil className="h-3.5 w-3.5 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => router.push(`/inventaris?produk=${p.id}`)}
                    >
                      Stok
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function KelolaProdukPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navbar />
      <main className="flex-1 pt-6 pb-12 lg:pt-8 lg:pb-16">
        <SellerGate>
          <ManageContent />
        </SellerGate>
      </main>
      <Footer />
    </div>
  );
}
