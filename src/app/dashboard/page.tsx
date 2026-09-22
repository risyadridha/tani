"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/tanihub/navbar";
import { Footer } from "@/components/tanihub/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/tanihub/stat-card";
import { StatusBadge } from "@/components/tanihub/status-badge";
import { OrderStateBadge } from "@/components/tanihub/order-badges";
import { SellerGate, SellerNav } from "@/components/tanihub/seller-nav";
import { formatCurrency } from "@/lib/utils";
import { LOW_STOCK_THRESHOLD, getEffectiveStatus } from "@/data/seller";
import type { StoredProductStatus } from "@/data/seller";
import { useSellerIdentity } from "@/components/tanihub/seller-nav";
import { useAuthStore } from "@/store/auth";
import { apiFetch, type ApiMeta, type ApiOrderSummary, type ApiProduct } from "@/lib/api";
import type { OrderStatus } from "@/data/order";
import {
  computeSellerMetrics,
  getLowStockProducts,
} from "@/store/seller-catalog";
import { BarChart3, Boxes, PackagePlus, TriangleAlert, Wallet } from "lucide-react";

type ProductBadge = "active" | "low_stock" | "out_of_stock" | "inactive" | "draft";

function apiEffective(p: { status: string; stock: number }): ProductBadge {
  if (p.status !== "active") return p.status as ProductBadge;
  if (p.stock <= 0) return "out_of_stock";
  if (p.stock <= LOW_STOCK_THRESHOLD) return "low_stock";
  return "active";
}

function DashboardContent() {
  const router = useRouter();
  const identity = useSellerIdentity();
  const authUser = useAuthStore((s) => s.user);
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [recentOrders, setRecentOrders] = useState<ApiOrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const reqId = useRef(0);

  useEffect(() => {
    const id = ++reqId.current;
    Promise.all([
      apiFetch<{ data: ApiProduct[]; meta: ApiMeta }>("/api/products?mine=true&limit=50"),
      apiFetch<{ data: ApiOrderSummary[]; meta: ApiMeta }>("/api/farmer/orders?limit=5"),
    ])
      .then(([p, o]) => {
        if (reqId.current !== id) return;
        setProducts(p.data);
        setRecentOrders(o.data);
      })
      .catch(() => {
        if (reqId.current !== id) return;
        setProducts([]);
        setRecentOrders([]);
      })
      .finally(() => {
        if (reqId.current === id) setLoading(false);
      });
    return () => {
      reqId.current++;
    };
  }, []);

  // Metrik dihitung dari data server (bentuk minimal yang dibutuhkan).
  const metricInput = products.map((p) => ({
    status: p.status as StoredProductStatus,
    stock: p.stock,
    price: p.price,
    name: p.name,
    unit: p.unit,
    id: p.id,
  }));
  const metrics = computeSellerMetrics(metricInput);
  const lowStock = getLowStockProducts(metricInput);

  if (!identity) return null;

  return (
    <div className="container-wide max-w-5xl space-y-8">
      <div>
        <h1 className="text-3xl lg:text-4xl font-bold text-foreground">
          Selamat datang, {authUser?.name ?? "Seller"}
        </h1>
        <p className="text-muted-foreground mt-1">
          Berikut perkembangan usaha {identity.farmName}.
        </p>
      </div>

      <SellerNav farmerId={identity.farmerId} />

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4" aria-busy="true">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Nilai Persediaan"
              value={formatCurrency(metrics.inventoryValue)}
              icon={<Wallet className="h-5 w-5" />}
            />
            <StatCard
              title="Produk Aktif"
              value={metrics.activeProducts}
              icon={<Boxes className="h-5 w-5" />}
            />
            <StatCard
              title="Total Stok Aktif"
              value={`${metrics.totalStock}`}
              icon={<BarChart3 className="h-5 w-5" />}
            />
            <StatCard
              title="Stok Menipis"
              value={metrics.lowStockCount + metrics.outOfStockCount}
              icon={<TriangleAlert className="h-5 w-5" />}
            />
          </div>

          {loading ? null : products.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <h2 className="font-semibold text-foreground mb-2">
                  Belum ada produk
                </h2>
                <p className="text-sm text-muted-foreground mb-6">
                  Tambahkan produk pertama agar muncul di marketplace.
                </p>
                <Button onClick={() => router.push("/kelola-produk/baru")}>
                  <PackagePlus className="h-4 w-4 mr-2" />
                  Tambah Produk
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Stok Menipis</CardTitle>
                </CardHeader>
                <CardContent>
                  {lowStock.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Semua stok aman (batas menipis: ≤ {LOW_STOCK_THRESHOLD} per produk).
                    </p>
                  ) : (
                    <ul className="space-y-3">
                      {lowStock.slice(0, 5).map((p) => (
                        <li key={p.id} className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {p.stock} {p.unit} tersisa
                            </p>
                          </div>
                          <StatusBadge status={getEffectiveStatus(p)} type="product" />
                        </li>
                      ))}
                    </ul>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => router.push("/inventaris")}
                  >
                    Kelola Inventaris
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Produk Terbaru</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {products.slice(0, 5).map((p) => (
                      <li key={p.id} className="flex items-center justify-between gap-3">
                        <Link
                          href={`/kelola-produk/${p.id}/edit`}
                          className="text-sm font-medium text-foreground truncate hover:underline"
                        >
                          {p.name}
                        </Link>
                        <StatusBadge status={apiEffective(p)} type="product" />
                      </li>
                    ))}
                  </ul>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => router.push("/kelola-produk")}
                  >
                    Semua Produk
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Penjualan</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Belum ada data penjualan. Grafik 7/30 hari akan tampil setelah
                    sistem order seller tersedia.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Pesanan Terbaru</CardTitle>
                </CardHeader>
                <CardContent>
                  {recentOrders.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Belum ada pesanan masuk.
                    </p>
                  ) : (
                    <ul className="space-y-3">
                      {recentOrders.map((o) => (
                        <li key={o.id} className="flex items-center justify-between gap-3">
                          <Link
                            href={`/pesanan/${o.id}`}
                            className="text-sm font-medium text-foreground truncate hover:underline"
                          >
                            {o.id}
                          </Link>
                          <OrderStateBadge status={o.status as OrderStatus} />
                        </li>
                      ))}
                    </ul>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => router.push("/dashboard/pesanan")}
                  >
                    Semua Pesanan
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navbar />
      <main className="flex-1 pt-6 pb-12 lg:pt-8 lg:pb-16">
        <SellerGate>
          <DashboardContent />
        </SellerGate>
      </main>
      <Footer />
    </div>
  );
}
